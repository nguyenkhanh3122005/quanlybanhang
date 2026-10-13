const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const FILES = {
  orders: path.join(DATA_DIR, 'orders.json'),
  customers: path.join(DATA_DIR, 'customers.json'),
  products: path.join(DATA_DIR, 'products.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  zns_logs: path.join(DATA_DIR, 'zns_logs.json'),
  settings: path.join(DATA_DIR, 'settings.json')
};

// Initial default data with version tags for Optimistic Concurrency Control
const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Đồ Điện Tử & Công Nghệ', code: 'TECH', description: 'Phụ kiện, thiết bị điện tử, đồ thông minh' },
  { id: 'cat-2', name: 'Thời Trang & Phụ Kiện', code: 'FASHION', description: 'Quần áo, giày dép, phụ kiện nam nữ' },
  { id: 'cat-3', name: 'Mỹ Phẩm & Chăm Sóc', code: 'BEAUTY', description: 'Chăm sóc da, mỹ phẩm, nước hoa chính hãng' },
  { id: 'cat-4', name: 'Gia Dụng & Đời Sống', code: 'HOME', description: 'Đồ gia dụng, tiện ích gia đình' }
];

const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'SP-TAI-NGHE-01',
    barcode: '893850123001',
    name: 'Tai nghe Bluetooth Không dây TrueWireless Pro Gen 3',
    categoryId: 'cat-1',
    categoryName: 'Đồ Điện Tử & Công Nghệ',
    costPrice: 280000,
    salePrice: 490000,
    stock: 45,
    minStock: 10,
    unit: 'Chiếc',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1, // Optimistic Concurrency Control
    createdAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'prod-2',
    sku: 'SP-SAC-NHANH-65W',
    barcode: '893850123002',
    name: 'Củ sạc nhanh GaN 65W 3 cổng Type-C & USB-A',
    categoryId: 'cat-1',
    categoryName: 'Đồ Điện Tử & Công Nghệ',
    costPrice: 160000,
    salePrice: 299000,
    stock: 78,
    minStock: 15,
    unit: 'Chiếc',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1,
    createdAt: '2026-10-02T09:30:00.000Z'
  },
  {
    id: 'prod-3',
    sku: 'SP-AO-POLO-NAM',
    barcode: '893850123003',
    name: 'Áo Polo Nam Vải Cotton Thoáng Khí Cao Cấp',
    categoryId: 'cat-2',
    categoryName: 'Thời Trang & Phụ Kiện',
    costPrice: 110000,
    salePrice: 229000,
    stock: 120,
    minStock: 20,
    unit: 'Cái',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1,
    createdAt: '2026-10-03T10:15:00.000Z'
  },
  {
    id: 'prod-4',
    sku: 'SP-BALO-CHONG-NUOC',
    barcode: '893850123004',
    name: 'Balo Laptop 15.6 inch Chống Thấm Nước Có Cổng Sạc',
    categoryId: 'cat-2',
    categoryName: 'Thời Trang & Phụ Kiện',
    costPrice: 210000,
    salePrice: 385000,
    stock: 8,
    minStock: 10,
    unit: 'Cái',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1,
    createdAt: '2026-10-04T11:00:00.000Z'
  },
  {
    id: 'prod-5',
    sku: 'SP-SERUM-B5',
    barcode: '893850123005',
    name: 'Serum Phục Hồi Da Hyaluronic B5 Cấp Ẩm 30ml',
    categoryId: 'cat-3',
    categoryName: 'Mỹ Phẩm & Chăm Sóc',
    costPrice: 145000,
    salePrice: 260000,
    stock: 64,
    minStock: 12,
    unit: 'Lọ',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1,
    createdAt: '2026-10-05T14:20:00.000Z'
  },
  {
    id: 'prod-6',
    sku: 'SP-NOI-CHIEN-KD',
    barcode: '893850123006',
    name: 'Nồi chiên không dầu điện tử 6.5L Cảm Ứng Thông Minh',
    categoryId: 'cat-4',
    categoryName: 'Gia Dụng & Đời Sống',
    costPrice: 750000,
    salePrice: 1290000,
    stock: 5,
    minStock: 8,
    unit: 'Chiếc',
    image: 'https://images.unsplash.com/photo-1584269600519-112d071b35e6?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    version: 1,
    createdAt: '2026-10-06T15:45:00.000Z'
  }
];

