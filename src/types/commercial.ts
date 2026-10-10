export interface ApiKeyRecord {
  id: string;
  userId?: string;
  name: string;
  key: string; // e.g. apizz_live_...
  credits: number;
  totalUsed: number;
  tier: "free" | "starter" | "pro" | "reseller";
  createdAt: string;
  isActive: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceVnd: number;
  priceUsd: number;
  credits: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "trial",
    name: "Dùng thử miễn phí",
    priceVnd: 0,
    priceUsd: 0,
    credits: 5,
    description: "Trải nghiệm hệ thống kiểm thử tự động hộp đen.",
    features: [
      "5 lượt quét API chuyên sâu",
      "Đầy đủ 12 đầu dò kiểm tra",
      "Báo cáo chi tiết định dạng JSON",
      "Giới hạn 1 request / 5 giây",
    ],
  },
  {
    id: "starter",
    name: "Gói Cơ Bản (Starter)",
    priceVnd: 50000,
    priceUsd: 2,
    credits: 100,
    description: "Dành cho cá nhân kiểm tra các nguồn proxy API mua lẻ.",
    features: [
      "100 lượt quét API đầy đủ",
      "Kiểm toán gian lận Token chuẩn",
      "API RESTful tích hợp tự động",
      "Hỗ trợ xuất báo cáo PDF/JSON",
    ],
    recommended: true,
  },
  {
    id: "pro",
    name: "Gói Chuyên Nghiệp (Pro)",
    priceVnd: 200000,
    priceUsd: 8,
    credits: 500,
    description: "Dành cho nhóm dev & doanh nghiệp tích hợp CI/CD audit API.",
    features: [
      "500 lượt quét API không giới hạn tốc độ",
      "Tự động phát hiện đánh tráo mô hình",
      "Tích hợp Webhook & Telegram Bot alert",
      "Hỗ trợ kỹ thuật ưu tiên 24/7",
    ],
  },
  {
    id: "reseller",
    name: "Gói Trạm Relay (Enterprise)",
    priceVnd: 500000,
    priceUsd: 20,
    credits: 2000,
    description: "Dành cho các chủ trạm OneAPI / NewAPI kiểm duyệt nguồn upstream.",
    features: [
      "2,000 lượt quét chuyên sâu",
      "Cấp chứng chỉ API Xác thực (Badge)",
      "Định giá thị trường theo thời gian thực",
      "Custom domain & White-label report",
    ],
  },
];
