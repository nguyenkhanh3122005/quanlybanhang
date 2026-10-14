const db = require('./db');
const { validateAndFormatVNPhone } = require('./phoneValidator');

/**
 * ==============================================================================
 * ZNS ORDER MASTER PRO - DỊCH VỤ ZALO NOTIFICATION SERVICE (ZNS)
 * ==============================================================================
 * - Hỗ trợ cả 2 chế độ:
 *   1. Chế độ Mô phỏng (Sandbox / Simulation): Thử nghiệm quy trình miễn phí,
 *      không tốn phí tin và không gửi tới điện thoại thật.
 *   2. Chế độ Gửi thật (Live OpenAPI): Gửi trực tiếp tin nhắn thông báo đến
 *      ứng dụng Zalo trên điện thoại khách hàng qua Zalo Cloud OpenAPI.
 * - Tự động gia hạn Access Token qua Zalo OAuth v4 Refresh Token (Token 25h).
 * - Kiểm tra tình trạng kết nối Zalo OA và số dư tài khoản ZCA.
 * ==============================================================================
 */
class ZnsService {
  /**
   * Phiên dịch mã lỗi Zalo OpenAPI sang tiếng Việt trực quan, dễ hiểu
   */
  translateZaloError(code, rawMsg = '') {
    switch (code) {
      case 0:
        return 'Gửi tin thành công';
      case -216:
        return 'Access Token không hợp lệ hoặc đã hết hạn (Access Token Zalo chỉ có hạn 25 giờ). Vui lòng làm mới Token.';
      case -124:
        return 'Số dư tài khoản Zalo Cloud (ZCA) không đủ để thanh toán phí gửi tin (Phí ~180đ/tin). Vui lòng nạp tiền vào ZCA.';
      case -112:
        return 'Mẫu tin ZNS (Template ID) không tồn tại hoặc chưa được Zalo duyệt. Vui lòng kiểm tra Template ID trên Zalo Cloud.';
      case -201:
        return 'Số điện thoại không hợp lệ hoặc khách hàng chưa đăng ký tài khoản Zalo.';
      case -213:
        return 'Khách hàng đã thiết lập từ chối nhận tin nhắn ZNS hoặc tài khoản bị giới hạn.';
      case -221:
        return 'Dữ liệu tham số (template_data) không khớp với cấu hình mẫu tin đã duyệt trên Zalo Cloud.';
      case -108:
        return 'App ID hoặc Secret Key của Zalo App không chính xác.';
      case -118:
        return 'Tài khoản Zalo Official Account (OA) chưa được xác thực (Cần xác thực Tích vàng doanh nghiệp).';
      default:
        return rawMsg ? `Lỗi Zalo API (${code}): ${rawMsg}` : `Lỗi Zalo API mã ${code}`;
    }
  }

  /**
   * Tự động làm mới Access Token bằng Refresh Token (Zalo OAuth v4)
   */
  async refreshAccessToken() {
    const settings = db.getSettings();
    const zs = settings.znsSettings || {};

    if (!zs.appId || !zs.secretKey || !zs.refreshToken) {
      return {
        success: false,
        message: 'Thiếu App ID, Secret Key hoặc Refresh Token để tự động làm mới Access Token.'
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('app_id', zs.appId);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', zs.refreshToken);

      const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'secret_key': zs.secretKey
        },
        body: params.toString()
      });