const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Nguyễn Văn Tuấn',
    phone: '0912345678',
    email: 'tuan.nguyen@gmail.com',
    address: 'Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1',
    city: 'TP. Hồ Chí Minh',
    tier: 'Gold',
    totalSpent: 4250000,
    orderCount: 5,
    notes: 'Khách VIP, thường nhận hàng giờ hành chính',
    createdAt: '2026-09-15T09:00:00.000Z'
  },
  {
    id: 'cust-2',
    name: 'Trần Thị Mai Phương',
    phone: '0988776655',
    email: 'phuong.tran88@gmail.com',
    address: 'Tầng 8, Tòa nhà Vincom Center, 191 Bà Triệu, Hai Bà Trưng',
    city: 'Hà Nội',
    tier: 'Silver',
    totalSpent: 1950000,
    orderCount: 3,
    notes: 'Ưu tiên gọi điện trước khi giao hàng',
    createdAt: '2026-09-20T10:30:00.000Z'
  },
  {
    id: 'cust-3',
    name: 'Lê Hoàng Nam',
    phone: '0903112233',
    email: 'nam.lehoang@gmail.com',
    address: '128 Nguyễn Thị Minh Khai, Phường 6, Quận 3',
    city: 'TP. Hồ Chí Minh',
    tier: 'Platinum',
    totalSpent: 8750000,
    orderCount: 8,
    notes: 'Khách hay thanh toán chuyển khoản trước',
    createdAt: '2026-09-01T08:15:00.000Z'
  },
  {
    id: 'cust-4',
    name: 'Phạm Thu Trang',
    phone: '0977224466',
    email: 'trang.pham22@outlook.com',
    address: 'Số 15 ngõ 98 Xuân Thủy, Cầu Giấy',
    city: 'Hà Nội',
    tier: 'Standard',
    totalSpent: 490000,
    orderCount: 1,
    notes: 'Khách mới từ kênh TikTok Shop',
    createdAt: '2026-10-10T11:20:00.000Z'
  },
  {
    id: 'cust-5',
    name: 'Đặng Quốc Bảo',
    phone: '0934556677',
    email: 'bao.dang@yahoo.com',
    address: '254 Hùng Vương, Phường Vĩnh Trung, Quận Thanh Khê',
    city: 'Đà Nẵng',
    tier: 'Silver',
    totalSpent: 2150000,
    orderCount: 2,
    notes: '',
    createdAt: '2026-10-05T14:00:00.000Z'
  }
];

