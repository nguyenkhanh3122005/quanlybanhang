# ZNS Order Master Pro - Enterprise Order Management System (OMS)

> **Hệ thống Quản trị Đơn hàng & Vận hành Thương mại Điện tử Đa kênh Chuyên nghiệp** đáp ứng đầy đủ 5 trụ cột khắt khe nhất trong vận hành bán lẻ và thương mại hóa: **Tính toàn vẹn dữ liệu qua Database Transactions & Optimistic Locking**, **Máy trạng thái đơn hàng nghiêm ngặt (Strict Order State Machine)**, **Phân quyền RBAC 3 cấp độ & Che dấu dữ liệu cá nhân (PII Masking)**, **Tích hợp Logistics APIs & Cổng thanh toán VietQR Webhook**, **Hàng đợi tác vụ ngầm (Background Job Queue)** và **Sao lưu CSDL tự động (Automated Backups & Disaster Recovery)**.

---

## 🏛️ 5 Trụ Cột Vận Hành Thực Tế & Thương Mại Hóa

### 1. Nghiệp vụ cốt lõi & Tính toàn vẹn dữ liệu (Transactions & Concurrency)
- **Database Transactions nguyên tử (`db.runTransaction`):** Đảm bảo cơ chế `BEGIN TRANSACTION ... COMMIT / ROLLBACK`. Khi tạo đơn hoặc hủy đơn, nếu có lỗi phát sinh giữa chừng (ví dụ: trừ kho lỗi, khách hàng thiếu thông tin), toàn bộ dữ liệu lập tức ROLLBACK về trạng thái nguyên vẹn, chống thất thoát hàng hóa và sai lệch số sách.
- **Xử lý đồng thời & Chống bán âm kho (Optimistic Concurrency Control):** Mỗi mặt hàng được gắn thẻ phiên bản `version` tăng dần. Khi nhiều người cùng đặt 1 sản phẩm chỉ còn tồn 1 chiếc, giao dịch thứ hai sẽ bị từ chối do xung đột phiên bản, bảo vệ tồn kho tuyệt đối.
- **Máy trạng thái đơn hàng nghiêm ngặt (`OrderStateMachine`):**
  - Ma trận chuyển trạng thái hợp lệ: `pending` $\rightarrow$ `processing` $\rightarrow$ `shipping` $\rightarrow$ `completed` / `cancelled`.
  - Nghiêm cấm mọi bước nhảy trạng thái phi logic (ví dụ: đã hủy hoặc đã hoàn thành thì không thể tự ý chuyển sang đang giao).
  - Tự động bù hoàn tồn kho vào kho hàng ngay khi đơn hàng chuyển sang `cancelled`.
- **Nhật ký kiểm toán chi tiết (`AuditService`):** Lưu trữ toàn bộ lịch sử: Ai là người sửa (User, Role, IP), sửa cái gì, thời gian nào, giá trị cũ/mới (Diff cũ $\rightarrow$ mới) và lý do thay đổi để đối soát khiếu nại.

### 2. An toàn thông tin & Phân quyền (Security & RBAC)
- **Phân quyền 3 vai trò (Role-Based Access Control):**
  - 👑 **Admin / Chủ shop:** Toàn quyền xem doanh thu, lãi lỗ, cấu hình giá, nhân viên, tạo backup, xóa đơn.
  - 📦 **Nhân viên Đóng gói / Kho (`warehouse`):** Chỉ xem danh sách sản phẩm, số lượng cần nhặt, in phiếu đóng hàng & tem nhãn; **ẨN toàn bộ doanh thu, ẩn giá vốn, ẩn cấu hình hệ thống**.
  - 💼 **Nhân viên CSKH / Bán hàng (`sales`):** Xem và tạo đơn, xem thông tin khách; không được xóa đơn hoặc sửa giá gốc nếu chưa duyệt.
