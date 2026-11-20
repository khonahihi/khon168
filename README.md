# KHON168 Photobooth

KHON168 ghép 1, 2 hoặc 4 ảnh với sáu mẫu khung. Trang web cho phép xem trước, chỉnh vị trí cắt từng ảnh và xuất PNG, JPEG hoặc WebP. Một dịch vụ Node.js, Express và Sharp phục vụ cả giao diện lẫn API.

## Chạy trong VS Code

Dùng Node.js 24. Mở thư mục `khon168` bằng **File → Open Folder**, chọn **Terminal → New Terminal** và chạy trên Windows.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Mở [Photobooth](http://localhost:3000) hoặc [health check](http://localhost:3000/health). Trên macOS/Linux, dùng `npm` thay cho `npm.cmd`. Có thể sao chép `.env.example` thành `.env` để đặt cổng và giới hạn ảnh. `npm run dev` tự khởi động lại server khi sửa các tệp JavaScript đã nạp.

## Dùng trên iPhone

Mở địa chỉ HTTPS của dịch vụ trong Safari, chọn số ảnh, chọn khung rồi tải ảnh theo thứ tự ô. Dùng **Chỉnh khung cắt**, **Tạo ảnh** và **Tải ảnh**. Nếu có **Chia sẻ → Lưu hình ảnh**, bạn có thể lưu thẳng vào Ảnh. [Hướng dẫn Photobooth](PHOTObOOTH_GUIDE.md).

## Thêm khung, kiểm thử và triển khai

- Thêm JSON vào `backend/layouts/` và đặt khung SVG hoặc PNG có alpha vào `backend/frames/`. Chạy `npm run build` để kiểm tra và khởi động lại để nạp khung. [Cấu trúc layout](PHOTObOOTH_GUIDE.md#thêm-khung).
- Chạy `npm test` để kiểm thử tự động. Khi server đang chạy, dùng `npm run test:api -- http://localhost:3000`. [API và lệnh curl](API_REFERENCE.md) · [Kết quả kiểm thử](TEST_REPORT.md).
- `render.yaml` khai báo một Node Web Service gói Free. Render cấp URL HTTPS và truyền `PORT` cho dịch vụ lắng nghe trên `0.0.0.0`. [Triển khai từ GitHub lên Render](RENDER_DEPLOY.md).

## Module Locket hiện hữu

Module Shadowrocket và các script cũ của Khon dựa trên nguồn của **NightmarketServer** và **Đinh Duy Vinh**. Custom Captions hiện ghi dữ liệu vào Firebase Remote Config trên thiết bị, với cấu hình gradient tĩnh 2 màu trở lên. Việc tích hợp Photobooth vào Locket cần hợp đồng API đã xác minh. Các tệp tham chiếu cung cấp tên endpoint và mã phía client. [Phân tích cấu hình và mức tương thích](FEATURE_MATRIX.md).

Chạy `npm run evidence:locket` để xem phần thông tin còn thiếu. Dùng biểu mẫu để ghi kết quả trên thiết bị khi kiểm thử Photobooth trong Locket. [Kiểm thử Locket trên iPhone](LOCKET_IPHONE_TEST.md).
