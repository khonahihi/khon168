# Kết quả kiểm thử KHON168

## Đã chạy trên máy local

| Phép kiểm | Kết quả |
| --- | --- |
| `npm install` và `npm ci --include=optional` | Thành công với Node.js 24.15.0, npm 11.12.1, Windows x64. Kết quả audit khi cài sạch ghi nhận 0 lỗ hổng đã biết |
| `npm run build` | Qua kiểm tra cú pháp, tài nguyên web, schema layout, raster hóa và tạo preview cho 6 khung |
| `npm test` | 20/20 bài kiểm thử qua |
| `npm run test:api -- http://127.0.0.1:31868` | Qua health, config, catalog, preview và ghép 1, 2, 4 ảnh. Kích thước trả về khớp khung |
| Chrome desktop, 1410 × 960 | Qua kiểm tra tệp không hỗ trợ, chỉnh điểm cắt, đổi sang giữ toàn bộ ảnh, xem trước và tải PNG |
| Chrome với kích thước hiển thị iPhone 13 | Qua thao tác chọn 2 và 4 ảnh, xem trước khi căn cắt, xuất và tải JPEG/WebP. Trang không tràn ngang trong cấu hình kiểm thử |
| `npm run evidence:locket` | Biểu mẫu trống báo thiếu bằng chứng, mã thoát 2. Test riêng xác nhận hành vi với mẫu tổng hợp đủ trường, cấu hình đòi header xác thực và JSON hỏng |
| Đối chiếu Git | Các tệp `js/` và `locket.module` trùng với `main` |

Bộ kiểm thử HTTP kiểm tra vị trí, thứ tự và kích thước đầu ra của sáu khung. Các bài khác kiểm tra PNG overlay, alpha đầu vào và đầu ra, bo góc, EXIF, JPEG nền trắng, WebP, chế độ giữ toàn bộ ảnh, ảnh hoặc input không hợp lệ, thiếu/thừa số ảnh, frame không tồn tại, giới hạn kích thước và số pixel, liên kết hết hạn, giới hạn bộ nhớ, xử lý đồng thời, giới hạn yêu cầu và upload quá hạn. Bài Custom Captions chạy phần gán cấu hình trên dữ liệu cục bộ để kiểm tra chữ tiếng Việt, emoji, thứ tự màu và loại caption.

## Cần chạy trên thiết bị hoặc dịch vụ

- **Safari iPhone.** Xác nhận trình chọn ảnh, thao tác kéo căn cắt, lưu từ bảng chia sẻ, và cách xử lý ảnh HEIC. Kiểm thử Chrome ở kích thước iPhone không bao gồm hành vi của Safari.
- **Locket.** Xác nhận mục Photobooth xuất hiện, số ảnh mà client nhận, hợp đồng giao thức và việc ảnh kết quả hiện trong ứng dụng. Hiển thị gradient nhiều màu của Custom Captions cũng cần thử. [Quy trình kiểm thử Locket](LOCKET_IPHONE_TEST.md).
- **Render.** Sau khi triển khai, xác nhận build trên môi trường Render, `/health`, upload qua HTTPS và yêu cầu đầu tiên sau khi dịch vụ ngủ. [Quy trình triển khai](RENDER_DEPLOY.md).

## Tệp bàn giao

- **Sửa** `README.md`.
- **Cấu hình mới** `.env.example`, `.gitignore`, `package.json`, `package-lock.json` và `render.yaml`.
- **Backend mới trong `backend/`** `app.js`, `catalog.js`, `compose.js`, `config.js`, `errors.js`, `result-store.js` và `server.js`.
- **Khung và layout mới** Sáu cặp tệp mang tên `afterglow-grid`, `coastline`, `midnight-postcard`, `mint-strip`, `peach-sticker` và `rose-duet`. Mỗi cặp có một SVG trong `backend/frames/` và một JSON trong `backend/layouts/`.
- **Web mới trong `web/`** `index.html`, `studio.css`, `studio.js` và `favicon.png`.
- **Công cụ mới trong `scripts/`** `check-build.js`, `smoke-api.js` và `check-locket-evidence.js`.
- **Test và biểu mẫu mới trong `test/`** `captions.test.js`, `photobooth.test.js`, `locket-evidence.test.js` và `fixtures/locket-evidence.template.json`.
- **Tài liệu mới** `API_REFERENCE.md`, `FEATURE_MATRIX.md`, `LOCKET_IPHONE_TEST.md`, `PHOTObOOTH_GUIDE.md`, `RENDER_DEPLOY.md` và `TEST_REPORT.md`.
