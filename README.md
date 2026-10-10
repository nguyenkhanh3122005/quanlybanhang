# CCTest.AI - Nền tảng Phát hiện & Đánh giá API Claude Độc lập

Hệ thống mã nguồn mở phát hiện gian lận API Claude, kiểm toán token và xác minh độ nguyên bản của các bên trung gian (API Proxy / Relay Station / OneAPI / NewAPI).

![Giao diện CCTest.AI](https://raw.githubusercontent.com/user/repo/main/preview.png)

## 🎯 Mục đích & Vấn đề giải quyết

Trong thị trường mua bán API AI trung gian, nhiều bên bán sử dụng các chiêu trò trục lợi:
1. **Đánh tráo mô hình (Model Downgrading):** Khai bán `Claude 3.5 Sonnet` hoặc `Claude 3 Opus` nhưng ngầm chuyển hướng tới mô hình rẻ tiền hơn như `GPT-4o-mini`, `Qwen 2.5`, hoặc `Claude 3 Haiku`.
2. **Khai khống Token (Token Inflation):** Nhân hệ số token lên từ 1.2x đến 2.5x để trừ thêm tiền của khách hàng.
3. **Sử dụng Reverse-Proxy lậu (Web Session Cookie):** Không phải API Console chính thức của Anthropic, dẫn tới mất tính năng Extended Thinking, không hỗ trợ Tool Calling, không hỗ trợ Streaming SSE native, hoặc can thiệp lọc bỏ câu trả lời.

Hệ thống này cung cấp **12 đầu dò kiểm tra Hộp đen (Black-box Probes)** để bóc trần toàn bộ các gian lận trên chỉ trong 10-15 giây.

---

## 🛠️ 12 Đầu dò Kiểm tra Chuyên sâu

1. **Dấu vân tay LLM (LLM Fingerprint):** Đo đạc phản xạ xác suất, token boundary và phong cách văn phong đặc thù của dòng Claude.
2. **Cấu trúc phi luồng (Non-streaming Structure):** Xác thực schema JSON chuẩn `v1/messages` (id msg_*, type message, role assistant, usage).
3. **Phân tích chữ ký (Thinking Signature):** Kiểm tra tính năng Extended Thinking (Claude 3.7 Sonnet), thẻ chữ ký mã hóa và token budget.
4. **Sử dụng dụng cụ (Tool Use):** Kiểm tra khả năng native function calling của Claude.
5. **Ghi nhận mô hình (Model Identity):** Thử thách mức độ tuân thủ System Prompt bí mật và câu hỏi bẫy định danh.
6. **Nhận diện hình ảnh (Vision / Multimodal):** Gửi ảnh base64 kiểm tra khả năng xử lý hình ảnh thật sự.
7. **Cấu trúc luồng (Streaming SSE):** Kiểm tra chuỗi sự kiện `message_start` -> `content_block_delta` -> `message_stop` và đo độ trễ TTFT.
8. **Tìm kiếm trên web (Web Search):** Kiểm tra trích dẫn và grounding web.
9. **Đầu ra có cấu trúc (Structured Output):** Kiểm tra khả năng sinh JSON nghiêm ngặt tuân thủ schema.
10. **Ngưỡng kiến thức (Knowledge Cutoff):** Kiểm tra mốc dữ liệu huấn luyện để phát hiện đúng thế hệ mô hình.
11. **Nhận dạng tài liệu (Document Support):** Kiểm tra xử lý tệp PDF qua Claude Document Block.
12. **Kiểm toán sử dụng token (Token Usage Audit):** So sánh token proxy báo cáo với API `/v1/messages/count_tokens` để phát hiện độn cước.

---

## 🚀 Hướng dẫn Chạy Dự án

### Yêu cầu:
- Node.js >= 18.0.0
- npm hoặc yarn / pnpm

### Cài đặt và Chạy:

```bash
# 1. Cài đặt các gói phụ thuộc (nếu chưa cài)
npm install

# 2. Khởi động môi trường phát triển (Development)
npm run dev
```

Mở trình duyệt tại: **`http://localhost:3000`**

### Chạy Bản Production:

```bash
npm run build
npm run start
```

---

## 💳 Hệ thống Thương mại & Bán API (Commercial API & Billing)

Hệ thống hỗ trợ bán dịch vụ kiểm thử API (Detection-as-a-Service) cho bên thứ ba (các chủ trạm OneAPI, NewAPI, bot giám sát tự động):

### 1. Bảng giá Gói cước (Pricing Plans):
- **Dùng thử miễn phí:** 5 lượt quét
- **Gói Cơ bản (Starter):** 50.000 VNĐ / 100 credits
- **Gói Chuyên nghiệp (Pro):** 200.000 VNĐ / 500 credits
- **Gói Trạm Relay (Enterprise):** 500.000 VNĐ / 2,000 credits

### 2. Tích hợp Thanh toán VietQR:
- Tự động sinh mã VietQR động theo đơn hàng với nội dung chuyển khoản định danh `CCTEST <KEY_ID>`.
- Khách hàng quét mã bằng ứng dụng ngân hàng, hệ thống cộng credits tự động.

### 3. API Dành cho Khách hàng tích hợp:
- **Endpoint:** `POST /api/v1/detect`
- **Header:** `Authorization: Bearer <CCTEST_API_KEY>`
- **Request Body:**
```json
{
  "apiKey": "sk-ant-target-to-test",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-3-7-sonnet-20250219"
}
```
- **Response:**
```json
{
  "success": true,
  "creditsRemaining": 99,
  "creditsUsedTotal": 1,
  "report": {
    "overallScore": 91,
    "confidenceLevel": "medium",
    "verdictTitle": "Xác minh là Claude với độ tin cậy trung bình",
    "probes": { ... }
  }
}
```
