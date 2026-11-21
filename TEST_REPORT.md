# Kết quả kiểm thử KHON168

## Đã chạy trên máy local

| Phép kiểm | Kết quả |
| --- | --- |
| `npm install` và `npm ci --include=optional` | Thành công với Node.js 24.15.0, npm 11.12.1, Windows x64. Kết quả audit khi cài sạch ghi nhận 0 lỗ hổng đã biết |
| `npm run build` | Qua kiểm tra cú pháp script Firebase, backend, tài nguyên web, schema layout và preview cho 6 khung |
| `npm test` | 29/29 bài kiểm thử qua |
| Catalog tĩnh đọc trực tiếp từ ZIP của Phong | Đưa riêng JSON cấu hình vào hook KHON168 chạy offline. Với 77 ID trong picker và 22 mục trong nhóm Photobooth, hook thêm 0. Khi bỏ riêng nhóm ở cả hai cách viết tên trường trong một bản sao, hook tạo lại nhóm chứa đúng 22 ID. Đây là phép thử trên dữ liệu tham chiếu |
| `npm run test:api` qua loopback | Qua health, config, catalog, preview và ghép 1, 2, 4 ảnh. Kích thước trả về khớp khung |
| Kiểm tra module Shadowrocket bằng fixture | Script-path dùng đúng nhánh. Module chạy trực tiếp forceGold.js. Fixture kiểm tra cập nhật nhóm, tính lặp lại, điều kiện bỏ qua, số đếm cục bộ và bảo toàn caption, Camera Roll, cấu hình khác |
| GET trên `https://khon-photobooth.onrender.com` | `/`, `/health`, `/api/photobooth/config` và `/api/photobooth/frames` trả HTTP 404. Chưa xác nhận ghép ảnh trên dịch vụ này |
| Chrome desktop, 1410 × 960 | Qua kiểm tra tệp không hỗ trợ, chỉnh điểm cắt, đổi sang giữ toàn bộ ảnh, xem trước và tải PNG |
| Chrome với kích thước hiển thị iPhone 13 | Qua thao tác chọn 2 và 4 ảnh, xem trước khi căn cắt, xuất và tải JPEG/WebP. Trang không tràn ngang trong cấu hình kiểm thử |
| `npm run evidence:locket` | Biểu mẫu trống báo thiếu bằng chứng. Test dùng mẫu tổng hợp để kiểm tra hai trường hợp xử lý trên thiết bị và qua API, gồm bước Đăng và giới hạn header |
| Đối chiếu Git | `js/header.js`, `js/locketfix.js` và `locket.module` trùng với `main` |

Bộ kiểm thử HTTP kiểm tra vị trí, thứ tự và kích thước đầu ra của sáu khung. Các bài khác kiểm tra PNG overlay, alpha đầu vào và đầu ra, bo góc, EXIF, JPEG nền trắng, WebP, chế độ giữ toàn bộ ảnh, ảnh hoặc input không hợp lệ, thiếu/thừa số ảnh, frame không tồn tại, giới hạn kích thước và số pixel, liên kết hết hạn, giới hạn bộ nhớ, xử lý đồng thời, giới hạn yêu cầu và upload quá hạn. Bài Custom Captions chạy phần gán cấu hình trên dữ liệu cục bộ để kiểm tra chữ tiếng Việt, emoji, thứ tự màu và loại caption.

## Cần chạy trên thiết bị hoặc dịch vụ

- **Safari iPhone.** Xác nhận trình chọn ảnh, thao tác kéo căn cắt, lưu từ bảng chia sẻ, và cách xử lý ảnh HEIC. Kiểm thử Chrome ở kích thước iPhone không bao gồm hành vi của Safari.
- **Locket.** Xác nhận menu Camera → Filter, chọn khung, chụp đủ ảnh và hiển thị bài sau khi Đăng. Kiểm tra gradient nhiều màu và việc nhập module bằng Shadowrocket trên iOS. [Quy trình kiểm thử Locket](LOCKET_IPHONE_TEST.md).
- **Render.** Xác nhận lại URL dịch vụ và `/health` trước khi thử ghép qua HTTPS. [Quy trình triển khai](RENDER_DEPLOY.md).

## Thay đổi cho kiểm thử Locket

| Tệp | Thay đổi |
| --- | --- |
| `locket-photobooth-test.module`, `js/forceGold.js` | Nhánh xử lý riêng cho menu camera và caption, mặc định dùng khi thiếu tên rule. Rule cũ `locket_rc` dùng lại cấu hình camera nhận được |
| `scripts/locket-caption-data.js`, `scripts/check-build.js`, `package.json` | Đọc nguồn caption để kiểm tra, kiểm tra cú pháp toàn bộ JS và cung cấp lệnh đối chiếu |
| `PHONG_REFERENCE.json`, `scripts/extract-phong-reference.js`, `test/phong-reference.test.js` | Trích xuất và kiểm tra catalog tham chiếu ở chế độ offline |
| `test/captions.test.js`, `test/locket-module.test.js` | Kiểm tra caption và fixture phản hồi chứa Filter/Camera Roll |
| `scripts/check-locket-evidence.js`, `test/fixtures/locket-evidence.template.json`, `test/locket-evidence.test.js` | Ghi nhận khung, số ảnh chụp, kết quả Đăng và yêu cầu hợp đồng riêng khi có API ghép |
| `README.md`, `FEATURE_MATRIX.md`, `LOCKET_IPHONE_TEST.md`, `TEST_REPORT.md` | URL module, phân tích luồng, hướng dẫn iOS và báo cáo |

## Tệp nền của backend độc lập

- **Sửa** `README.md`.
- **Cấu hình mới** `.env.example`, `.gitignore`, `package.json`, `package-lock.json` và `render.yaml`.
- **Backend mới trong `backend/`** `app.js`, `catalog.js`, `compose.js`, `config.js`, `errors.js`, `result-store.js` và `server.js`.
- **Khung và layout mới** Sáu cặp tệp mang tên `afterglow-grid`, `coastline`, `midnight-postcard`, `mint-strip`, `peach-sticker` và `rose-duet`. Mỗi cặp có một SVG trong `backend/frames/` và một JSON trong `backend/layouts/`.
- **Web mới trong `web/`** `index.html`, `studio.css`, `studio.js` và `favicon.png`.
- **Công cụ mới trong `scripts/`** `check-build.js`, `smoke-api.js` và `check-locket-evidence.js`.
- **Test và biểu mẫu mới trong `test/`** `captions.test.js`, `photobooth.test.js`, `locket-evidence.test.js` và `fixtures/locket-evidence.template.json`.
- **Tài liệu mới** `API_REFERENCE.md`, `FEATURE_MATRIX.md`, `LOCKET_IPHONE_TEST.md`, `PHOTObOOTH_GUIDE.md`, `RENDER_DEPLOY.md` và `TEST_REPORT.md`.

Mã SHA-256 của 238 caption thuộc 9 nhóm và danh sách loại động trùng bản `cf85d6b`. Kiểm thử Render lần này xác nhận lại `/health` trả HTTP 404. Bốn ảnh là ví dụ từ video của Phong. Chưa chạy bản KHON168 này trong Locket trên iPhone.