      const data = await res.json();
      if (data.access_token) {
        zs.accessToken = data.access_token;
        if (data.refresh_token) {
          zs.refreshToken = data.refresh_token;
        }
        settings.znsSettings = zs;
        db.saveSettings(settings);

        return {
          success: true,
          accessToken: data.access_token,
          expiresIn: data.expires_in,
          message: 'Làm mới Access Token thành công!'
        };
      } else {
        return {
          success: false,
          errorCode: data.error,
          message: data.error_description || data.message || 'Không thể làm mới token Zalo'
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Lỗi kết nối khi làm mới token: ${err.message}`
      };
    }
  }

  /**
   * Kiểm tra kết nối Zalo OA thật (Xác thực Access Token & Thông tin OA)
   */
  async checkZaloConnection() {
    const settings = db.getSettings();
    const zs = settings.znsSettings || {};

    if (zs.mode === 'simulation') {
      return {
        success: true,
        mode: 'simulation',
        isLive: false,
        message: 'Hệ thống đang ở chế độ Mô Phỏng Sandbox. Tin nhắn sẽ không gửi tới điện thoại thật.'
      };
    }

    if (!zs.accessToken) {
      return {
        success: false,
        mode: 'live',
        isLive: true,
        message: 'Chưa cấu hình Access Token Zalo OA.'
      };
    }

    try {
      let res = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
        method: 'GET',
        headers: {
          'access_token': zs.accessToken
        }
      });
      let data = await res.json();

      // Nếu token hết hạn và có refresh token thì thử tự refresh
      if (data.error === -216 && zs.refreshToken && zs.appId && zs.secretKey) {
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success) {
          res = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
            method: 'GET',
            headers: {
              'access_token': refreshResult.accessToken
            }
          });
          data = await res.json();
        }
      }

      if (data.error === 0) {
        return {
          success: true,
          mode: 'live',
          isLive: true,
          oaInfo: data.data,
          message: `Kết nối thành công tới Zalo OA: ${data.data.name} (Tích vàng: ${data.data.is_verified ? 'Đã xác thực' : 'Chưa'})`
        };
      } else {
        return {
          success: false,
          mode: 'live',
          isLive: true,
          errorCode: data.error,
          message: this.translateZaloError(data.error, data.message)
        };
      }
    } catch (err) {
      return {
        success: false,
        mode: 'live',
        isLive: true,
        message: `Lỗi mạng khi kết nối Zalo API: ${err.message}`
      };
    }
  }

  /**
   * Tạo nội dung preview tin nhắn ZNS dựa trên sự kiện và thông tin đơn hàng
   */
  generateMessageContent(eventType, order, settings) {
    const storeName = settings.storeName || 'Cửa hàng ZNS';
    const totalFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0);
    const dateFormatted = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const templates = settings.znsSettings?.templates || {};

    switch (eventType) {
      case 'orderCreated':
        return {
          title: 'XÁC NHẬN ĐẶT HÀNG THÀNH CÔNG',
          templateId: templates.orderCreated?.id || '298370',
          body: `Kính gửi Quý khách ${order.customerName},\n\nĐơn hàng #${order.code} của bạn đã được ghi nhận thành công trên hệ thống ${storeName}.\n\n• Tổng thanh toán: ${totalFormatted}\n• Phương thức: ${order.paymentMethod || 'COD'}\n• Địa chỉ nhận: ${order.customerAddress || 'Tại cửa hàng'}\n\nChúng tôi đang xử lý đóng gói và sẽ gửi thông tin vận chuyển đến bạn trong thời gian sớm nhất. Xin chân thành cảm ơn!`,
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
          templateId: templates.orderShipping?.id || '298371',
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
          templateId: templates.orderCompleted?.id || '298372',
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
          templateId: templates.orderCancelled?.id || '298373',
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
          templateId: '298370',
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
    const rawPhone = (order.customerPhone || order.phone || '').trim();

    // Chuẩn hóa và kiểm định số điện thoại di động Việt Nam theo chuẩn ZNS (84xxxxxxxxx)
    const phoneCheck = validateAndFormatVNPhone(rawPhone);
    if (!phoneCheck.isValid) {
      return {
        success: false,
        message: `Số điện thoại không hợp lệ để gửi ZNS: ${phoneCheck.message} (Đầu vào: "${rawPhone}")`
      };
    }

    const phone = phoneCheck.displayPhone;
    const formattedPhone = phoneCheck.formattedPhone;

    const logEntry = {
      id: 'log-zns-' + Date.now(),
      orderId: order.id,
      orderCode: order.code,
      phone: order.customerPhone,
      zaloPhone: formattedPhone,
      customerName: order.customerName,
      templateId: preview.templateId,
      templateTitle: preview.title,
      status: 'pending',
      mode: znsConfig.mode || 'simulation',
      cost: 180, // Chi phí trung bình 1 tin ZNS (VND)
      sentAt: new Date().toISOString(),
      messagePreview: preview.body,
      templateData: preview.data,
      apiResponse: null,
      realPhoneSent: false,
      errorMessage: null
    };

    // =========================================================================
    // 1. CHẾ ĐỘ GỬI THẬT (LIVE OPENAPI - KHÁCH NHẬN ĐƯỢC THÔNG BÁO THẬT TRÊN ZALO)
    // =========================================================================
    if (znsConfig.mode === 'live') {
      if (!znsConfig.accessToken) {
        logEntry.status = 'failed';
        logEntry.errorMessage = 'Chưa cấu hình Access Token của Zalo OA. Vui lòng vào Cài đặt kết nối để nhập Access Token.';
        db.addZnsLog(logEntry);
        return {
          success: false,
          mode: 'live',
          realPhoneSent: false,
          message: logEntry.errorMessage,
          log: logEntry
        };
      }

      try {
        const payload = {
          phone: formattedPhone,
          template_id: preview.templateId,
          template_data: preview.data,
          tracking_id: `trk_${order.code}_${Date.now()}`
        };

        let response = await fetch('https://openapi.zalo.me/v2.0/oa/message/template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': znsConfig.accessToken
          },
          body: JSON.stringify(payload)
        });

        let resData = await response.json();

        // Nếu mã lỗi -216 (Token hết hạn), thử tự động refresh token và gửi lại
        if (resData.error === -216 && znsConfig.refreshToken && znsConfig.appId && znsConfig.secretKey) {
          const refreshRes = await this.refreshAccessToken();
          if (refreshRes.success) {
            response = await fetch('https://openapi.zalo.me/v2.0/oa/message/template', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': refreshRes.accessToken
              },
              body: JSON.stringify(payload)
            });
            resData = await response.json();
          }
        }

