const db = require('./db');

/**
 * Dịch vụ Tích hợp & Giả lập Zalo Notification Service (ZNS)
 */
class ZnsService {
  /**
   * Tạo nội dung preview tin nhắn ZNS dựa trên sự kiện và thông tin đơn hàng
   */
  generateMessageContent(eventType, order, settings) {
    const storeName = settings.storeName || 'Cửa hàng ZNS';
    const totalFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0);
    const dateFormatted = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    switch (eventType) {
      case 'orderCreated':
        return {
          title: 'XÁC NHẬN ĐẶT HÀNG THÀNH CÔNG',
          templateId: settings.znsSettings.templates.orderCreated.id,
          body: `Kính gửi Quý khách ${order.customerName},\n\nĐơn hàng #${order.code} của bạn đã được ghi nhận thành công trên hệ thống ${storeName}.\n\n• Tổng thanh toán: ${totalFormatted}\n• Phương thức: ${order.paymentMethod}\n• Địa chỉ nhận: ${order.customerAddress}\n\nChúng tôi đang xử lý đóng gói và sẽ gửi thông tin vận chuyển đến bạn trong thời gian sớm nhất. Xin chân thành cảm ơn!`,
          data: {
            customer_name: order.customerName,
            order_code: order.code,
            order_date: dateFormatted,
            total_amount: totalFormatted,
            payment_status: order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán (COD)'
          }
        };

      case 'orderShipping':
        return {
          title: 'ĐƠN HÀNG ĐANG ĐƯỢC GIAO',
          templateId: settings.znsSettings.templates.orderShipping.id,
          body: `Xin chào ${order.customerName}!\n\nĐơn hàng #${order.code} của bạn đã được đóng gói và bàn giao cho đơn vị vận chuyển:\n\n• Đơn vị vận chuyển: ${order.carrier || 'Đang cập nhật'}\n• Mã vận đơn: ${order.trackingCode || 'Chưa cập nhật'}\n• Thu hộ COD: ${order.paymentStatus === 'paid' ? '0đ (Đã thanh toán)' : totalFormatted}\n\nQuý khách vui lòng để ý điện thoại khi shipper liên hệ giao hàng nhé!`,
          data: {
            customer_name: order.customerName,
            order_code: order.code,
            carrier: order.carrier || 'Vận chuyển tiêu chuẩn',
            tracking_code: order.trackingCode || 'N/A',
            cod_amount: order.paymentStatus === 'paid' ? '0đ' : totalFormatted
          }
        };

      case 'orderCompleted':
        return {
          title: 'GIAO HÀNG THÀNH CÔNG & CẢM ƠN',
          templateId: settings.znsSettings.templates.orderCompleted.id,
          body: `Kính gửi ${order.customerName},\n\nĐơn hàng #${order.code} đã được giao thành công đến bạn.\n\n${storeName} xin gửi lời cảm ơn chân thành tới bạn. Nếu bạn hài lòng với sản phẩm, hãy dành chút thời gian đánh giá 5 sao cho shop nhé!\n\nHotline hỗ trợ: ${settings.storePhone || '1900 xxxx'}`,
          data: {
            customer_name: order.customerName,
            order_code: order.code,
            complete_date: dateFormatted,
            store_hotline: settings.storePhone || ''
          }
        };

      case 'orderCancelled':
        return {
          title: 'THÔNG BÁO HỦY ĐƠN HÀNG',
          templateId: settings.znsSettings.templates.orderCancelled.id,
          body: `Thông báo tới Quý khách ${order.customerName},\n\nĐơn hàng #${order.code} trị giá ${totalFormatted} đã được hủy theo yêu cầu hoặc do lý do phát sinh.\n\nNếu có bất kỳ thắc mắc hoặc cần hỗ trợ đặt lại, vui lòng liên hệ hotline: ${settings.storePhone}. Rất tiếc vì sự bất tiện này!`,
          data: {
            customer_name: order.customerName,
            order_code: order.code,
            cancel_time: dateFormatted
          }
        };

      default:
        return {
          title: 'THÔNG BÁO TỪ CỬA HÀNG',
          templateId: 'DEFAULT',
          body: `Xin chào ${order.customerName}, đơn hàng #${order.code} đã có cập nhật trạng thái mới. Cảm ơn quý khách!`,
          data: {
            customer_name: order.customerName,
            order_code: order.code
          }
        };
    }
  }

  /**
   * Gửi thông báo ZNS (Hỗ trợ Live API hoặc Simulation)
   */
  async sendZnsNotification(eventType, order, customNote = '') {
    const settings = db.getSettings();
    const znsConfig = settings.znsSettings || {};
    const templateConfig = znsConfig.templates?.[eventType];

    // Kiểm tra cấu hình template
    if (templateConfig && templateConfig.enabled === false) {
      return {
        success: false,
        message: `Mẫu tin ZNS cho sự kiện '${eventType}' đang bị tắt trong cài đặt.`
      };
    }

    const preview = this.generateMessageContent(eventType, order, settings);
    const phone = order.customerPhone || '';

    // Chuẩn hóa số điện thoại theo chuẩn Zalo (84xxxxxxxxx)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.slice(1);
    }

    const logEntry = {
      id: 'log-zns-' + Date.now(),
      orderId: order.id,
      orderCode: order.code,
      phone: order.customerPhone,
      zaloPhone: formattedPhone,
      customerName: order.customerName,
      templateId: preview.templateId,
      templateTitle: preview.title,
      status: 'sent',
      mode: znsConfig.mode || 'simulation',
      cost: 180, // Chi phí trung bình 1 tin ZNS (VND)
      sentAt: new Date().toISOString(),
      messagePreview: preview.body,
      templateData: preview.data,
      apiResponse: null
    };

    if (znsConfig.mode === 'live' && znsConfig.accessToken) {
      // GỌI THẬT ĐẾN ZALO OPENAPI
      try {
        const payload = {
          phone: formattedPhone,
          template_id: preview.templateId,
          template_data: preview.data,
          tracking_id: `trk_${order.code}_${Date.now()}`
        };

        const response = await fetch('https://openapi.zalo.me/v2.0/oa/message/template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': znsConfig.accessToken
          },
          body: JSON.stringify(payload)
        });

        const resData = await response.json();
        logEntry.apiResponse = resData;

        if (resData.error === 0) {
          logEntry.status = 'sent';
        } else {
          logEntry.status = 'failed';
          logEntry.errorMessage = resData.message || 'Lỗi từ Zalo API';
        }
      } catch (err) {
        logEntry.status = 'failed';
        logEntry.errorMessage = err.message || 'Lỗi mạng khi gọi Zalo API';
      }
    } else {
      // CHẾ ĐỘ GIẢ LẬP (SIMULATION / SANDBOX)
      // Mô phỏng độ trễ mạng thực tế 200ms
      await new Promise(r => setTimeout(r, 200));
      logEntry.status = 'sent';
      logEntry.apiResponse = {
        error: 0,
        message: 'Success (ZNS Sandbox Mode - Mô phỏng thành công)',
        data: {
          msg_id: 'sim_msg_' + Math.random().toString(36).substring(2, 10),
          sent_time: Date.now()
        }
      };
    }

    // Lưu vào nhật ký gửi ZNS
    db.addZnsLog(logEntry);

    return {
      success: logEntry.status === 'sent',
      log: logEntry,
      preview
    };
  }
}

module.exports = new ZnsService();
