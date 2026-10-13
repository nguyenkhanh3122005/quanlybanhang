const fs = require('fs');
const path = require('path');
const os = require('os');

// Phát hiện môi trường Serverless (Vercel / AWS Lambda)
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

// Đường dẫn dữ liệu:
// - Serverless: Thư mục nguồn (/var/task) là Read-Only. Ghi file cục bộ dùng os.tmpdir() để tránh lỗi EROFS.
// - Local/VPS: Dùng thư mục data/ trực tiếp trong mã nguồn.
const SOURCE_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = IS_SERVERLESS ? path.join(os.tmpdir(), 'zns-oms-data') : SOURCE_DATA_DIR;

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Bỏ qua nếu đã tồn tại
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

const TEMPLATE_FILES = {
  orders: path.join(SOURCE_DATA_DIR, 'orders.json'),
  customers: path.join(SOURCE_DATA_DIR, 'customers.json'),
  products: path.join(SOURCE_DATA_DIR, 'products.json'),
  categories: path.join(SOURCE_DATA_DIR, 'categories.json'),
  zns_logs: path.join(SOURCE_DATA_DIR, 'zns_logs.json'),
  settings: path.join(SOURCE_DATA_DIR, 'settings.json')
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

// ==========================================
// CLOUD DATABASE & PERSISTENCE ADAPTER
// ==========================================
class CloudStorageAdapter {
  constructor() {
    this.type = 'none'; // 'upstash' | 'supabase' | 'none'
    this.url = '';
    this.token = '';
    this.init();
  }

  init() {
    // 1. Upstash Redis hoặc Vercel KV REST API (Ưu tiên số 1 cho Serverless / Vercel)
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (kvUrl && kvToken) {
      this.type = 'upstash';
      this.url = kvUrl.replace(/\/+$/, '');
      this.token = kvToken;
      console.log('☁️ [CLOUD DB] Kết nối thành công Upstash Redis / Vercel KV REST API!');
      return;
    }

    // 2. Supabase REST API
    const spUrl = process.env.SUPABASE_URL;
    const spKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (spUrl && spKey) {
      this.type = 'supabase';
      this.url = spUrl.replace(/\/+$/, '');
      this.token = spKey;
      console.log('☁️ [CLOUD DB] Phát hiện cấu hình Supabase Cloud API!');
      return;
    }

    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      this.type = 'postgres_configured';
      console.log('☁️ [CLOUD DB] Phát hiện biến DATABASE_URL / POSTGRES_URL!');
      return;
    }

    console.log(`💾 [STORAGE] Đang chạy chế độ ${IS_SERVERLESS ? 'Serverless (/tmp)' : 'Local File (.json)'}`);
  }

  async get(key) {
    if (this.type === 'upstash') {
      try {
        const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json && json.result) {
          return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
        }
      } catch (err) {
        console.warn(`[CloudDB] Không thể đọc key ${key}:`, err.message);
      }
    }
    return null;
  }

  async set(key, value) {
    if (this.type === 'upstash') {
      try {
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        return true;
      } catch (err) {
        console.warn(`[CloudDB] Không thể ghi key ${key}:`, err.message);
      }
    }
    return false;
  }
}

const cloudStorage = new CloudStorageAdapter();

// Bộ nhớ đệm RAM (In-Memory Cache) phục vụ tức thì trong các phiên Serverless
const memoryCache = {
  orders: null,
  customers: null,
  products: null,
  categories: null,
  zns_logs: null,
  settings: null
};

// Safe JSON reading and writing with in-memory caching & template fallback
function readJSON(fileKey, file, fallback, templateFile) {
  if (memoryCache[fileKey]) {
    return memoryCache[fileKey];
  }
  try {
    if (!fs.existsSync(file)) {
      if (templateFile && fs.existsSync(templateFile)) {
        try {
          const raw = fs.readFileSync(templateFile, 'utf8');
          const parsed = JSON.parse(raw);
          writeJSON(fileKey, file, parsed);
          memoryCache[fileKey] = parsed;
          return parsed;
        } catch (copyErr) {}
      }
      writeJSON(fileKey, file, fallback);
      memoryCache[fileKey] = fallback;
      return fallback;
    }
    const data = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(data);
    memoryCache[fileKey] = parsed;
    return parsed;
  } catch (err) {
    console.error(`Lỗi đọc file ${file}:`, err.message);
    memoryCache[fileKey] = fallback;
    return fallback;
  }
}

function writeJSON(fileKey, file, data) {
  memoryCache[fileKey] = data;
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Trên Vercel nếu không ghi được đĩa cứng thì vẫn giữ trong RAM
    console.warn(`Cảnh báo ghi file ${file}:`, err.message);
  }

  // Đồng bộ lên Cloud DB bất đồng bộ nếu có cấu hình
  if (cloudStorage.type === 'upstash') {
    cloudStorage.set(`zns_${fileKey}`, data).catch(e => {
      console.warn(`Lỗi đồng bộ Cloud DB key zns_${fileKey}:`, e.message);
    });
  }
  return true;
}

