# KHON168 Photobooth

Mục tiêu tích hợp là mở Photobooth từ **Camera → Filter** của Locket iOS, chọn khung, chụp đủ ảnh và đăng trong ứng dụng. Luồng này đang chờ xác minh. Backend Node.js, Express và Sharp hiện ghép 1, 2 hoặc 4 ảnh với sáu mẫu khung để kiểm thử độc lập.

## Module Shadowrocket thử nghiệm

Module gọi trực tiếp `js/forceGold.js` trên nhánh tính năng. Khi phản hồi Firebase có cả metadata khung Photobooth và ID tương ứng trong bộ chọn camera, script nhóm các ID đó vào **Photobooth 📸**. Bộ chọn thiếu dữ liệu thì giữ nguyên. Locket tiếp tục quản lý camera và thao tác gửi. Bản thử nghiệm chưa đăng ký được sáu khung KHON168 vào Locket.

1. Sau khi bản cập nhật được push, mở **Shadowrocket → Cấu hình → Mô-đun → +**, nhập URL raw và kiểm tra tên **KHON168 Photobooth Test (Camera → Filter)**. [URL module trên nhánh tính năng](https://raw.githubusercontent.com/khonahihi/khon168/refs/heads/feature/khon168-photobooth/locket-photobooth-test.module).
2. Ghi lại danh sách **Camera → Filter** khi module tắt. Bật riêng module mới, mở lại camera và so sánh. Khi Firebase có cập nhật, nhật ký script in một dòng `KHON168 Filter` có số khung đủ điều kiện và số ID được thêm vào nhóm.
3. Nếu có khung, thử chụp hai vật khác nhau, quan sát các ô chờ, chụp tiếp và kiểm tra bài đã gửi tới người nhận thử. Ghi riêng phiên bản Locket và bước đạt trên iPhone. [Hướng dẫn và cách đọc nhật ký](LOCKET_IPHONE_TEST.md).

Custom Captions tiếp tục dùng dữ liệu gốc của KHON168, dựa trên nguồn của NightmarketServer và Đinh Duy Vinh. [Đối chiếu ảnh và mã Phong](FEATURE_MATRIX.md#bằng-chứng-về-photobooth-trong-locket).

## Chạy trong VS Code

Dùng Node.js 24. Mở thư mục `khon168` bằng **File → Open Folder**, chọn **Terminal → New Terminal** và chạy trên Windows.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Mở [Photobooth](http://localhost:3000) hoặc [health check](http://localhost:3000/health). Trên macOS/Linux, dùng `npm` thay cho `npm.cmd`. Có thể sao chép `.env.example` thành `.env` để đặt cổng và giới hạn ảnh. `npm run dev` tự khởi động lại server khi sửa các tệp JavaScript đã nạp.

## Kiểm thử backend độc lập trên iPhone

Mở địa chỉ HTTPS của dịch vụ trong Safari, chọn số ảnh, chọn khung rồi tải ảnh theo thứ tự ô. Dùng **Chỉnh khung cắt**, **Tạo ảnh** và **Tải ảnh**. Nếu có **Chia sẻ → Lưu hình ảnh**, bạn có thể lưu thẳng vào Ảnh. [Hướng dẫn Photobooth](PHOTObOOTH_GUIDE.md).

## Thêm khung, kiểm thử và triển khai

- Thêm JSON vào `backend/layouts/` và đặt khung SVG hoặc PNG có alpha vào `backend/frames/`. Chạy `npm run build` để kiểm tra và khởi động lại để nạp khung. [Cấu trúc layout](PHOTObOOTH_GUIDE.md#thêm-khung).
- Chạy `npm test` để kiểm thử tự động. Khi server đang chạy, dùng `npm run test:api -- http://localhost:3000`. [API và lệnh curl](API_REFERENCE.md) · [Kết quả kiểm thử](TEST_REPORT.md).
- `render.yaml` khai báo một Node Web Service gói Free. Render cấp URL HTTPS và truyền `PORT` cho dịch vụ lắng nghe trên `0.0.0.0`. [Triển khai từ GitHub lên Render](RENDER_DEPLOY.md).