const INITIAL_ORDERS = [
  {
    id: 'ord-101',
    code: 'DH-20261013-0001',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Tuấn',
    customerPhone: '0912345678',
    customerAddress: 'Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    carrier: 'Giao Hàng Nhanh (GHN)',
    trackingCode: 'GHN-882910471',
    paymentMethod: 'COD',
    paymentStatus: 'unpaid',
    orderStatus: 'shipping',
    items: [
      { productId: 'prod-1', name: 'Tai nghe Bluetooth Không dây TrueWireless Pro Gen 3', sku: 'SP-TAI-NGHE-01', price: 490000, quantity: 1, total: 490000 },
      { productId: 'prod-2', name: 'Củ sạc nhanh GaN 65W 3 cổng Type-C & USB-A', sku: 'SP-SAC-NHANH-65W', price: 299000, quantity: 1, total: 299000 }
    ],
    subtotal: 789000,
    shippingFee: 30000,
    discount: 20000,
    totalAmount: 799000,
    customerNote: 'Giao giờ hành chính giúp em',
    staffNote: 'Đã bọc chống sốc 2 lớp cẩn thận',
    timeline: [
      { status: 'pending', title: 'Tạo đơn hàng', desc: 'Đơn hàng được tiếp nhận vào hệ thống', time: '2026-10-12T08:30:00.000Z', user: 'Admin' },
      { status: 'processing', title: 'Đang đóng gói', desc: 'Kho đã xuất hàng & in phiếu đóng gói', time: '2026-10-12T09:15:00.000Z', user: 'Kho' },
      { status: 'shipping', title: 'Bàn giao vận chuyển', desc: 'Đã giao bưu tá GHN lấy hàng (Mã vận đơn: GHN-882910471)', time: '2026-10-12T14:00:00.000Z', user: 'Admin' }
    ],
    znsSent: true,
    createdAt: '2026-10-12T08:30:00.000Z',
    updatedAt: '2026-10-12T14:00:00.000Z'
  },
  {
    id: 'ord-102',
    code: 'DH-20261013-0002',
    customerId: 'cust-3',
    customerName: 'Lê Hoàng Nam',
    customerPhone: '0903112233',
    customerAddress: '128 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
    carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
    trackingCode: 'GHTK-990214881',
    paymentMethod: 'VietQR',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    items: [
      { productId: 'prod-6', name: 'Nồi chiên không dầu điện tử 6.5L Cảm Ứng Thông Minh', sku: 'SP-NOI-CHIEN-KD', price: 1290000, quantity: 1, total: 1290000 }
    ],
    subtotal: 1290000,
    shippingFee: 0,
    discount: 50000,
    totalAmount: 1240000,
    customerNote: 'Gọi trước khi đến 15 phút',
    staffNote: 'Đã check thanh toán VietQR thành công',
    timeline: [
      { status: 'pending', title: 'Tạo đơn hàng', desc: 'Khách tạo đơn và chuyển khoản VietQR', time: '2026-10-11T10:00:00.000Z', user: 'System' },
      { status: 'processing', title: 'Đóng gói hàng', desc: 'Hàng đã kiểm tra dán tem bảo hành', time: '2026-10-11T11:20:00.000Z', user: 'Kho' },
      { status: 'shipping', title: 'Đang giao hàng', desc: 'Bưu tá GHTK đang đi phát', time: '2026-10-11T14:30:00.000Z', user: 'Admin' },
      { status: 'completed', title: 'Giao thành công', desc: 'Khách đã nhận hàng và ký nhận', time: '2026-10-12T10:15:00.000Z', user: 'Shipper' }
    ],
    znsSent: true,
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-12T10:15:00.000Z'
  },
  {
    id: 'ord-103',
    code: 'DH-20261013-0003',
    customerId: 'cust-2',
    customerName: 'Trần Thị Mai Phương',
    customerPhone: '0988776655',
    customerAddress: 'Tầng 8, Tòa nhà Vincom Center, 191 Bà Triệu, Hai Bà Trưng, Hà Nội',
    carrier: 'Viettel Post',
    trackingCode: 'VTP-77192804',
    paymentMethod: 'COD',
    paymentStatus: 'unpaid',
    orderStatus: 'processing',
    items: [
      { productId: 'prod-3', name: 'Áo Polo Nam Vải Cotton Thoáng Khí Cao Cấp', sku: 'SP-AO-POLO-NAM', price: 229000, quantity: 2, total: 458000 },
      { productId: 'prod-5', name: 'Serum Phục Hồi Da Hyaluronic B5 Cấp Ẩm 30ml', sku: 'SP-SERUM-B5', price: 260000, quantity: 1, total: 260000 }
    ],
    subtotal: 718000,
    shippingFee: 25000,
    discount: 0,
    totalAmount: 743000,
    customerNote: 'Lấy 2 áo màu Xanh Navy size L',
    staffNote: 'Đang xếp hàng chờ Viettel Post lấy hàng lúc 16h',
    timeline: [
      { status: 'pending', title: 'Tạo đơn hàng', desc: 'Tiếp nhận đơn từ website', time: '2026-10-13T07:45:00.000Z', user: 'Admin' },
      { status: 'processing', title: 'Đang xử lý & đóng gói', desc: 'Kho đã in phiếu đóng hàng', time: '2026-10-13T09:00:00.000Z', user: 'Kho' }
    ],
    znsSent: true,
    createdAt: '2026-10-13T07:45:00.000Z',
    updatedAt: '2026-10-13T09:00:00.000Z'
  },
  {
    id: 'ord-104',
    code: 'DH-20261013-0004',
    customerId: 'cust-4',
    customerName: 'Phạm Thu Trang',
    customerPhone: '0977224466',
    customerAddress: 'Số 15 ngõ 98 Xuân Thủy, Cầu Giấy, Hà Nội',
    carrier: 'Shopee Xpress',
    trackingCode: '',
    paymentMethod: 'COD',
    paymentStatus: 'unpaid',
    orderStatus: 'pending',
    items: [
      { productId: 'prod-4', name: 'Balo Laptop 15.6 inch Chống Thấm Nước Có Cổng Sạc', sku: 'SP-BALO-CHONG-NUOC', price: 385000, quantity: 1, total: 385000 }
    ],
    subtotal: 385000,
    shippingFee: 30000,
    discount: 0,
    totalAmount: 415000,
    customerNote: '',
    staffNote: 'Chờ gọi xác nhận địa chỉ cụ thể',
    timeline: [
      { status: 'pending', title: 'Đơn mới tạo', desc: 'Chờ nhân viên duyệt đơn', time: '2026-10-13T11:15:00.000Z', user: 'System' }
    ],
    znsSent: false,
    createdAt: '2026-10-13T11:15:00.000Z',
    updatedAt: '2026-10-13T11:15:00.000Z'
  }
];

