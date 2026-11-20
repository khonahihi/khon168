# Xác minh Photobooth trực tiếp trên iPhone

Mục tiêu là quan sát Photobooth trong giao diện Locket và xác minh ứng dụng có thể dùng một máy chủ HTTPS riêng qua cơ chế được Locket hỗ trợ. Mã Phong cung cấp metadata filter nhưng chưa đủ để xác nhận hai điều kiện này. [Phân tích từ ZIP](FEATURE_MATRIX.md#bằng-chứng-về-photobooth-trong-locket).

## 1. Kiểm tra giao diện Locket

1. Ghi phiên bản iOS và phiên bản Locket đang cài. Thử với tài khoản của bạn và các tính năng tài khoản được cấp quyền sẵn. Dùng cấu hình mạng thông thường và tạm tắt các module can thiệp vào Locket để có kết quả đối chứng.
2. Mở camera Locket. Tìm mục Photobooth hoặc mục chọn filter/khung trong camera. Ghi đường đi từ camera đến mục này, hoặc ghi rõ mục chưa xuất hiện. Tính năng có thể được phân phối theo từng tài khoản hoặc phiên bản. [Locket Help Center](https://help.locket.com/en/collections/4032076-troubleshooting).
3. Nếu có Photobooth, dùng ảnh mẫu không chứa dữ liệu cá nhân. Thử các số ảnh mà giao diện cho phép rồi ghi số ô, thứ tự ảnh và nơi xuất hiện kết quả. Ghi rõ ảnh hiển thị ngay trong Locket, mở ra ngoài ứng dụng, hay báo lỗi. Có thể dừng ở màn hình xem trước.
4. Nếu đăng nhập hoặc tải ảnh từ thư viện là điều kiện của tài khoản, kiểm tra quyền qua ứng dụng. Locket liệt kê tải từ Camera Roll là tính năng của Locket Gold. [Tính năng Locket Gold](https://help.locket.com/en/articles/11057185-what-is-locket-gold-and-what-features-are-included).

## 2. Xác minh thông tin cần cho adapter

Tra cứu tài liệu tích hợp chính thức hoặc dùng mẫu request/response đã được phép chia sẻ từ công cụ của nhà phát triển. Ảnh chụp giao diện xác nhận thao tác người dùng. Hợp đồng giao thức cần nguồn riêng.

| Thành phần | Bằng chứng cần ghi |
| --- | --- |
| Điểm mở và chọn khung | Phiên bản Locket, đường thao tác, cách catalog đến client và điều kiện hiển thị |
| Định tuyến | Cơ chế cho phép chọn origin HTTPS khác và đường dẫn chính xác thuộc riêng Photobooth |
| Gửi ảnh | Method, tên header, MIME, kiểu body, khóa frame ID, số lượng và thứ tự ảnh, cách mã hóa ảnh |
| Nhận ảnh | Status, MIME, schema thành công và lỗi, kiểu ảnh hoặc URL, quy tắc tải và thời hạn nếu dùng URL |
| Xác nhận lúc chạy | Locket gửi yêu cầu Photobooth đến backend đã được cấu hình, sau đó hiển thị đúng ảnh và xử lý lỗi chính xác |

Chỉ ghi tên header và mô tả schema đã loại dữ liệu cá nhân. Không đưa token, cookie, UID, ảnh gốc, URL có chữ ký hoặc HAR thô vào tệp. Các bước đối chứng dùng chứng chỉ HTTPS bình thường của Render và Locket.

## 3. Chạy công cụ kiểm tra bằng chứng

Từ thư mục repository, sao chép biểu mẫu và ghi những mục thực sự quan sát được. Giá trị chưa biết để `null`.

```powershell
Copy-Item test/fixtures/locket-evidence.template.json locket-evidence.local.json
npm.cmd run evidence:locket -- locket-evidence.local.json
```

- `device` ghi phiên bản, đường mở và hành vi hiển thị ảnh trong app. Nếu mục Photobooth không xuất hiện, đặt `photoboothVisible` thành `false`.
- `extension` ghi nguồn là `official-doc` hoặc `authorized-fixture`, kèm liên kết tài liệu công khai hoặc tên tài liệu được phép chia sẻ.
- `endpoints` có mục `purpose: "compose"` cho yêu cầu ghép. Thêm mục `catalog` hoặc `result` nếu thật sự có endpoint riêng. `request.headers` là danh sách tên header. Dùng `[]` khi nguồn xác nhận không cần header riêng. `schema` mô tả cấu trúc và kiểu trường. Với ảnh trả ở dạng URL, ghi quy tắc tải trong `response.imageDelivery`.
- Lệnh dùng tệp mẫu nếu không truyền đối số. Mã thoát `2` liệt kê các mục còn thiếu, `1` là lỗi đọc hoặc định dạng tệp, `0` cho biết biểu mẫu đã đủ trường. Công cụ chạy offline và không kiểm chứng tính xác thực của nguồn hay hành vi của ứng dụng.

## 4. Đối chứng backend và quyết định về Shadowrocket

Sau khi bạn triển khai, mở URL Render và `/health` trong Safari. Thử một bộ 1, 2 và 4 ảnh, kiểm tra kích thước và thứ tự ảnh, rồi tải kết quả. Bước này xác nhận backend và giao diện web. Luồng Locket phải được kiểm thử riêng.

Khi có đủ hợp đồng đã đối chiếu, adapter có thể ánh xạ các trường đã xác nhận vào pipeline Sharp. Chỉ thêm quy tắc Shadowrocket khi cơ chế đã được chứng minh trên phiên bản Locket cụ thể và có thể giới hạn vào đường dẫn Photobooth. Hiện chưa có quy tắc hay adapter tương thích đã xác minh.
