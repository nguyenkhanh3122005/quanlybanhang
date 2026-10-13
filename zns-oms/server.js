const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./db');
const znsService = require('./znsService');
const { OrderStateMachine, StateMachineError } = require('./stateMachine');
const { ROLES, USERS, PERMISSIONS, maskCustomerPII } = require('./rbac');
const auditService = require('./auditService');
const queueService = require('./queueService');
const logisticsService = require('./logisticsService');
const paymentService = require('./paymentService');
const backupService = require('./backupService');

const app = express();
const PORT = process.env.PORT || 3500;

// Security & Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Error tracking logs (Sentry-like in-memory monitor)
const systemErrorLogs = [];
function recordSystemError(error, context = '') {
  const errEntry = {
    id: 'err-' + Date.now(),
    timestamp: new Date().toISOString(),
    message: error.message || String(error),
    stack: error.stack,
    context
  };
  systemErrorLogs.unshift(errEntry);
  if (systemErrorLogs.length > 200) systemErrorLogs.pop();
  return errEntry;
}

// User context middleware (RBAC)
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'] || 'usr-admin-1';
  let currentUser = USERS.find(u => u.id === userId);
  if (!currentUser) {
    currentUser = USERS[0]; // Mặc định là Admin
  }
  req.currentUser = currentUser;
  req.userRole = currentUser.role;
  req.userPermissions = PERMISSIONS[currentUser.role] || PERMISSIONS[ROLES.ADMIN];
  next();
});

// Currency formatting helper
const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

// Register Background Queue Handlers
queueService.registerHandler('EXPORT_REPORT_EXCEL', async (payload, updateProgress) => {
  updateProgress(20);
  await new Promise(r => setTimeout(r, 600));
  updateProgress(60);
  const orders = db.getOrders();
  await new Promise(r => setTimeout(r, 400));
  updateProgress(100);
  return {
    downloadUrl: `/api/reports/download-csv?timestamp=${Date.now()}`,
    rowCount: orders.length,
    generatedAt: new Date().toISOString()
  };
});

queueService.registerHandler('BULK_ZNS_SEND', async (payload, updateProgress) => {
  const { orderIds, eventType } = payload;
  const results = [];
  const total = orderIds.length;
  for (let i = 0; i < total; i++) {
    const o = db.getOrderById(orderIds[i]);
    if (o) {
      const res = await znsService.sendZnsNotification(eventType || 'orderCreated', o);
      results.push({ orderId: o.id, success: res.success });
    }
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 150));
  }
  return { total, successCount: results.filter(r => r.success).length };
});

queueService.registerHandler('PUSH_SHIPPING_BATCH', async (payload, updateProgress) => {
  const { orderIds, carrierCode } = payload;
  const pushed = [];
  for (let i = 0; i < orderIds.length; i++) {
    const o = db.getOrderById(orderIds[i]);
    if (o) {
      const res = await logisticsService.pushOrderToCarrier(o, carrierCode);
      pushed.push({ orderCode: o.code, trackingCode: res.trackingCode });
    }
    updateProgress(Math.round(((i + 1) / orderIds.length) * 100));
    await new Promise(r => setTimeout(r, 200));
  }
  return { pushed };
});

// ==========================================
// 1. ORDERS API (ATOMIC TRANSACTIONS & STRICT STATE MACHINE)
// ==========================================