const INITIAL_ZNS_LOGS = [
  {
    id: 'log-zns-1',
    orderId: 'ord-101',
    orderCode: 'DH-20261013-0001',
    phone: '0912345678',
    customerName: 'Nguyễn Văn Tuấn',
    templateId: '298371',
    templateTitle: 'Thông báo xuất kho & Đang giao hàng',
    status: 'sent',
    mode: 'simulation',
    cost: 180,
    sentAt: '2026-10-12T14:02:15.000Z',
    messagePreview: 'Xin chào Nguyễn Văn Tuấn, đơn hàng #DH-20261013-0001 của bạn đã được xuất kho và giao cho GHN (Mã vận đơn: GHN-882910471). Dự kiến giao trong 1-2 ngày tới. Cảm ơn bạn đã mua sắm!'
  },
  {
    id: 'log-zns-2',
    orderId: 'ord-102',
    orderCode: 'DH-20261013-0002',
    phone: '0903112233',
    customerName: 'Lê Hoàng Nam',
    templateId: '298372',
    templateTitle: 'Xác nhận đơn hàng & Thanh toán thành công',
    status: 'sent',
    mode: 'simulation',
    cost: 200,
    sentAt: '2026-10-11T10:02:00.000Z',
    messagePreview: 'Kính gửi Lê Hoàng Nam, đơn hàng #DH-20261013-0002 trị giá 1,240,000đ đã được xác nhận thanh toán thành công qua VietQR. Chúng tôi đang đóng gói gửi bạn sớm nhất!'
  },
  {
    id: 'log-zns-3',
    orderId: 'ord-103',
    orderCode: 'DH-20261013-0003',
    phone: '0988776655',
    customerName: 'Trần Thị Mai Phương',
    templateId: '298370',
    templateTitle: 'Tiếp nhận đơn hàng mới',
    status: 'sent',
    mode: 'simulation',
    cost: 180,
    sentAt: '2026-10-13T07:46:10.000Z',
    messagePreview: 'Cảm ơn Trần Thị Mai Phương đã đặt hàng tại ZNS Order Master. Mã đơn: #DH-20261013-0003, Tổng tiền: 743,000đ. Nhân viên sẽ liên hệ đóng gói ngay!'
  }
];

