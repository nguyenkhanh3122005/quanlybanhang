/**
 * Chuẩn hóa và kiểm tra số điện thoại di động Việt Nam hợp lệ
 * @param {string|number} phone Số điện thoại đầu vào
 * @returns {{ isValid: boolean, formattedPhone: string, message: string, displayPhone: string }}
 */
function validateAndFormatVNPhone(phone) {
  if (phone === null || phone === undefined || phone === '') {
    return {
      isValid: false,
      formattedPhone: '',
      displayPhone: '',
      message: 'Số điện thoại không được để trống.',
    };
  }

  let strPhone = String(phone).trim();
  if (!strPhone) {
    return {
      isValid: false,
      formattedPhone: '',
      displayPhone: '',
      message: 'Số điện thoại không được để trống.',
    };
  }

  // 1. Loại bỏ toàn bộ khoảng trắng, dấu chấm, dấu gạch nối, dấu ngoặc
  let cleanPhone = strPhone.replace(/[\s.()\-]/g, '');

  // 2. Định dạng Regex cho các đầu số di động hiện hành: 3, 5, 7, 8, 9 (10 số tiêu chuẩn Bộ TT&TT)
  const regex = /^(?:\+84|84|0)[35789]\d{8}$/;

  if (!regex.test(cleanPhone)) {
    return {
      isValid: false,
      formattedPhone: cleanPhone,
      displayPhone: cleanPhone,
      message: 'Số điện thoại không đúng định dạng di động Việt Nam (10 số).',
    };
  }

  // 3. Chuẩn hóa về định dạng gửi ZNS (định dạng chuẩn 84xxxxxxxxx)
  let znsPhone = cleanPhone;
  if (znsPhone.startsWith('+84')) {
    znsPhone = znsPhone.slice(1);
  } else if (znsPhone.startsWith('0')) {
    znsPhone = '84' + znsPhone.slice(1);
  }

  // Định dạng hiển thị nội địa (0xxxxxxxxx)
  let displayPhone = '0' + znsPhone.slice(2);

  return {
    isValid: true,
    formattedPhone: znsPhone,
    displayPhone,
    message: 'Hợp lệ',
  };
}

module.exports = { validateAndFormatVNPhone };