- **Bảo vệ dữ liệu cá nhân (PII Data Masking):** Số điện thoại và địa chỉ khách hàng được tự động che sao (ví dụ: `0982***051`, `151 An Lạc, ***, Hà Nội`) đối với nhân viên kho. Có nút *"Mở khóa PII"* với yêu cầu nhập lý do và được ghi nhận vào Audit Log.
- **Sao lưu tự động & Điểm khôi phục (Automated Backups):**
  - Tự động sao lưu Snapshot CSDL định kỳ mỗi 12 giờ.
  - Hỗ trợ tạo bản sao lưu thủ công trước khi xuất hàng lớn.
  - Khôi phục CSDL 1-click có cơ chế Safety Checkpoint an toàn.

### 3. Tích hợp bên thứ ba (Third-party Integrations)
- **Hub Đối tác Vận chuyển (GHN, GHTK, Viettel Post):**
  - Tự động đẩy đơn sang bưu cục và lấy mã vận đơn (Tracking Code), mã phân loại (Sorting Code) phục vụ in tem dán.
  - **Webhook Tiếp Nhận Trạng Thái (`/api/webhooks/shipping`):** Tự động đồng bộ khi bưu tá quét hàng (Lấy hàng $\rightarrow$ Đang phát $\rightarrow$ Giao thành công $\rightarrow$ Chuyển hoàn).
  - Trình giả lập Webhook bưu tá trực quan trên giao diện để kiểm thử kịch bản giao nhận realtime.
- **Cổng thanh toán & Đối soát tiền (Payment / Reconciliation):**
  - **Webhook Tự Động Khớp Chuyển Khoản (`/api/webhooks/payment`):** Nhận Webhook ngân hàng/VietQR/PayOS, tự động trích xuất mã đơn `DH-...` từ nội dung chuyển khoản, kiểm tra số tiền và đổi trạng thái đơn sang **"Đã thanh toán" (Paid)**, đồng thời kích hoạt tin ZNS báo khách.
  - Bảng đối soát công nợ COD: Theo dõi tiền COD shipper đang giữ, tiền hàng đang lưu thông, và doanh thu chuyển khoản đã vào tài khoản.

### 4. Báo cáo & Xuất nhập dữ liệu (Exporting & Printing)
- **In ấn 4 định dạng chuyên dụng:**
  - 📄 **Khổ A4:** Phiếu xuất kho kiêm giao hàng chuẩn doanh nghiệp kèm mã vạch Code128.
  - 🏷️ **Khổ A6:** Tem nhãn nhiệt dán bọc hàng (Shipping Label) 100x150mm theo chuẩn máy in nhiệt bưu cục, có barcode và tiền COD to rõ.
  - 📋 **Khổ A5:** Phiếu nhặt hàng kho (Packing Slip) có ô tích chọn cho nhân viên đi lấy hàng trong kho.
  - 🧾 **Khổ K80:** Hóa đơn nhiệt cuộn 80mm cho máy in bill POS tại quầy.
- **Import / Export CSV:**
  - Hỗ trợ Import danh sách sản phẩm hàng loạt từ file CSV/Excel.
  - Hỗ trợ xuất dữ liệu báo cáo đơn hàng dạng CSV phục vụ kế toán.

### 5. Hạ tầng máy chủ & Giám sát thực tế (Production Infrastructure)
- **Hàng đợi tác vụ ngầm (Background Job Queue):** Các tác vụ nặng (xuất báo cáo lớn, gửi tin ZNS hàng loạt, đẩy đơn bưu cục hàng loạt) được đưa vào hàng đợi xử lý bất đồng bộ trong nền, hiển thị tiến độ % và không làm đơ giao diện người dùng (Zero UI freeze).
- **Giám sát Sức khỏe & Lỗi hệ thống (System Monitor & Sentry Logger):** Theo dõi Uptime, dung lượng RAM Heap, trạng thái hàng đợi và ghi nhận mọi Exception logic đơn hàng.

---

## 🚀 Khởi Chạy Nhanh

Double-click vào tệp:
👉 **`CHAY-QUAN-LY-DON-HANG.bat`** (hoặc `CHAY-ZNS-OMS.bat`)

Truy cập: **`http://localhost:3500`**