const INITIAL_SETTINGS = {
  storeName: 'ZNS E-Commerce & Retail Store',
  storePhone: '0909123456',
  storeEmail: 'contact@zns-order.vn',
  storeAddress: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  bankName: 'MB Bank (Quân Đội)',
  bankBin: '970422', // MB Bank BIN for VietQR
  bankAccount: '090912345688',
  bankOwner: 'CONG TY TNHH BAN HANG PRO',
  currency: 'VND',
  invoiceFooterNote: 'Cảm ơn Quý khách đã mua sắm! Hàng hóa được đổi trả trong 7 ngày nếu có lỗi từ nhà sản xuất.',
  znsSettings: {
    mode: 'simulation', // 'simulation' hoặc 'live'
    oaId: '298192837491823',
    appId: '1029384756',
    secretKey: 'sec_znsexamplekey2026',
    accessToken: 'zns_token_valid_sample_demo_access_key',
    templates: {
      orderCreated: { id: '298370', name: 'Xác nhận tạo đơn hàng thành công', enabled: true },
      orderShipping: { id: '298371', name: 'Thông báo xuất kho & Giao hàng', enabled: true },
      orderCompleted: { id: '298372', name: 'Cảm ơn & Giao hàng thành công', enabled: true },
      orderCancelled: { id: '298373', name: 'Thông báo hủy đơn hàng', enabled: true }
    }
  }
};

// Safe JSON reading and writing
function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      writeJSON(file, fallback);
      return fallback;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Lỗi đọc file ${file}:`, err);
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Lỗi ghi file ${file}:`, err);
    return false;
  }
}

// Mutex Lock for Atomic Transactions
let transactionQueue = Promise.resolve();

// Initialize database files if not exist
function initDB() {
  if (!fs.existsSync(FILES.categories)) writeJSON(FILES.categories, INITIAL_CATEGORIES);
  if (!fs.existsSync(FILES.products)) writeJSON(FILES.products, INITIAL_PRODUCTS);
  if (!fs.existsSync(FILES.customers)) writeJSON(FILES.customers, INITIAL_CUSTOMERS);
  if (!fs.existsSync(FILES.orders)) writeJSON(FILES.orders, INITIAL_ORDERS);
  if (!fs.existsSync(FILES.zns_logs)) writeJSON(FILES.zns_logs, INITIAL_ZNS_LOGS);
  if (!fs.existsSync(FILES.settings)) writeJSON(FILES.settings, INITIAL_SETTINGS);
}

