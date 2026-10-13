/**
 * PAYMENT GATEWAY & AUTOMATED BANK RECONCILIATION
 * Nhận Webhook chuyển khoản (PayOS / Casso / VietQR / Banking) và tự động khớp đơn
 */

class PaymentService {
  constructor() {
    this.paymentLogs = [];
  }

  /**
   * Trích xuất mã đơn hàng từ nội dung chuyển khoản ngân hàng
   * Ví dụ: "NGUYEN VAN A CHUYEN KHOAN DH-20261013-0001 THANH TOAN"
   */
  extractOrderCodeFromContent(content) {
    if (!content || typeof content !== 'string') return null;

    // Tìm định dạng chuẩn: DH-20261013-0001 hoặc DH202610130001
    const match = content.match(/DH[-_]?\d{8}[-_]?\d{3,5}/i);
    if (match) {
      // Chuẩn hóa về dạng DH-YYYYMMDD-XXXX
      const raw = match[0].toUpperCase();
      if (raw.includes('-')) return raw;
      // Nếu viết liền DH202610130001 -> chèn dấu gạch nối
      return `DH-${raw.slice(2, 10)}-${raw.slice(10)}`;
    }

    // Tìm trường hợp chỉ ghi số đơn: DH 0001 hoặc DH-0001
    const simpleMatch = content.match(/DH[-_\s]?\d{3,5}/i);
    if (simpleMatch) {
      return simpleMatch[0].replace(/\s+/g, '-').toUpperCase();
    }

    return null;
  }

  /**
   * Xử lý Webhook biến động số dư ngân hàng
   */
  processBankWebhook(payload) {
    const amount = Number(payload.amount || payload.transferAmount || 0);
    const content = payload.description || payload.content || payload.orderInfo || '';
    const bankAccount = payload.bankAccount || payload.accountNumber || '';
    const refId = payload.referenceCode || payload.transactionId || 'TXN-' + Date.now();
    const transTime = payload.transactionDate || new Date().toISOString();

    const detectedCode = this.extractOrderCodeFromContent(content);

    const logEntry = {
      id: 'pay-' + Date.now(),
      refId,
      amount,
      content,
      bankAccount,
      detectedCode,
      matched: false,
      orderId: null,
      timestamp: transTime,
      rawPayload: payload
    };

    this.paymentLogs.unshift(logEntry);
    if (this.paymentLogs.length > 500) this.paymentLogs = this.paymentLogs.slice(0, 500);

    return {
      logEntry,
      detectedCode,
      amount
    };
  }

  getPaymentLogs(limit = 100) {
    return this.paymentLogs.slice(0, limit);
  }
}

module.exports = new PaymentService();