// Lấy danh sách đơn hàng (hỗ trợ PII Masking theo quyền hạn RBAC)
app.get('/api/orders', (req, res) => {
  try {
    const { status, search, paymentStatus } = req.query;
    let orders = db.getOrders();

    if (status && status !== 'all') {
      orders = orders.filter(o => o.orderStatus === status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      orders = orders.filter(o => o.paymentStatus === paymentStatus);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o =>
        (o.code && o.code.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.trackingCode && o.trackingCode.toLowerCase().includes(q))
      );
    }

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Áp dụng PII Masking nếu nhân viên kho đang xem
    const sanitizedOrders = orders.map(o => maskCustomerPII(o, req.userRole));

    res.json({
      success: true,
      total: orders.length,
      orders: sanitizedOrders,
      userRole: req.userRole
    });
  } catch (err) {
    recordSystemError(err, 'GET /api/orders');
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy chi tiết đơn hàng
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    const sanitized = maskCustomerPII(order, req.userRole);
    res.json({
      success: true,
      order: sanitized,
      availableNextStates: OrderStateMachine.getNextAvailableStates(order.orderStatus)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yêu cầu mở khóa xem thông tin đầy đủ PII (Unmask) - Có ghi Audit Log bắt buộc
app.post('/api/orders/:id/unmask', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    // Ghi nhật ký bảo mật
    auditService.log({
      user: req.currentUser,
      entityType: 'ORDER',
      entityId: order.code,
      action: 'PII_UNMASK',
      description: `Nhân viên [${req.currentUser.name}] đã mở khóa xem thông tin cá nhân khách hàng (SĐT, Địa chỉ)`,
      reason: req.body.reason || 'Liên hệ giao hàng / Xử lý khiếu nại',
      ip: req.ip
    });

    res.json({
      success: true,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tạo đơn hàng mới trong ATOMIC TRANSACTION & OPTIMISTIC LOCKING
app.post('/api/orders', async (req, res) => {
  try {
    // Kiểm tra quyền RBAC
    if (!req.userPermissions.createOrder) {
      return res.status(403).json({
        success: false,
        message: `Quyền hạn từ chối: Vai trò [${req.currentUser.name} - ${req.userRole}] không được phép tạo đơn hàng.`
      });
    }

    const {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      items,
      shippingFee = 0,
      discount = 0,
      paymentMethod = 'COD',
      paymentStatus = 'unpaid',
      carrier = 'Giao Hàng Nhanh',
      trackingCode = '',
      customerNote = '',
      staffNote = '',
      sendZns = true
    } = req.body;

    if (!customerName || !customerPhone || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin khách hàng và sản phẩm' });
    }

    let createdOrder = null;

    // THỰC THI TRONG DATABASE TRANSACTION NGUYÊN TỬ
    await db.runTransaction(async (trx) => {
      let subtotal = 0;
      const validatedItems = [];

      // 1. Kiểm tra tồn kho & Trừ kho với Khóa lạc quan (Optimistic Concurrency Control)
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        // Trừ kho nguyên tử - Nếu thiếu hàng hoặc xung đột phiên bản sẽ ném ngoại lệ và ROLLBACK ngay
        const prod = trx.deductStock(item.productId, qty, item.expectedVersion);

        const itemTotal = prod.salePrice * qty;
        subtotal += itemTotal;

        validatedItems.push({
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          price: prod.salePrice,
          quantity: qty,
          total: itemTotal,
          versionAtSale: prod.version
        });
      }

      // 2. Tính tổng tiền
      const totalAmount = Math.max(0, subtotal + Number(shippingFee) - Number(discount));

      // 3. Tạo mã đơn hàng duy nhất
      const existingOrders = trx.getOrders();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randNum = String(existingOrders.length + 1).padStart(4, '0');
      const orderCode = `DH-${dateStr}-${randNum}`;

      // 4. Tạo hoặc cập nhật khách hàng
      const customers = trx.getCustomers();
      let existingCust = customers.find(c => c.phone === customerPhone || c.id === customerId);
      let finalCustId = existingCust ? existingCust.id : 'cust-' + Date.now();

      if (existingCust) {
        existingCust.orderCount = (existingCust.orderCount || 0) + 1;
        existingCust.totalSpent = (existingCust.totalSpent || 0) + totalAmount;
        if (existingCust.totalSpent >= 10000000) existingCust.tier = 'Diamond';
        else if (existingCust.totalSpent >= 5000000) existingCust.tier = 'Platinum';
        else if (existingCust.totalSpent >= 2000000) existingCust.tier = 'Gold';
        else if (existingCust.totalSpent >= 1000000) existingCust.tier = 'Silver';
        trx.updateCustomer(existingCust);
      } else {
        const newCust = {
          id: finalCustId,
          name: customerName,
          phone: customerPhone,
          email: '',
          address: customerAddress,
          city: '',
          tier: 'Standard',
          totalSpent: totalAmount,
          orderCount: 1,
          notes: '',
          createdAt: new Date().toISOString()
        };
        trx.updateCustomer(newCust);
      }

      // 5. Khởi tạo đối tượng đơn hàng ở trạng thái PENDING
      const nowISO = new Date().toISOString();
      createdOrder = {
        id: 'ord-' + Date.now(),
        code: orderCode,
        customerId: finalCustId,
        customerName,
        customerPhone,
        customerAddress,
        carrier,
        trackingCode,
        paymentMethod,
        paymentStatus,
        orderStatus: 'pending', // Bắt đầu từ trạng thái PENDING theo quy tắc State Machine
        items: validatedItems,
        subtotal,
        shippingFee: Number(shippingFee),
        discount: Number(discount),
        totalAmount,
        customerNote,
        staffNote,
        timeline: [
          {
            status: 'pending',
            title: 'Tạo đơn hàng (Transaction Verified)',
            desc: `Đơn hàng được khởi tạo an toàn qua Transaction, đã khóa & trừ tồn kho thành công. Tổng tiền: ${formatVND(totalAmount)}`,
            time: nowISO,
            user: req.currentUser.name
          }
        ],
        znsSent: false,
        createdAt: nowISO,
        updatedAt: nowISO
      };

      trx.addOrder(createdOrder);
    });

    // 6. Ghi Audit Log nghiệp vụ
    auditService.log({
      user: req.currentUser,
      entityType: 'ORDER',
      entityId: createdOrder.code,
      action: 'CREATE_ORDER',
      description: `Tạo mới đơn hàng ${createdOrder.code} với ${createdOrder.items.length} sản phẩm, tổng thanh toán ${formatVND(createdOrder.totalAmount)}`,
      changes: [{ field: 'orderStatus', oldVal: null, newVal: 'pending' }],
      ip: req.ip
    });

    // 7. Gửi ZNS bất đồng bộ nếu được chọn
    let znsResult = null;
    if (sendZns) {
      znsResult = await znsService.sendZnsNotification('orderCreated', createdOrder);
      if (znsResult.success) {
        createdOrder.znsSent = true;
        createdOrder.timeline.push({
          status: 'pending',
          title: 'Đã gửi Zalo ZNS',
          desc: `Thông báo đặt hàng thành công đã gửi tới Zalo ${createdOrder.customerPhone}`,
          time: new Date().toISOString(),
          user: 'ZNS Service'
        });
        db.saveOrders(db.getOrders());
      }
    }

    res.json({
      success: true,
      message: 'Tạo đơn hàng thành công qua Database Transaction',
      order: createdOrder,
      zns: znsResult
    });
  } catch (err) {
    recordSystemError(err, 'POST /api/orders Transaction Failure');
    res.status(400).json({ success: false, message: err.message });
  }
});

// Cập nhật trạng thái đơn hàng có kiểm định nghiêm ngặt qua ORDER STATE MACHINE
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status: targetStatus, note = '', trackingCode, carrier, sendZns = true, paymentStatus } = req.body;
    const orders = db.getOrders();
    const orderIndex = orders.findIndex(o => o.id === req.params.id || o.code === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[orderIndex];
    const currentStatus = order.orderStatus;

    // 1. KIỂM TRA MÁY TRẠNG THÁI (STRICT STATE MACHINE VALIDATION)
    if (targetStatus && targetStatus !== currentStatus) {
      try {
        OrderStateMachine.validateTransition(currentStatus, targetStatus);
      } catch (smErr) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_STATE_TRANSITION',
          message: smErr.message,
          currentStatus,
          targetStatus
        });
      }
    }

    const oldSnapshot = { ...order };

    // 2. THỰC THI TRONG TRANSACTION NẾU LIÊN QUAN TỒN KHO (HỦY ĐƠN -> HOÀN KHO)
    await db.runTransaction(async (trx) => {
      if (targetStatus) {
        order.orderStatus = targetStatus;
      }

      if (trackingCode !== undefined) order.trackingCode = trackingCode;
      if (carrier !== undefined) order.carrier = carrier;
      if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;

      // NẾU HỦY ĐƠN TỪ TRẠNG THÁI TRƯỚC -> TỰ ĐỘNG BÙ HOÀN TỒN KHO NGUYÊN TỬ
      if (targetStatus === 'cancelled' && currentStatus !== 'cancelled') {
        order.items.forEach(item => {
          trx.restoreStock(item.productId, item.quantity);
        });
      }

      if (targetStatus === 'completed' && order.paymentStatus === 'unpaid') {
        order.paymentStatus = 'paid';
      }

      const nowISO = new Date().toISOString();
      order.updatedAt = nowISO;

      order.timeline.push({
        status: order.orderStatus,
        title: OrderStateMachine.STATE_LABELS[order.orderStatus] || order.orderStatus,
        desc: note || `Chuyển trạng thái từ [${OrderStateMachine.STATE_LABELS[currentStatus]}] sang [${OrderStateMachine.STATE_LABELS[order.orderStatus]}]`,
        time: nowISO,
        user: req.currentUser.name
      });

      trx.updateOrder(order.id, order);
    });

    // 3. Ghi Audit Log chi tiết
    auditService.log({
      user: req.currentUser,
      entityType: 'ORDER',
      entityId: order.code,
      action: 'STATUS_CHANGE',
      description: `Đổi trạng thái đơn [${order.code}] từ [${currentStatus}] sang [${targetStatus}]`,
      changes: [
        { field: 'orderStatus', oldVal: currentStatus, newVal: targetStatus },
        ...(trackingCode ? [{ field: 'trackingCode', oldVal: oldSnapshot.trackingCode, newVal: trackingCode }] : [])
      ],
      reason: note,
      ip: req.ip
    });

    // 4. Kích hoạt ZNS nếu có sự kiện tương ứng
    let znsResult = null;
    if (sendZns && targetStatus !== currentStatus) {
      let eventType = null;
      if (targetStatus === 'shipping') eventType = 'orderShipping';
      else if (targetStatus === 'completed') eventType = 'orderCompleted';
      else if (targetStatus === 'cancelled') eventType = 'orderCancelled';

      if (eventType) {
        znsResult = await znsService.sendZnsNotification(eventType, order, note);
        if (znsResult.success) {
          order.timeline.push({
            status: order.orderStatus,
            title: 'Đã gửi Zalo ZNS',
            desc: `Gửi thông báo [${OrderStateMachine.STATE_LABELS[targetStatus]}] tới SĐT ${order.customerPhone}`,
            time: new Date().toISOString(),
            user: 'ZNS Service'
          });
          db.saveOrders(db.getOrders());
        }
      }
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      order: maskCustomerPII(order, req.userRole),
      zns: znsResult
    });
  } catch (err) {
    recordSystemError(err, 'PATCH /api/orders/:id/status');
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa đơn hàng (Chỉ Admin mới có quyền)
app.delete('/api/orders/:id', (req, res) => {
  try {
    if (!req.userPermissions.deleteOrder) {
      return res.status(403).json({
        success: false,
        message: 'Từ chối quyền truy cập: Chỉ Quản trị viên (Admin) mới có quyền xóa đơn hàng.'
      });
    }

    let orders = db.getOrders();
    const order = orders.find(o => o.id === req.params.id || o.code === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    orders = orders.filter(o => o.id !== order.id);
    db.saveOrders(orders);

    auditService.log({
      user: req.currentUser,
      entityType: 'ORDER',
      entityId: order.code,
      action: 'DELETE_ORDER',
      description: `Quản trị viên đã xóa vĩnh viễn đơn hàng #${order.code}`,
      reason: req.body.reason || 'Dọn dẹp dữ liệu đơn test',
      ip: req.ip
    });

    res.json({ success: true, message: `Đã xóa đơn hàng ${order.code}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. THIRD-PARTY LOGISTICS & WEBHOOKS
// ==========================================

// Đẩy đơn hàng sang đơn vị vận chuyển (GHN/GHTK/ViettelPost)
app.post('/api/shipping/push-order', async (req, res) => {
  try {
    const { orderId, carrierCode = 'GHN' } = req.body;
    const order = db.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    // Gọi API đơn vị vận chuyển
    const pushResult = await logisticsService.pushOrderToCarrier(order, carrierCode);

    if (pushResult.success) {
      order.carrier = pushResult.carrierName;
      order.trackingCode = pushResult.trackingCode;
      order.timeline.push({
        status: order.orderStatus,
        title: 'Đẩy đơn sang đối tác vận chuyển',
        desc: `Đã kết nối API ${pushResult.carrierName}, sinh mã vận đơn: ${pushResult.trackingCode}. Phí dự kiến: ${formatVND(pushResult.shippingFee)}`,
        time: new Date().toISOString(),
        user: req.currentUser.name
      });

      db.saveOrders(db.getOrders());

      auditService.log({
        user: req.currentUser,
        entityType: 'ORDER',
        entityId: order.code,
        action: 'UPDATE_SHIPPING',
        description: `Đẩy đơn sang bưu cục ${pushResult.carrierName}, mã vận đơn: ${pushResult.trackingCode}`,
        ip: req.ip
      });
    }

    res.json({ success: true, pushResult, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook tiếp nhận cập nhật vận đơn từ ĐVVC
app.post('/api/webhooks/shipping', async (req, res) => {
  try {
    const webhookData = logisticsService.handleShippingWebhook(req.body);
    if (!webhookData.trackingCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã vận đơn tracking_code' });
    }

    const orders = db.getOrders();
    const order = orders.find(o => o.trackingCode === webhookData.trackingCode);

    if (!order) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng có mã vận đơn ${webhookData.trackingCode}` });
    }

    if (webhookData.targetOrderStatus && webhookData.targetOrderStatus !== order.orderStatus) {
      // Xác thực luồng trạng thái
      if (OrderStateMachine.canTransition(order.orderStatus, webhookData.targetOrderStatus)) {
        const oldStatus = order.orderStatus;
        order.orderStatus = webhookData.targetOrderStatus;
        order.timeline.push({
          status: order.orderStatus,
          title: 'Webhook Đối tác Vận chuyển',
          desc: webhookData.description,
          time: new Date().toISOString(),
          user: 'Shipping Webhook Service'
        });

        db.saveOrders(orders);

        // Kích hoạt ZNS
        let eventType = null;
        if (order.orderStatus === 'shipping') eventType = 'orderShipping';
        else if (order.orderStatus === 'completed') eventType = 'orderCompleted';
        else if (order.orderStatus === 'cancelled') eventType = 'orderCancelled';

        if (eventType) {
          await znsService.sendZnsNotification(eventType, order);
        }

        auditService.log({
          user: { name: 'Shipping Webhook', role: 'webhook' },
          entityType: 'ORDER',
          entityId: order.code,
          action: 'STATUS_CHANGE',
          description: `Đồng bộ trạng thái từ bưu tá: [${oldStatus}] -> [${order.orderStatus}]`,
          reason: webhookData.rawStatus,
          ip: req.ip
        });
      }
    }

    res.json({ success: true, message: 'Đã nhận webhook vận chuyển thành công' });
  } catch (err) {
    recordSystemError(err, 'POST /api/webhooks/shipping');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. PAYMENT GATEWAY & BANK RECONCILIATION
// ==========================================

// Webhook biến động số dư ngân hàng (VietQR / PayOS / Casso)
app.post('/api/webhooks/payment', async (req, res) => {
  try {
    const { logEntry, detectedCode, amount } = paymentService.processBankWebhook(req.body);

    if (!detectedCode) {
      return res.json({
        success: true,
        matched: false,
        message: 'Đã nhận webhook nhưng không tìm thấy mã đơn hàng DH-... trong nội dung'
      });
    }

    const orders = db.getOrders();
    const order = orders.find(o => o.code === detectedCode);

    if (!order) {
      return res.json({
        success: true,
        matched: false,
        message: `Tìm thấy mã ${detectedCode} nhưng không có đơn hàng này trong CSDL`
      });
    }

    logEntry.matched = true;
    logEntry.orderId = order.id;

    // Đánh dấu đơn đã thanh toán
    order.paymentStatus = 'paid';
    order.timeline.push({
      status: order.orderStatus,
      title: 'Tự động khớp tiền chuyển khoản (Bank Webhook)',
      desc: `Ngân hàng ghi nhận số tiền ${formatVND(amount)}. Mã giao dịch: ${logEntry.refId}. Trạng thái thanh toán đổi sang: ĐÃ THANH TOÁN.`,
      time: new Date().toISOString(),
      user: 'Payment Webhook Service'
    });

    db.saveOrders(orders);

    auditService.log({
      user: { name: 'Bank Webhook', role: 'webhook' },
      entityType: 'PAYMENT',
      entityId: order.code,
      action: 'PAYMENT_RECEIVED',
      description: `Tự động khớp lệnh thanh toán ${formatVND(amount)} từ tài khoản ${logEntry.bankAccount}`,
      ip: req.ip
    });

    res.json({
      success: true,
      matched: true,
      orderCode: order.code,
      amountMatched: amount
    });
  } catch (err) {
    recordSystemError(err, 'POST /api/webhooks/payment');
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đối soát công nợ COD và doanh thu chuyển khoản
app.get('/api/reconciliation', (req, res) => {
  try {
    const orders = db.getOrders();

    const codOrders = orders.filter(o => o.paymentMethod === 'COD');
    const codTotal = codOrders.reduce((s, o) => s + o.totalAmount, 0);
    const codDelivered = codOrders.filter(o => o.orderStatus === 'completed').reduce((s, o) => s + o.totalAmount, 0);
    const codInTransit = codOrders.filter(o => o.orderStatus === 'shipping').reduce((s, o) => s + o.totalAmount, 0);

    const bankOrders = orders.filter(o => o.paymentMethod === 'VietQR');
    const bankPaid = bankOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0);

    res.json({
      success: true,
      reconciliation: {
        codTotal,
        codDelivered, // Tiền bưu tá đã thu của khách đang giữ
        codInTransit,   // Tiền hàng đang lưu thông trên đường
        bankPaid,       // Tiền chuyển khoản đã vào tài khoản
        paymentLogs: paymentService.getPaymentLogs(20)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. AUDIT LOGS, USERS & RBAC API
// ==========================================

app.get('/api/audit-logs', (req, res) => {
  try {
    const { entityType, entityId, action, search, limit } = req.query;
    const logs = auditService.query({ entityType, entityId, action, search, limit: Number(limit) || 100 });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users/current', (req, res) => {
  res.json({
    success: true,
    currentUser: req.currentUser,
    permissions: req.userPermissions,
    allUsers: USERS
  });
});

// ==========================================
// 5. BACKUPS & DISASTER RECOVERY API
// ==========================================

app.get('/api/backups', (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backups', (req, res) => {
  try {
    if (!req.userPermissions.manageBackups) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới có quyền tạo bản sao lưu' });
    }
    const backup = backupService.createBackup(db, req.body.label || 'Bản sao lưu thủ công');
    auditService.log({
      user: req.currentUser,
      entityType: 'SYSTEM',
      entityId: backup.id,
      action: 'DATABASE_BACKUP',
      description: `Tạo bản snapshot sao lưu: ${backup.fileName} (${backup.sizeFormatted})`,
      ip: req.ip
    });
    res.json({ success: true, backup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backups/restore/:id', (req, res) => {
  try {
    if (!req.userPermissions.manageBackups) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới có quyền khôi phục CSDL' });
    }
    const result = backupService.restoreBackup(db, req.params.id);
    auditService.log({
      user: req.currentUser,
      entityType: 'SYSTEM',
      entityId: req.params.id,
      action: 'DATABASE_RESTORE',
      description: `Khôi phục toàn bộ CSDL về điểm khôi phục ${req.params.id}`,
      ip: req.ip
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. BACKGROUND QUEUE & SYSTEM MONITORING
// ==========================================

app.get('/api/jobs', (req, res) => {
  res.json({ success: true, jobs: queueService.getJobs(30) });
});

app.post('/api/jobs/export-excel', (req, res) => {
  const job = queueService.addJob('EXPORT_REPORT_EXCEL', { userId: req.currentUser.id });
  res.json({ success: true, job });
});

app.get('/api/monitoring', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    status: 'HEALTHY',
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
    },
    nodeVersion: process.version,
    recentErrors: systemErrorLogs.slice(0, 20)
  });
});

// ==========================================
// 7. CUSTOMERS, PRODUCTS & SETTINGS APIS
// ==========================================

app.get('/api/customers', (req, res) => {
  try {
    const { search } = req.query;
    let customers = db.getCustomers();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    const sanitized = customers.map(c => maskCustomerPII(c, req.userRole));
    res.json({ success: true, customers: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, email, address, city, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });

    const customers = db.getCustomers();
    if (customers.some(c => c.phone === phone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã tồn tại trong danh sách' });
    }

    const newCustomer = {
      id: 'cust-' + Date.now(),
      name,
      phone,
      email: email || '',
      address: address || '',
      city: city || '',
      tier: 'Standard',
      totalSpent: 0,
      orderCount: 0,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    db.saveCustomers(customers);

    auditService.log({
      user: req.currentUser,
      entityType: 'CUSTOMER',
      entityId: newCustomer.phone,
      action: 'CREATE_CUSTOMER',
      description: `Thêm mới khách hàng ${newCustomer.name} (${newCustomer.phone})`,
      ip: req.ip
    });

    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let products = db.getProducts();

    if (category && category !== 'all') products = products.filter(p => p.categoryId === category);
    if (lowStock === 'true') products = products.filter(p => p.stock <= p.minStock);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    // Nếu là nhân viên kho -> Ẩn giá vốn (costPrice)
    if (!req.userPermissions.viewCostPrice) {
      products = products.map(p => {
        const copy = { ...p };
        delete copy.costPrice;
        return copy;
      });
    }

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    if (!req.userPermissions.manageInventory) {
      return res.status(403).json({ success: false, message: 'Từ chối quyền: Bạn không có quyền quản lý kho' });
    }

    const { name, sku, categoryId, costPrice, salePrice, stock, minStock, unit, image } = req.body;
    if (!name || !salePrice) return res.status(400).json({ success: false, message: 'Tên và giá bán là bắt buộc' });

    const products = db.getProducts();
    const categories = db.getCategories();
    const cat = categories.find(c => c.id === categoryId) || { name: 'Chung' };

    const newProduct = {
      id: 'prod-' + Date.now(),
      sku: sku || 'SP-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      barcode: '8938' + Math.floor(10000000 + Math.random() * 90000000),
      name,
      categoryId: categoryId || 'cat-1',
      categoryName: cat.name,
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 5,
      unit: unit || 'Chiếc',
      image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
      status: 'active',
      version: 1,
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    db.saveProducts(products);

    auditService.log({
      user: req.currentUser,
      entityType: 'INVENTORY',
      entityId: newProduct.sku,
      action: 'STOCK_ADJUSTMENT',
      description: `Thêm sản phẩm mới vào kho: ${newProduct.name} (Tồn ban đầu: ${newProduct.stock})`,
      ip: req.ip
    });

    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import sản phẩm hàng loạt từ CSV
app.post('/api/products/import-csv', (req, res) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent) return res.status(400).json({ success: false, message: 'Dữ liệu CSV trống' });

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return res.status(400).json({ success: false, message: 'File CSV không đủ dữ liệu' });

    const products = db.getProducts();
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 3 && parts[0]) {
        const name = parts[0];
        const sku = parts[1] || 'SP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const salePrice = Number(parts[2]) || 100000;
        const stock = Number(parts[3]) || 10;

        const existing = products.find(p => p.sku === sku);
        if (existing) {
          existing.stock += stock;
          existing.salePrice = salePrice;
          existing.version = (existing.version || 1) + 1;
        } else {
          products.push({
            id: 'prod-' + Date.now() + '-' + i,
            sku,
            barcode: '8938' + Math.floor(10000000 + Math.random() * 90000000),
            name,
            categoryId: 'cat-1',
            categoryName: 'Chung',
            costPrice: Math.round(salePrice * 0.6),
            salePrice,
            stock,
            minStock: 5,
            unit: 'Chiếc',
            image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
            status: 'active',
            version: 1,
            createdAt: new Date().toISOString()
          });
        }
        importedCount++;
      }
    }

    db.saveProducts(products);

    auditService.log({
      user: req.currentUser,
      entityType: 'INVENTORY',
      entityId: 'CSV_IMPORT',
      action: 'STOCK_ADJUSTMENT',
      description: `Nhập khẩu ${importedCount} sản phẩm từ file CSV`,
      ip: req.ip
    });

    res.json({ success: true, importedCount, totalProducts: products.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: db.getCategories() });
});

// ZNS Logs
app.get('/api/zns/logs', (req, res) => {
  res.json({ success: true, logs: db.getZnsLogs() });
});

app.post('/api/zns/test', async (req, res) => {
  try {
    const { phone, customerName, eventType, totalAmount } = req.body;
    const mockOrder = {
      id: 'test-' + Date.now(),
      code: 'DH-TEST-' + Math.floor(1000 + Math.random() * 9000),
      customerName: customerName || 'Khách hàng Thử Nghiệm',
      customerPhone: phone || '0901234567',
      customerAddress: 'Toà nhà Zalo, Quận 7, TP.HCM',
      carrier: 'Giao Hàng Nhanh (GHN)',
      trackingCode: 'TEST-GHN-123456',
      paymentMethod: 'COD',
      paymentStatus: 'unpaid',
      totalAmount: Number(totalAmount) || 500000
    };
    const result = await znsService.sendZnsNotification(eventType || 'orderCreated', mockOrder);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/zns/preview', (req, res) => {
  try {
    const { eventType, orderId } = req.query;
    const settings = db.getSettings();
    let order = orderId ? db.getOrderById(orderId) : null;
    if (!order) {
      order = {
        code: 'DH-2026-PREVIEW',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0988888888',
        customerAddress: 'Số 123 Lê Lợi, Quận 1, TP.HCM',
        totalAmount: 950000,
        paymentMethod: 'COD',
        paymentStatus: 'unpaid',
        carrier: 'Giao Hàng Nhanh',
        trackingCode: 'GHN-998877'
      };
    }
    const preview = znsService.generateMessageContent(eventType || 'orderCreated', order, settings);
    res.json({ success: true, preview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dashboard Analytics (Ẩn doanh thu nếu là Nhân viên Kho)
app.get('/api/reports/dashboard', (req, res) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();
    const customers = db.getCustomers();
    const znsLogs = db.getZnsLogs();

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.orderStatus === 'completed');
    const pendingOrders = orders.filter(o => o.orderStatus === 'pending');
    const shippingOrders = orders.filter(o => o.orderStatus === 'shipping');
    const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled');

    const canViewRev = req.userPermissions.viewRevenue;

    const totalRevenue = canViewRev ? completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) : 0;
    const expectedRevenue = canViewRev ? orders.filter(o => o.orderStatus !== 'cancelled').reduce((sum, o) => sum + (o.totalAmount || 0), 0) : 0;

    const completionRate = totalOrders > 0 ? ((completedOrders.length / totalOrders) * 100).toFixed(1) : 0;
    const cancelRate = totalOrders > 0 ? ((cancelledOrders.length / totalOrders) * 100).toFixed(1) : 0;

    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      daysMap[key] = { date: key, revenue: 0, orderCount: 0 };
    }

    orders.forEach(o => {
      const dayKey = (o.createdAt || '').slice(5, 10);
      if (daysMap[dayKey]) {
        daysMap[dayKey].orderCount += 1;
        if (canViewRev && o.orderStatus !== 'cancelled') {
          daysMap[dayKey].revenue += (o.totalAmount || 0);
        }
      }
    });

    const statusCounts = {
      pending: pendingOrders.length,
      processing: orders.filter(o => o.orderStatus === 'processing').length,
      shipping: shippingOrders.length,
      completed: completedOrders.length,
      cancelled: cancelledOrders.length
    };

    const productSalesMap = {};
    orders.forEach(o => {
      if (o.orderStatus !== 'cancelled' && Array.isArray(o.items)) {
        o.items.forEach(it => {
          if (!productSalesMap[it.productId]) {
            productSalesMap[it.productId] = {
              productId: it.productId,
              name: it.name,
              sku: it.sku,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[it.productId].quantity += it.quantity;
          if (canViewRev) productSalesMap[it.productId].revenue += it.total;
        });
      }
    });

    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const lowStockAlerts = products.filter(p => p.stock <= p.minStock);

    res.json({
      success: true,
      canViewRevenue: canViewRev,
      kpis: {
        totalRevenue,
        expectedRevenue,
        totalOrders,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        shippingOrders: shippingOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        completionRate: Number(completionRate),
        cancelRate: Number(cancelRate),
        znsMessagesSent: znsLogs.filter(l => l.status === 'sent').length
      },
      revenueTimeline: Object.values(daysMap),
      statusCounts,
      topSellingProducts,
      lowStockAlerts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cài đặt
app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.put('/api/settings', (req, res) => {
  try {
    if (!req.userPermissions.accessSettings) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới có quyền thay đổi cài đặt' });
    }
    const current = db.getSettings();
    const updated = { ...current, ...req.body };
    db.saveSettings(updated);
    auditService.log({
      user: req.currentUser,
      entityType: 'SYSTEM',
      entityId: 'SETTINGS',
      action: 'UPDATE_SETTINGS',
      description: 'Cập nhật cấu hình cửa hàng & Zalo OA',
      ip: req.ip
    });
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/reset', (req, res) => {
  try {
    if (!req.userPermissions.accessSettings) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới được reset hệ thống' });
    }
    db.resetAll();
    res.json({ success: true, message: 'Đã khôi phục dữ liệu mẫu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy địa chỉ IP mạng nội bộ (LAN / Wi-Fi) để truy cập từ điện thoại
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidateIPs = [];
  for (const name of Object.keys(interfaces)) {
    const isVirtual = name.toLowerCase().includes('virtual') || name.toLowerCase().includes('vmware') || name.toLowerCase().includes('vbox') || name.toLowerCase().includes('host-only');
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!isVirtual && (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan') || iface.address.startsWith('192.168.1.') || iface.address.startsWith('192.168.0.'))) {
          return iface.address; // Ưu tiên tuyệt đối Wi-Fi
        }
        candidateIPs.push(iface.address);
      }
    }
  }
  return candidateIPs.find(ip => !ip.startsWith('192.168.56.')) || candidateIPs[0] || '127.0.0.1';
}

// API lấy thông tin kết nối từ điện thoại
app.get('/api/system/network-info', (req, res) => {
  const ip = getLocalIP();
  res.json({
    success: true,
    localIP: ip,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${ip}:${PORT}`,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`http://${ip}:${PORT}`)}`
  });
});

// Khởi chạy server lắng nghe trên tất cả các interface mạng (0.0.0.0) để điện thoại cùng Wi-Fi vào được
const LOCAL_IP = getLocalIP();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`🚀 ZNS ORDER MASTER PRO - ENTERPRISE ORDER MANAGEMENT SYSTEM`);
  console.log(`💻 Truy cập trên Máy tính / Laptop:   http://localhost:${PORT}`);
  console.log(`📱 Truy cập trên Điện thoại / Tablet:  http://${LOCAL_IP}:${PORT}`);
  console.log(`================================================================`);
});
