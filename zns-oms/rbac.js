/**
 * ROLE-BASED ACCESS CONTROL (RBAC) & PII DATA MASKING
 * Bảo vệ thông tin cá nhân khách hàng và phân quyền bảo mật 3 cấp độ
 */

const ROLES = {
  ADMIN: 'admin',         // Chủ shop / Quản trị viên toàn quyền
  WAREHOUSE: 'warehouse', // Nhân viên đóng gói / Kho
  SALES: 'sales'          // Nhân viên bán hàng / Chăm sóc khách hàng
};

const USERS = [
  {
    id: 'usr-admin-1',
    name: 'Nguyễn Quản Trị (Chủ Shop)',
    email: 'admin@zns-order.vn',
    role: ROLES.ADMIN,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-warehouse-1',
    name: 'Trần Văn Kho (Nhặt & Đóng hàng)',
    email: 'kho@zns-order.vn',
    role: ROLES.WAREHOUSE,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-sales-1',
    name: 'Lê Thị Thu (Bán Hàng / CSKH)',
    email: 'sales@zns-order.vn',
    role: ROLES.SALES,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
  }
];

const PERMISSIONS = {
  [ROLES.ADMIN]: {
    viewRevenue: true,
    viewCostPrice: true,
    createOrder: true,
    deleteOrder: true,
    editPrice: true,
    manageInventory: true,
    packOrders: true,
    accessSettings: true,
    viewFullPII: true,
    manageBackups: true
  },
  [ROLES.WAREHOUSE]: {
    viewRevenue: false,       // KHÔNG xem doanh thu
    viewCostPrice: false,     // KHÔNG xem giá vốn / lãi lỗ
    createOrder: false,       // KHÔNG tạo đơn hàng mới
    deleteOrder: false,       // KHÔNG xóa đơn
    editPrice: false,         // KHÔNG sửa giá bán
    manageInventory: true,    // Được kiểm kho / nhập hàng
    packOrders: true,         // Được đóng gói & in tem nhãn
    accessSettings: false,    // KHÔNG vào cấu hình hệ thống
    viewFullPII: false,       // Bị ẩn PII (SĐT, Địa chỉ che sao)
    manageBackups: false
  },
  [ROLES.SALES]: {
    viewRevenue: true,        // Được xem doanh số đơn mình làm
    viewCostPrice: false,     // KHÔNG xem giá vốn
    createOrder: true,        // Được tạo đơn hàng
    deleteOrder: false,       // KHÔNG xóa đơn
    editPrice: false,         // Không tự ý sửa giá gốc
    manageInventory: false,   // Không sửa tồn kho trực tiếp
    packOrders: false,
    accessSettings: false,
    viewFullPII: true,        // Cần xem để liên hệ khách
    manageBackups: false
  }
};

/**
 * Che giấu thông tin định danh cá nhân (PII Masking)
 */
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length < 7) return '***';
  // Ví dụ: 0982801051 -> 0982***051
  return clean.substring(0, 4) + '***' + clean.substring(clean.length - 3);
}

function maskAddress(address) {
  if (!address || typeof address !== 'string') return '';
  const parts = address.split(',');
  if (parts.length <= 2) {
    return address.substring(0, Math.min(10, address.length)) + '... [Đã che bảo mật]';
  }
  // Giữ lại số nhà đầu tiên và quận/huyện cuối cùng, che phần giữa
  return `${parts[0].trim()}, ***, ${parts[parts.length - 1].trim()} [Đã che PII]`;
}

function maskCustomerPII(customerOrOrder, role) {
  if (role === ROLES.ADMIN || role === ROLES.SALES) {
    return customerOrOrder; // Không che giấu với Admin và Sales
  }

  // Nhân viên kho hoặc người không có quyền
  const copy = { ...customerOrOrder };
  if (copy.customerPhone) copy.customerPhone = maskPhoneNumber(copy.customerPhone);
  if (copy.phone) copy.phone = maskPhoneNumber(copy.phone);
  if (copy.customerAddress) copy.customerAddress = maskAddress(copy.customerAddress);
  if (copy.address) copy.address = maskAddress(copy.address);
  return copy;
}

module.exports = {
  ROLES,
  USERS,
  PERMISSIONS,
  maskPhoneNumber,
  maskAddress,
  maskCustomerPII
};
