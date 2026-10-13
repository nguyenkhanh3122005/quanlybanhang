/**
 * ==============================================================================
 * ZNS ORDER MASTER PRO - STANDALONE ALL-IN-ONE RUNNER (SINGLE FILE EDITION)
 * ==============================================================================
 * File khởi động độc lập tất-cả-trong-một:
 * - Tự động định vị thư mục zns-oms và nạp các module lõi
 * - Tự động thiết lập lắng nghe 0.0.0.0 trên cổng 3500
 * - Hiển thị địa chỉ truy cập tức thì cho cả Laptop và Điện thoại (Wi-Fi)
 * - Chạy trực tiếp chỉ bằng 1 dòng lệnh:
 *     node ZNS-OMS-Standalone.js
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Đường dẫn thư mục mã nguồn
const OMS_DIR = fs.existsSync(path.join(__dirname, 'server.js')) 
  ? __dirname 
  : path.join(__dirname, 'zns-oms');

if (!fs.existsSync(OMS_DIR) || !fs.existsSync(path.join(OMS_DIR, 'server.js'))) {
  console.error('[LỖI] Không tìm thấy file server.js!');
  console.error('Đường dẫn kiểm tra:', OMS_DIR);
  process.exit(1);
}

// Bổ sung node_modules của zns-oms vào Module search path nếu chạy từ thư mục gốc
const omsNodeModules = path.join(OMS_DIR, 'node_modules');
if (fs.existsSync(omsNodeModules)) {
  module.paths.unshift(omsNodeModules);
}

// Tự động tìm IP mạng nội bộ (Ưu tiên card Wi-Fi thật)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!name.toLowerCase().includes('virtual') &&
            !name.toLowerCase().includes('vbox') &&
            !name.toLowerCase().includes('vmware') &&
            !name.toLowerCase().includes('loopback')) {
          candidates.push({ name, address: iface.address });
        }
      }
    }
  }
  const wifi = candidates.find(c => c.address.startsWith('192.168.1.') || c.name.toLowerCase().includes('wi-fi') || c.name.toLowerCase().includes('wlan'));
  if (wifi) return wifi.address;
  return candidates[0] ? candidates[0].address : '127.0.0.1';
}

console.log('====================================================================');
console.log('   ZNS ORDER MASTER PRO - NỀN TẢNG QUẢN LÝ ĐƠN HÀNG DOANH NGHIỆP    ');
console.log('   (Bản chạy độc lập Single-File Runner - All-in-One Edition)       ');
console.log('====================================================================');
console.log('Đang khởi chạy hệ thống Web Server...');

// Đổi thư mục làm việc về zns-oms và kích hoạt server.js
process.chdir(OMS_DIR);
require(path.join(OMS_DIR, 'server.js'));

const localIP = getLocalIP();
const PORT = process.env.PORT || 3500;

setTimeout(() => {
  console.log('\n====================================================================');
  console.log('✅ HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG TRÊN CẢ LAPTOP VÀ ĐIỆN THOẠI:');
  console.log('--------------------------------------------------------------------');
  console.log(`💻 Xem trên Laptop / PC:     http://localhost:${PORT}`);
  console.log(`📱 Xem trên Điện thoại (Wi-Fi): http://${localIP}:${PORT}`);
  console.log('====================================================================');
  console.log('Nhấn tổ hợp phím [Ctrl + C] để dừng Server khi kết thúc ca làm việc.\n');
}, 500);