// Database Helper with Transaction Engine & Optimistic Locking
const db = {
  // Orders
  getOrders: () => readJSON(FILES.orders, INITIAL_ORDERS),
  saveOrders: (data) => writeJSON(FILES.orders, data),
  getOrderById: (id) => readJSON(FILES.orders, INITIAL_ORDERS).find(o => o.id === id || o.code === id),

  // Customers
  getCustomers: () => readJSON(FILES.customers, INITIAL_CUSTOMERS),
  saveCustomers: (data) => writeJSON(FILES.customers, data),
  getCustomerById: (id) => readJSON(FILES.customers, INITIAL_CUSTOMERS).find(c => c.id === id),

  // Products
  getProducts: () => readJSON(FILES.products, INITIAL_PRODUCTS),
  saveProducts: (data) => writeJSON(FILES.products, data),
  getProductById: (id) => readJSON(FILES.products, INITIAL_PRODUCTS).find(p => p.id === id),

  // Categories
  getCategories: () => readJSON(FILES.categories, INITIAL_CATEGORIES),
  saveCategories: (data) => writeJSON(FILES.categories, data),

  // ZNS Logs
  getZnsLogs: () => readJSON(FILES.zns_logs, INITIAL_ZNS_LOGS),
  saveZnsLogs: (data) => writeJSON(FILES.zns_logs, data),
  addZnsLog: (log) => {
    const logs = readJSON(FILES.zns_logs, INITIAL_ZNS_LOGS);
    logs.unshift(log);
    writeJSON(FILES.zns_logs, logs);
    return log;
  },

  // Settings
  getSettings: () => readJSON(FILES.settings, INITIAL_SETTINGS),
  saveSettings: (data) => writeJSON(FILES.settings, data),

  /**
   * ATOMIC DATABASE TRANSACTION ENGINE (BEGIN TRANSACTION ... COMMIT / ROLLBACK)
   * Đảm bảo tính nguyên tử: Nếu lỗi ở bất kỳ bước nào (ví dụ trừ kho lỗi hoặc tạo đơn lỗi),
   * toàn bộ trạng thái sẽ ROLLBACK về ban đầu, chống thất thoát hàng hóa và sai lệch doanh thu.
   */
  async runTransaction(transactionCallback) {
    return new Promise((resolve, reject) => {
      transactionQueue = transactionQueue.then(async () => {
        // 1. Snapshot trạng thái hiện tại (InMemory Snapshot)
        const snapshotOrders = JSON.parse(JSON.stringify(db.getOrders()));
        const snapshotProducts = JSON.parse(JSON.stringify(db.getProducts()));
        const snapshotCustomers = JSON.parse(JSON.stringify(db.getCustomers()));

        let currentOrders = JSON.parse(JSON.stringify(snapshotOrders));
        let currentProducts = JSON.parse(JSON.stringify(snapshotProducts));
        let currentCustomers = JSON.parse(JSON.stringify(snapshotCustomers));

        // Transaction Context Object cung cấp cho callback
        const trx = {
          getOrders: () => currentOrders,
          getProducts: () => currentProducts,
          getCustomers: () => currentCustomers,

          /**
           * Trừ kho an toàn với Khóa lạc quan (Optimistic Concurrency Control)
           * Ngăn chặn bán âm kho (Overselling) khi nhiều người đặt cùng lúc.
           */
          deductStock: (productId, quantity, expectedVersion) => {
            const product = currentProducts.find(p => p.id === productId);
            if (!product) {
              throw new Error(`Sản phẩm [${productId}] không tồn tại trong kho.`);
            }

            // Kiểm tra Version nếu có yêu cầu Optimistic Locking
            if (expectedVersion !== undefined && product.version !== undefined && product.version !== expectedVersion) {
              throw new Error(`Xung đột đồng thời (Concurrency Conflict): Dữ liệu sản phẩm [${product.name}] đã bị thay đổi bởi giao dịch khác. Vui lòng tải lại trang.`);
            }

            if (product.stock < quantity) {
              throw new Error(`Sản phẩm [${product.name}] chỉ còn tồn kho ${product.stock} chiếc, không đủ đáp ứng số lượng yêu cầu ${quantity}.`);
            }

            product.stock -= quantity;
            product.version = (product.version || 1) + 1; // Tăng version để khóa các giao dịch sau
            return product;
          },

          /**
           * Hoàn tồn kho an toàn khi hủy đơn hàng
           */
          restoreStock: (productId, quantity) => {
            const product = currentProducts.find(p => p.id === productId);
            if (product) {
              product.stock += quantity;
              product.version = (product.version || 1) + 1;
            }
            return product;
          },

          addOrder: (newOrder) => {
            currentOrders.unshift(newOrder);
          },

          updateOrder: (orderId, updatedOrder) => {
            const idx = currentOrders.findIndex(o => o.id === orderId || o.code === orderId);
            if (idx !== -1) currentOrders[idx] = updatedOrder;
          },

          updateCustomer: (customer) => {
            const idx = currentCustomers.findIndex(c => c.id === customer.id || c.phone === customer.phone);
            if (idx !== -1) currentCustomers[idx] = customer;
            else currentCustomers.push(customer);
          }
        };

        try {
          // 2. Thực thi nghiệp vụ bên trong Transaction
          const result = await transactionCallback(trx);

          // 3. COMMIT: Lưu an toàn toàn bộ dữ liệu xuống đĩa cứng
          db.saveOrders(currentOrders);
          db.saveProducts(currentProducts);
          db.saveCustomers(currentCustomers);

          resolve(result);
        } catch (err) {
          // 4. ROLLBACK: Không ghi bất kỳ dữ liệu nào, khôi phục trạng thái nguyên vẹn
          console.error('🚨 Giao dịch thất bại! Đang ROLLBACK trạng thái CSDL:', err.message);
          reject(err);
        }
      });
    });
  },

  // Reset to initial sample data
  resetAll: () => {
    writeJSON(FILES.categories, INITIAL_CATEGORIES);
    writeJSON(FILES.products, INITIAL_PRODUCTS);
    writeJSON(FILES.customers, INITIAL_CUSTOMERS);
    writeJSON(FILES.orders, INITIAL_ORDERS);
    writeJSON(FILES.zns_logs, INITIAL_ZNS_LOGS);
    writeJSON(FILES.settings, INITIAL_SETTINGS);
    return true;
  }
};

// Auto init on import
initDB();

module.exports = db;