        logEntry.apiResponse = resData;

        if (resData.error === 0) {
          logEntry.status = 'sent';
          logEntry.realPhoneSent = true;
          logEntry.msgId = resData.data?.msg_id;
        } else {
          logEntry.status = 'failed';
          logEntry.realPhoneSent = false;
          logEntry.errorMessage = this.translateZaloError(resData.error, resData.message);
        }
      } catch (err) {
        logEntry.status = 'failed';
        logEntry.realPhoneSent = false;
        logEntry.errorMessage = `Lỗi mạng khi kết nối Zalo API: ${err.message}`;
      }
    } 
    // =========================================================================
    // 2. CHẾ ĐỘ MÔ PHỎNG (SANDBOX - KHÔNG GỬI TỚI ĐIỆN THOẠI THẬT)
    // =========================================================================
    else {
      await new Promise(r => setTimeout(r, 200));
      logEntry.status = 'sent';
      logEntry.realPhoneSent = false;
      logEntry.simulationNote = 'Chế độ Sandbox: Đã mô phỏng thành công trên hệ thống. Tin nhắn KHÔNG gửi tới điện thoại thật.';
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

    const isSuccess = logEntry.status === 'sent';
    let feedbackMessage = '';
    if (znsConfig.mode === 'live') {
      if (isSuccess) {
        feedbackMessage = `Đã gửi tin nhắn thật thành công tới ứng dụng Zalo của khách hàng (${phone})! Mã tin: ${logEntry.msgId || 'OK'}`;
      } else {
        feedbackMessage = `Gửi tin Zalo thất bại: ${logEntry.errorMessage}`;
      }
    } else {
      feedbackMessage = `[Sandbox Mô phỏng] Đã ghi nhận gửi thử nghiệm tới ${phone}. (Lưu ý: Chế độ Sandbox không gửi tới điện thoại thật, hãy bật Live để gửi thật).`;
    }

    return {
      success: isSuccess,
      mode: znsConfig.mode || 'simulation',
      realPhoneSent: logEntry.realPhoneSent,
      message: feedbackMessage,
      errorMessage: logEntry.errorMessage,
      log: logEntry,
      preview
    };
  }
}

module.exports = new ZnsService();