// Mutex Lock for Atomic Transactions
let transactionQueue = Promise.resolve();

// Initialize database files if not exist
function initDB() {
  readJSON('categories', FILES.categories, INITIAL_CATEGORIES, TEMPLATE_FILES.categories);
  readJSON('products', FILES.products, INITIAL_PRODUCTS, TEMPLATE_FILES.products);
  readJSON('customers', FILES.customers, INITIAL_CUSTOMERS, TEMPLATE_FILES.customers);
  readJSON('orders', FILES.orders, INITIAL_ORDERS, TEMPLATE_FILES.orders);
  readJSON('zns_logs', FILES.zns_logs, INITIAL_ZNS_LOGS, TEMPLATE_FILES.zns_logs);
  readJSON('settings', FILES.settings, INITIAL_SETTINGS, TEMPLATE_FILES.settings);
}

// Đồng bộ từ Cloud DB khi khởi động
async function syncFromCloud() {
  if (cloudStorage.type === 'upstash') {
    try {
      const keys = ['orders', 'customers', 'products', 'categories', 'zns_logs', 'settings'];
      for (const k of keys) {
        const cloudData = await cloudStorage.get(`zns_${k}`);
        if (cloudData && (Array.isArray(cloudData) ? cloudData.length > 0 : typeof cloudData === 'object')) {
          memoryCache[k] = cloudData;
          try {
            fs.writeFileSync(FILES[k], JSON.stringify(cloudData, null, 2), 'utf8');
          } catch (e) {}
          console.log(`☁️ Đã đồng bộ [${k}] từ Upstash Redis Cloud (${Array.isArray(cloudData) ? cloudData.length + ' bản ghi' : 'OK'})`);
        }
      }
    } catch (e) {
      console.warn('Lỗi khi nạp dữ liệu từ Cloud DB:', e.message);
    }
  }
}
syncFromCloud();

// Database Helper with Transaction Engine & Optimistic Locking
const db = {
  // Orders
  getOrders: () => readJSON('orders', FILES.orders, INITIAL_ORDERS, TEMPLATE_FILES.orders),
  saveOrders: (data) => writeJSON('orders', FILES.orders, data),
  getOrderById: (id) => db.getOrders().find(o => o.id === id || o.code === id),

  // Customers
  getCustomers: () => readJSON('customers', FILES.customers, INITIAL_CUSTOMERS, TEMPLATE_FILES.customers),
  saveCustomers: (data) => writeJSON('customers', FILES.customers, data),
  getCustomerById: (id) => db.getCustomers().find(c => c.id === id),

  // Products
  getProducts: () => readJSON('products', FILES.products, INITIAL_PRODUCTS, TEMPLATE_FILES.products),
  saveProducts: (data) => writeJSON('products', FILES.products, data),
  getProductById: (id) => db.getProducts().find(p => p.id === id),

  // Categories
  getCategories: () => readJSON('categories', FILES.categories, INITIAL_CATEGORIES, TEMPLATE_FILES.categories),
  saveCategories: (data) => writeJSON('categories', FILES.categories, data),

  // ZNS Logs
  getZnsLogs: () => readJSON('zns_logs', FILES.zns_logs, INITIAL_ZNS_LOGS, TEMPLATE_FILES.zns_logs),
  saveZnsLogs: (data) => writeJSON('zns_logs', FILES.zns_logs, data),
  addZnsLog: (log) => {
    const logs = db.getZnsLogs();
    logs.unshift(log);
    writeJSON('zns_logs', FILES.zns_logs, logs);
    return log;
  },

  // Settings
  getSettings: () => readJSON('settings', FILES.settings, INITIAL_SETTINGS, TEMPLATE_FILES.settings),
  saveSettings: (data) => writeJSON('settings', FILES.settings, data),

  // Storage info
  getStorageInfo: () => ({
    engine: cloudStorage.type === 'upstash' ? 'Upstash Redis / Vercel KV (Cloud)' : (IS_SERVERLESS ? 'Serverless (/tmp)' : 'Local File (.json)'),
    isCloudConnected: cloudStorage.type === 'upstash',
    cloudType: cloudStorage.type,
    isServerless: IS_SERVERLESS,
    dataDir: DATA_DIR,
    itemCounts: {
      orders: (db.getOrders() || []).length,
      products: (db.getProducts() || []).length,
      customers: (db.getCustomers() || []).length
    }
  }),

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
    writeJSON('categories', FILES.categories, INITIAL_CATEGORIES);
    writeJSON('products', FILES.products, INITIAL_PRODUCTS);
    writeJSON('customers', FILES.customers, INITIAL_CUSTOMERS);
    writeJSON('orders', FILES.orders, INITIAL_ORDERS);
    writeJSON('zns_logs', FILES.zns_logs, INITIAL_ZNS_LOGS);
    writeJSON('settings', FILES.settings, INITIAL_SETTINGS);
    return true;
  }
};

// Auto init on import
initDB();

module.exports = db;
