const db = require('./db');
const auditService = require('./auditService');

/**
 * ZALO OA CHATBOT & CUSTOMER LEAD AUTO-CAPTURE ENGINE
 * - Tự động trả lời tin nhắn Zalo OA theo kịch bản thông minh & từ khóa
 * - Tự động bóc tách Số điện thoại, Tên, Địa chỉ, Nhu cầu sản phẩm của khách hàng
 * - Tự động đồng bộ thông tin khách vào CSDL Quản lý bán hàng (OMS)
 * - Tự động chuyển đổi Khách hàng tiềm năng thành Đơn hàng trong 1 click
 */
class ZaloBotService {
  /**
   * Bóc tách thông tin khách hàng từ tin nhắn tự nhiên (NLP & Regular Expressions)
   */
  extractCustomerInfo(text, senderProfile = {}) {
    if (!text || typeof text !== 'string') text = '';
    const cleanText = text.trim();

    // 1. Nhận diện Số điện thoại di động Việt Nam (Đầu số 03, 05, 07, 08, 09, +84, 84)
    let phone = null;
    const phoneRegex = /(?:(?:\+|00)?84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}\b/;
    const phoneMatch = cleanText.match(phoneRegex);
    if (phoneMatch) {
      let rawPhone = phoneMatch[0].replace(/[\s\.-]/g, '');
      if (rawPhone.startsWith('+84')) rawPhone = '0' + rawPhone.slice(3);
      else if (rawPhone.startsWith('84')) rawPhone = '0' + rawPhone.slice(2);
      phone = rawPhone;
    }

    // 2. Nhận diện Tên khách hàng xưng hô (Hỗ trợ cả Tiếng Việt có dấu và không dấu)
    let name = null;
    const namePatterns = [
      /(?:mình tên(?:\s+là)?|minh ten(?:\s+la)?|tôi tên(?:\s+là)?|toi ten(?:\s+la)?|tên là|ten la|mình là|minh la|tôi là|toi la|em tên(?:\s+là)?|em ten(?:\s+la)?|em là|em la|anh tên(?:\s+là)?|anh ten(?:\s+la)?|chị tên(?:\s+là)?|chi ten(?:\s+la)?|anh là|anh la|chị là|chi la|tên:?|ten:?)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25}?)(?=(?:\s+(?:ở|o|tại|tai|địa chỉ|dia chi|đ\/c|sđt|sdt|số|so|đt|dt|phone)(?=[,\s.:;!?]|$)|[\s,.:;!?]\d|,|\.|\n|$))/iu,
      /(?:anh|chị|chi|em|bạn|ban)\s+([A-ZÀ-Ỹa-zà-ỹ]+(?:\s+[A-ZÀ-Ỹa-zà-ỹ]+)?)(?=(?:\s+(?:ở|o|tại|tai|địa chỉ|dia chi|đ\/c|sđt|sdt|số|so|đt|dt|phone)(?=[,\s.:;!?]|$)|[\s,.:;!?]\d|,|\.|\s|$))/iu
    ];
    for (const pat of namePatterns) {
      const nameMatch = cleanText.match(pat);
      if (nameMatch && nameMatch[1] && nameMatch[1].trim().length >= 2) {
        name = nameMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        break;
      }
    }
    if (!name && (senderProfile.name || senderProfile.display_name)) {
      name = senderProfile.name || senderProfile.display_name;
    }

    // 3. Nhận diện Địa chỉ giao hàng (Hỗ trợ cả Tiếng Việt có dấu và không dấu)
    let address = null;
    const addrPatterns = [
      /(?:^|[\s,.:;!?])(?:ở|tại|địa chỉ(?:\s+là)?|dia chi(?:\s+la)?|gửi về|gui ve|nhận hàng tại|nhan hang tai|ship về|ship ve|giao đến|giao den|giao qua|đ\/c|o\s+|tai\s+)\s*([^,\n\.]{4,80}?)(?=(?:[\s,.:;!?](?:sđt|sdt|đt|dt|phone|lấy|lay|mua|đặt|dat|giúp|giup|giùm|gium|nhé|nhe)\b|\s*\d{9,11}|,|\.|\n|$))/iu,
      /(?:^|[\s,.:;!?])(?:ở|tại|địa chỉ(?:\s+là)?|dia chi(?:\s+la)?|gửi về|gui ve|nhận hàng tại|nhan hang tai|ship về|ship ve|giao đến|giao den|giao qua|đ\/c|o\s+|tai\s+)\s*([^,\n\.]{4,80})/iu
    ];
    for (const pat of addrPatterns) {
      const addrMatch = cleanText.match(pat);
      if (addrMatch && addrMatch[1] && addrMatch[1].trim().length >= 4) {
        let rawAddr = addrMatch[1].trim();
        rawAddr = rawAddr.replace(/^(?:tại|tai|ở|o|là|la)\s+/i, '').trim();
        if (rawAddr.length >= 4) {
          address = rawAddr;
          break;
        }
      }
    }

    // 4. Khớp sản phẩm khách quan tâm từ Danh mục sản phẩm thực tế trong Kho
    const products = db.getProducts();
    let matchedProduct = null;
    let matchedQuantity = 1;

    // Tìm số lượng mua ("2 cái", "3 chiếc", "lấy 2", "mua 1")
    const qtyMatch = cleanText.match(/(?:lấy|mua|đặt|ship|gửi)\s+(\d+)\s*(?:cái|chiếc|bộ|hộp)?/i);
    if (qtyMatch && qtyMatch[1]) {
      matchedQuantity = Math.max(1, parseInt(qtyMatch[1], 10));
    }

    const lowerText = cleanText.toLowerCase();
    for (const prod of products) {
      const prodNameLower = (prod.name || '').toLowerCase();
      const skuLower = (prod.sku || '').toLowerCase();

      // Kiểm tra tên sản phẩm hoặc từ khóa đại diện
      if (lowerText.includes(skuLower) ||
          prodNameLower.split(' ').some(word => word.length > 3 && lowerText.includes(word))) {
        // Kiểm tra khớp từ khóa nổi bật (tai nghe, củ sạc, balo, áo polo, serum, nồi chiên)
        if (
          (prodNameLower.includes('tai nghe') && lowerText.includes('tai nghe')) ||
          (prodNameLower.includes('sạc') && lowerText.includes('sạc')) ||
          (prodNameLower.includes('polo') && (lowerText.includes('polo') || lowerText.includes('áo'))) ||
          (prodNameLower.includes('balo') && lowerText.includes('balo')) ||
          (prodNameLower.includes('serum') && lowerText.includes('serum')) ||
          (prodNameLower.includes('nồi chiên') && lowerText.includes('nồi chiên')) ||
          lowerText.includes(prodNameLower)
        ) {
          matchedProduct = prod;
          break;
        }
      }
    }

    return {
      hasPhone: !!phone,
      phone,
      name: name || 'Khách hàng Zalo',
      address,
      matchedProduct,
      quantity: matchedQuantity,
      originalText: cleanText
    };
  }

  /**
   * Xử lý tin nhắn đến từ Zalo OA (Hoặc bộ giả lập Web Simulator)
   */
  async processMessage({ text, senderId = 'usr-zalo-guest', senderName = 'Khách Zalo', senderPhone = null }) {
    const settings = db.getSettings();
    const botConfig = settings.zaloBotConfig || {
      enabled: true,
      welcomeMessage: 'Dạ xin chào Anh/Chị! Shop có thể hỗ trợ tư vấn sản phẩm hoặc báo giá giúp mình ạ?',
      leadSuccessMessage: 'Dạ em đã lưu thông tin của Anh/Chị {name} (SĐT: {phone}, Địa chỉ: {address}). Nhân viên CSKH bên em sẽ gọi điện xác nhận và gửi hàng ngay ạ!',
      keywords: []
    };

    if (!botConfig.enabled) {
      return {
        autoReplied: false,
        message: 'Zalo Bot hiện đang tạm tắt.',
        leadCaptured: false
      };
    }

    const cleanText = (text || '').trim();
    const extracted = this.extractCustomerInfo(cleanText, { name: senderName, phone: senderPhone });
    if (!extracted.name && senderName) extracted.name = senderName;
    if (!extracted.phone && senderPhone) extracted.phone = senderPhone;

    let botReply = '';
    let leadCaptured = false;
    let savedCustomer = null;
    let savedLead = null;

    // =========================================================================
    // KỊCH BẢN 1: PHÁT HIỆN SỐ ĐIỆN THOẠI KHÁCH HÀNG (THU THẬP THÔNG TIN THÀNH CÔNG)
    // =========================================================================
    if (extracted.hasPhone || extracted.phone) {
      leadCaptured = true;

      // 1. Tự động lưu / cập nhật Khách hàng vào OMS (Bảng customers)
      const customers = db.getCustomers();
      let customer = customers.find(c => c.phone === extracted.phone);

      if (!customer) {
        customer = {
          id: 'cust-zalo-' + Date.now(),
          name: extracted.name,
          phone: extracted.phone,
          email: '',
          address: extracted.address || '',
          city: '',
          tier: 'Standard',
          totalSpent: 0,
          orderCount: 0,
          source: 'Zalo OA Chatbot',
          notes: `Khách hàng tự động thu thập từ tin nhắn Zalo: "${cleanText}"`,
          createdAt: new Date().toISOString()
        };
        customers.push(customer);
        db.saveCustomers(customers);
      } else {
        // Cập nhật tên hoặc địa chỉ nếu trước đó chưa có
        if (extracted.name && customer.name === 'Khách hàng Zalo') customer.name = extracted.name;
        if (extracted.address && !customer.address) customer.address = extracted.address;
        db.saveCustomers(customers);
      }
      savedCustomer = customer;

      // 2. Tự động lưu Khách hàng tiềm năng (Bảng zalo_leads)
      const leads = db.getZaloLeads();
      const newLead = {
        id: 'lead-zalo-' + Date.now(),
        customerName: extracted.name,
        customerPhone: extracted.phone,
        customerAddress: extracted.address || (customer.address || ''),
        interestedProduct: extracted.matchedProduct ? extracted.matchedProduct.name : 'Quan tâm tư vấn',
        productId: extracted.matchedProduct ? extracted.matchedProduct.id : null,
        productPrice: extracted.matchedProduct ? extracted.matchedProduct.salePrice : 0,
        quantity: extracted.quantity || 1,
        source: 'Zalo OA Chatbot',
        messageHistory: [
          { sender: 'user', text: cleanText, time: new Date().toISOString() }
        ],
        status: 'new', // 'new' | 'contacted' | 'converted' | 'cancelled'
        notes: `Tự động bóc tách từ Zalo: SĐT: ${extracted.phone}${extracted.matchedProduct ? ' - SP: ' + extracted.matchedProduct.name : ''}`,
        createdAt: new Date().toISOString()
      };

      leads.unshift(newLead);
      db.saveZaloLeads(leads);
      savedLead = newLead;

      // 3. Ghi Audit Log cho hệ thống
      auditService.log({
        user: { name: 'Zalo OA Chatbot', role: 'chatbot' },
        entityType: 'CUSTOMER_LEAD',
        entityId: extracted.phone,
        action: 'ZALO_LEAD_CAPTURED',
        description: `Tự động thu thập thông tin khách hàng ${extracted.name} (${extracted.phone}) từ Zalo OA`,
        reason: cleanText
      });

      // 4. Tạo tin nhắn phản hồi xác nhận tới khách hàng
      let templateReply = botConfig.leadSuccessMessage ||
        'Dạ em đã lưu thông tin của Anh/Chị {name} (SĐT: {phone}{address}). Nhân viên CSKH bên em sẽ gọi điện xác nhận và gửi hàng ngay ạ!';

      let formattedAddr = '';
      if (extracted.address) {
        if (/Địa chỉ:\s*\{address\}/i.test(templateReply)) {
          formattedAddr = extracted.address;
        } else {
          formattedAddr = `, Địa chỉ: ${extracted.address}`;
        }
      } else {
        templateReply = templateReply.replace(/,\s*Địa chỉ:\s*\{address\}/i, '').replace(/Địa chỉ:\s*\{address\}/i, '');
      }

      botReply = templateReply
        .replace('{name}', extracted.name)
        .replace('{phone}', extracted.phone)
        .replace('{address}', formattedAddr)
        .replace('{storeName}', settings.storeName || 'Cửa hàng');

      // Nếu có sản phẩm đi kèm, bổ sung chi tiết giá và số lượng
      if (extracted.matchedProduct) {
        const prodPriceFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(extracted.matchedProduct.salePrice * extracted.quantity);
        botReply += `\n\n📦 Đơn dự kiến: [${extracted.quantity}x ${extracted.matchedProduct.name}] - Tạm tính: ${prodPriceFmt}.`;
      }
    }
    // =========================================================================
    // KỊCH BẢN 2: KHỚP THEO TỪ KHÓA (KEYWORD MATCHING FAQ)
    // =========================================================================
    else {
      const lower = cleanText.toLowerCase();
      let matchedKeywordRule = null;

      if (Array.isArray(botConfig.keywords)) {
        matchedKeywordRule = botConfig.keywords.find(k => lower.includes(k.keyword.toLowerCase()));
      }

      if (matchedKeywordRule) {
        botReply = matchedKeywordRule.reply;
      } else if (lower.includes('giá') || lower.includes('bao nhiêu')) {
        if (extracted.matchedProduct) {
          const priceFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(extracted.matchedProduct.salePrice);
          botReply = `Dạ sản phẩm [${extracted.matchedProduct.name}] hiện đang có giá ưu đãi là ${priceFmt} ạ! Anh/Chị để lại Số điện thoại & Địa chỉ giao hàng để shop gửi ưu đãi kèm Freeship nhé!`;
        } else {
          botReply = `Dạ giá các mặt hàng hot bên em hiện đang được giảm sâu từ 10% - 30%. Anh/Chị đang quan tâm mẫu sản phẩm nào hoặc để lại Số điện thoại để bên em gửi báo giá chi tiết ạ!`;
        }
      } else if (lower.includes('địa chỉ') || lower.includes('ở đâu')) {
        botReply = `Dạ trụ sở / kho hàng của shop tại: ${settings.storeAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM'}. Shop có giao hàng tận nhà toàn quốc đồng kiểm ạ!`;
      } else if (lower.includes('ship') || lower.includes('giao hàng') || lower.includes('vận chuyển')) {
        botReply = `Dạ shop hợp tác với Giao Hàng Nhanh & Viettel Post giao toàn quốc trong 1-3 ngày, hỗ trợ đồng kiểm thanh toán COD khi nhận hàng ạ.`;
      } else {
        // Kịch bản mặc định / Lời chào
        botReply = botConfig.welcomeMessage ||
          `Dạ xin chào Anh/Chị! Cảm ơn Anh/Chị đã nhắn tin tới ${settings.storeName || 'Shop'}. Anh/Chị đang quan tâm sản phẩm nào hoặc cần hỗ trợ gì cứ nhắn shop, hoặc để lại Số điện thoại để chuyên viên tư vấn gọi hỗ trợ ngay nhé!`;
      }
    }

    return {
      autoReplied: true,
      botReply,
      leadCaptured,
      extracted,
      savedCustomer,
      savedLead
    };
  }

  /**
   * Chuyển đổi 1 Lead thành Đơn hàng chính thức trong CSDL OMS (1-Click Convert)
   */
  async convertLeadToOrder(leadId, additionalData = {}) {
    const leads = db.getZaloLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Không tìm thấy Khách hàng tiềm năng mã [${leadId}]`);

    const products = db.getProducts();
    let product = products.find(p => p.id === lead.productId);
    if (!product) {
      product = products[0] || { id: 'prod-1', name: 'Sản phẩm tư vấn Zalo', sku: 'SP-ZALO', salePrice: 490000 };
    }

    const quantity = lead.quantity || 1;
    const subtotal = (product.salePrice || 490000) * quantity;
    const shippingFee = additionalData.shippingFee !== undefined ? Number(additionalData.shippingFee) : 30000;
    const discount = additionalData.discount !== undefined ? Number(additionalData.discount) : 0;
    const totalAmount = subtotal + shippingFee - discount;

    const newOrderCode = 'DH-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const newOrder = {
      id: 'ord-' + Date.now(),
      code: newOrderCode,
      customerId: 'cust-zalo-' + Date.now(),
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerAddress: lead.customerAddress || 'Địa chỉ cập nhật qua Zalo',
      carrier: additionalData.carrier || 'Giao Hàng Nhanh (GHN)',
      trackingCode: '',
      paymentMethod: additionalData.paymentMethod || 'COD',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      items: [
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.salePrice,
          quantity: quantity,
          total: subtotal
        }
      ],
      subtotal,
      shippingFee,
      discount,
      totalAmount,
      customerNote: `Đơn chốt từ Zalo OA Chatbot (Lead ID: ${lead.id})`,
      staffNote: additionalData.staffNote || 'Nhân viên chốt đơn từ tin nhắn Zalo',
      timeline: [
        {
          status: 'pending',
          title: 'Tự động tạo đơn từ Zalo Lead',
          desc: `Chuyển đổi thành công từ khách hàng Zalo [${lead.customerName} - ${lead.customerPhone}]`,
          time: new Date().toISOString(),
          user: 'Zalo Bot OMS'
        }
      ],
      znsSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Lưu đơn hàng qua giao dịch an toàn
    await db.runTransaction(async (trx) => {
      trx.addOrder(newOrder);
      // Cập nhật trạng thái lead
      lead.status = 'converted';
      lead.orderCode = newOrderCode;
      lead.convertedAt = new Date().toISOString();
      db.saveZaloLeads(leads);
    });

    auditService.log({
      user: { name: 'Zalo Bot', role: 'admin' },
      entityType: 'ORDER',
      entityId: newOrderCode,
      action: 'CONVERT_ZALO_LEAD',
      description: `Chuyển đổi Lead Zalo [${lead.customerName}] thành đơn hàng #${newOrderCode} trị giá ${totalAmount.toLocaleString('vi-VN')}đ`
    });

    return {
      success: true,
      order: newOrder,
      lead
    };
  }
}

module.exports = new ZaloBotService();
