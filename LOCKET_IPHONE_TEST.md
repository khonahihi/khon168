# Xác minh Photobooth trực tiếp trên iPhone

Mục tiêu là xác minh luồng **Camera → Filter → Photobooth → chọn khung → chụp đủ ảnh → Đăng** trong Locket. Sau khi thấy luồng này, cần xác định phần ghép ảnh chạy trên thiết bị hay qua API. [Phân tích từ ZIP](FEATURE_MATRIX.md#bằng-chứng-về-photobooth-trong-locket).

## 1. Kiểm tra giao diện Locket

1. Ghi phiên bản iOS và phiên bản Locket đang cài. Thử với tài khoản của bạn và các tính năng tài khoản được cấp quyền sẵn. Dùng cấu hình mạng thông thường và tạm tắt các module can thiệp vào Locket để có kết quả đối chứng.
2. Mở camera Locket. Tìm mục Photobooth hoặc mục chọn filter/khung trong camera. Ghi đường đi từ camera đến mục này, hoặc ghi rõ mục chưa xuất hiện. Tính năng có thể được phân phối theo từng tài khoản hoặc phiên bản. [Locket Help Center](https://help.locket.com/en/collections/4032076-troubleshooting).
3. Nếu thấy Photobooth trong Filter, chọn một khung và chụp lần lượt theo các ô. Dùng vật mẫu không chứa dữ liệu cá nhân. Thử các mẫu 1, 2 và 4 ảnh nếu chúng xuất hiện. Ghi số lần chụp, thứ tự, ảnh xem trước và nơi kết quả xuất hiện.
4. Khi muốn thử Đăng, chọn người nhận thử nghiệm được phép, bấm **Đăng** và kiểm tra bài Photobooth xuất hiện trong Locket. Nếu chỉ quan sát được ảnh xem trước, để trạng thái Đăng là chưa xác minh. Có thể đối chiếu thêm một ảnh chụp và đăng thông thường.

## 2. Xác minh thông tin cần cho adapter

Tra cứu tài liệu tích hợp chính thức hoặc dùng mẫu request/response đã được phép chia sẻ từ công cụ của nhà phát triển. Ảnh chụp giao diện xác nhận thao tác người dùng. Hợp đồng giao thức cần nguồn riêng.

| Thành phần | Bằng chứng cần ghi |
| --- | --- |
| Điểm mở và chọn khung | Phiên bản Locket, đường thao tác, schema Filter thực tế, cách catalog đến client và điều kiện hiển thị |
| Xử lý ảnh | Bằng chứng cho biết phần ghép chạy trong app hoặc qua API |
| Định tuyến nếu dùng API ghép | Cơ chế cho phép chọn origin HTTPS khác và đường dẫn chính xác thuộc riêng Photobooth |
| Gửi ảnh nếu dùng API ghép | Method, tên header, MIME, kiểu body, khóa frame ID, số lượng và thứ tự ảnh, cách mã hóa ảnh |
| Nhận ảnh nếu dùng API ghép | Status, MIME, schema thành công và lỗi, kiểu ảnh hoặc URL, quy tắc tải và thời hạn nếu dùng URL |
| Xác nhận lúc chạy | Locket hiển thị ảnh đúng khung và bài đăng xuất hiện sau khi bấm Đăng |

Chỉ ghi tên header và mô tả schema đã loại dữ liệu cá nhân. Không đưa token, cookie, UID, ảnh gốc, URL có chữ ký hoặc HAR thô vào tệp. Các bước đối chứng dùng chứng chỉ HTTPS bình thường của Render và Locket.

## 3. Chạy công cụ kiểm tra bằng chứng

Từ thư mục repository, sao chép biểu mẫu và ghi những mục thực sự quan sát được. Giá trị chưa biết để `null`.

```powershell
Copy-Item test/fixtures/locket-evidence.template.json locket-evidence.local.json
npm.cmd run evidence:locket -- locket-evidence.local.json
```

- `device` ghi phiên bản, đường mở, khả năng chọn khung, số ảnh đã chụp, hành vi hiển thị và kết quả Đăng. Nếu mục Photobooth không xuất hiện, đặt `photoboothVisible` thành `false`.
- `extension` ghi nguồn là `official-doc` hoặc `authorized-fixture`, kèm nguồn được phép chia sẻ và schema Filter quan sát được. Đặt `processing` là `on-device` hoặc `remote` khi có bằng chứng, kèm mô tả ở `processingEvidence`.
- Với `processing: "remote"`, điền mục `purpose: "compose"` trong `endpoints`. Thêm `catalog` hoặc `result` nếu có endpoint riêng. `request.headers` chỉ chứa tên header. Dùng `[]` khi đã xác nhận không cần header riêng. Với ảnh trả ở dạng URL, ghi quy tắc tải trong `response.imageDelivery`.
- Lệnh dùng tệp mẫu nếu không truyền đối số. Mã thoát `2` liệt kê các mục còn thiếu, `1` là lỗi đọc hoặc định dạng tệp, `0` cho biết biểu mẫu đã đủ trường. Công cụ chạy offline và không kiểm chứng tính xác thực của nguồn hay hành vi của ứng dụng.

## 4. Đối chứng backend và quyết định về Shadowrocket

Với backend độc lập, kiểm tra `/health` trước rồi chạy `npm run test:api -- <url>` bằng ảnh mẫu tự sinh. Khi kiểm tra, URL Render đã cung cấp trả HTTP 404. Kết quả thử backend không xác nhận luồng Camera → Filter trong Locket. [Kết quả kiểm thử](TEST_REPORT.md).

## 5. Đọc kết quả module ngay trên iPhone

1. Cập nhật module theo README sau khi bản này được push. Tắt các module cùng sửa phản hồi Firebase trong lần đối chứng. Mở Locket và vào Camera → Filter.
2. Trong nhật ký script của Shadowrocket, tìm `KHON168 Filter`. `no-change` nghĩa là lần fetch đó dùng dữ liệu đã lưu. Chờ lần cập nhật tự nhiên. `missing-config`, `missing-catalog` hoặc `unknown-shape` cho biết phản hồi thiếu cấu trúc đã đối chiếu. `ambiguous-sheet` hoặc `inactive-sheet` nghĩa là module giữ nguyên cấu hình.
3. Với `checked`, `picker` đếm các mục trong bộ chọn, `inSheet` đếm các mục trong nhóm Photobooth trước khi xử lý, `eligible` đếm ID Photobooth đủ điều kiện, `added` đếm ID mới nối vào nhóm. Dòng này chỉ chứa số đếm và trạng thái. Nếu không có dòng nào, ghi “chưa quan sát được lần fetch” cùng phiên bản ứng dụng.
4. Nếu nhóm xuất hiện, ghi tên khung, dấu hiệu sau từng lần chụp, có giữ ảnh trước khi chụp ô tiếp theo hay không và bài có xuất hiện sau khi gửi hay không. Với mẫu bốn ô, đối chiếu cả trạng thái 2/4 và 4/4. Dùng bốn vật khác nhau để phát hiện tráo ô. Kiểm tra thêm một caption quen thuộc và một lần chụp thường.
5. Để đối chiếu tiếp, chỉ chia sẻ dòng số đếm trên và cấu trúc trường của mẫu cấu hình được phép dùng. Nếu renderer chạy từ xa, cần thêm schema của một lần chụp và phản hồi tương ứng đã loại bỏ giá trị riêng tư.
