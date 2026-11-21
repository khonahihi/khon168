# Phân tích KHON168 và module tham chiếu

## Nguồn đã đọc

Nhánh `main` của KHON168 tại commit `cf85d6b` gồm `locket.module`, `README.md` và ba tệp trong `js/`. Hai tệp tham chiếu trong ZIP là `locketmphong.conf` và `locketmphong_v95.js`. Tên profile ghi 9.5, phần đầu script ghi 9.2. [Snapshot KHON168 trên GitHub](https://github.com/khonahihi/khon168/tree/cf85d6b237d9c4f69aded6df220131b62e75113a).

Bản trích xuất chứa 75 caption trong 5 nhóm, 42 filter, 22 ID Photobooth, metadata overlay khung widget, tên tệp asset và vị trí các tên endpoint trong mã. Trình đọc dùng khai báo JSON tĩnh và cấu hình dạng văn bản. [Bản trích xuất](PHONG_REFERENCE.json).

```powershell
npm.cmd run inspect:phong -- .\locketmphong_v95.js .\locketmphong.conf PHONG_REFERENCE.json
```

| Tính năng | KHON168 gốc | Mã Phong | Backend và mức xác minh |
| --- | --- | --- | --- |
| Custom Captions | Ghi `overlay_items` và `overlay_dynamic_captions` vào Remote Config bằng JS | Có 5 nhóm, 75 mục trong hằng `CUSTOM_OVERLAY_ITEMS`. Bản cung cấp chỉ khai báo hằng | Không cần Sharp. Đã chạy kiểm thử JSON của KHON168. Hiển thị và thứ tự trên thiết bị cần thử thực tế |
| Gradient caption | Nền có mảng màu tĩnh 2 màu trở lên | Caption tĩnh có 2 màu | JS cung cấp màu. Số điểm màu Locket hiển thị và hiệu ứng động chưa được xác minh |
| Video, Camera Roll, nhóm và lượt xem | Script ghi cờ và cấu hình UI qua Remote Config | Script có một số cờ tương tự, gồm các giá trị giới hạn video 45 giây | Cờ được cấu hình ở client. Tải ảnh/video và dữ liệu tài khoản phụ thuộc API của Locket. Cần thử trên thiết bị |
| Khung widget | Có `widget_frame_event` và PNG từ Postimages | Có cấu hình event và PNG từ host tài nguyên của Phong | JS cung cấp cấu hình, ảnh cần được host. Hiển thị phụ thuộc ứng dụng |
| Danh sách filter | Có ID và nhóm filter trong `camera_filter_config` | 42 mục gồm 6 AI, 13 khung, 22 Photobooth và 1 trò chơi. Một nhánh JS có thể tạo phản hồi danh sách | Có thể mô tả danh sách trong JS. Điều kiện để Locket chấp nhận và khả năng lấy tài nguyên cần kiểm thử |
| Hiệu ứng AI | Có cấu hình picker. README gốc ghi AI chưa dùng được | Có prompt và metadata. Profile định tuyến Cloud Functions về VPS | Suy luận AI cần dịch vụ xử lý. ZIP thiếu mã máy chủ tham chiếu và mẫu protocol |
| Photobooth 1/2/4 ảnh | Chưa có xử lý ghép | Có ID, metadata và URL overlay. Phần ghép được mô tả là ở VPS | KHON168 đã ghép độc lập bằng Sharp với sáu khung riêng và đã kiểm thử qua HTTP. Tích hợp Locket chưa xác minh |
| Thuê bao và cache RevenueCat | `header.js` sửa header cache, `locketfix.js` sửa dữ liệu thuê bao trong phản hồi | Profile định tuyến RevenueCat qua VPS và script cũng sửa phản hồi | Sửa payload trên thiết bị không xác nhận quyền thuê bao trên máy chủ. Phần này thuộc module cũ |
| Đăng bài, truy cập tài khoản và lưu trữ | Cấu hình tham chiếu dịch vụ Locket/Firebase | Profile định tuyến Cloud Functions diện rộng, script đọc định danh từ header xác thực | Quyền truy cập do dịch vụ chính thức quyết định. API Photobooth chỉ nhận ảnh và tùy chọn ghép |

## Caption và gradient

`locket.module` gọi `js/forceGold.js` cho phản hồi Firebase Remote Config. Sau khi nhận diện User-Agent Locket, script dùng `Object.assign` để ghi các khóa vào `obj.entries`. `overlay_items` là chuỗi JSON chứa danh sách nhóm và item. `overlay_dynamic_captions` là chuỗi JSON liệt kê các kiểu caption theo dữ liệu ứng dụng, như thời tiết và nhạc. Cuối cùng script tuần tự hóa phản hồi qua `$done`.

Cả hai bộ khai báo có `overlay_id`, `source`, `caption.type`, `caption.text`, `caption.icon`, `caption.background.colors` và `caption.text_color`. Một số mục Phong có thêm `sort_order`. KHON168 dùng thứ tự mảng hiện có. Các mảng màu mô tả gradient tĩnh. Các kiểu caption động cung cấp nội dung theo ngữ cảnh.

Module thử nghiệm chạy trực tiếp `js/forceGold.js` ở chiều phản hồi của Firebase fetch. Nhánh Photobooth chỉ xử lý POST thành công với `state: "UPDATE"`. Việc hợp nhất caption và việc cập nhật nhóm camera độc lập. Khi trùng `overlay_id`, bản đang có trong phản hồi được ưu tiên. [Mã SDK Firebase iOS](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseRemoteConfig/Sources/RCNConfigFetch.m).

## Bằng chứng về Photobooth trong Locket

### Đường đi của cấu hình Filter hiện có

Bản gốc của `forceGold.js` thay toàn bộ `camera_filter_config` bằng sáu nhóm tĩnh. Trên nhánh tính năng, quy tắc cũ chỉ dùng sáu nhóm dự phòng khi phản hồi thiếu khóa này. Module thử nghiệm giữ nguyên trường thiếu hoặc sai dạng.

Trong chế độ Photobooth, script chỉ thêm ID đang có trong `picker_filters` khi catalog của cùng phản hồi xác nhận `category` là Photobooth, `type` là `normal` và `overlay` là `true`. Script giữ thứ tự picker và các nhóm cũ. Cấu hình bị tắt hoặc có các danh sách song song mâu thuẫn được giữ nguyên. Cấu trúc này đã chạy với fixture cục bộ. Chưa có phản hồi từ iPhone cho thấy Locket cấp những bản ghi tương ứng cho KHON168.

### Đối chiếu mã Phong

1. **Kích hoạt.** `CUSTOM_CAMERA_FILTER_CONFIG` khai báo cờ hiển thị nút và bộ chọn. Bản script chỉ dùng hằng này để lấy danh sách ở nhánh `getFilters` / `createFilter`. Không có lệnh ghi nó vào Remote Config. Nhánh `changeProfileInfo` có thể ghi lựa chọn vào bộ nhớ Shadowrocket, nhưng trong script không có thao tác đọc khóa đó để gọi xử lý ảnh.
2. **Dữ liệu khung.** Cả 22 mục thuộc nhóm Photobooth đều có `type` và `filterType` là `normal`. Chúng có cờ `overlay`, URL ảnh khung và metadata hiển thị. `outputUrl`, `productUrl` và `referenceImages` không có giá trị sử dụng ở các mục này. Catalog không có `photoCount`, `slots` hay `layout`. Tên ID gợi ý số ảnh ở một số mục, nhưng không mô tả cách client gửi từng ảnh.
3. **Gọi API và nhận kết quả.** Nhánh đầu của script với URL Cloud Functions gốc thoát ngay sau khi đổi URL. Profile dùng quy tắc request chung. ZIP không có bằng chứng cho thấy các nhánh xử lý phản hồi sau đó được gọi trong luồng Photobooth thật.

| Endpoint được nhắc | Điều quan sát được từ ZIP | Method, header, payload, response và định dạng |
| --- | --- | --- |
| `generateFilteredImage` | Tên nằm trong bình luận về chuyển tiếp Cloud Functions và điều kiện xử lý phản hồi | Chưa biết method, header bắt buộc và body. Nhánh JS sửa JSON đã nhận. ZIP thiếu schema thành công và mẫu ảnh |
| `createOverlay` | Tên nằm trong cùng nhánh phản hồi | Chưa biết method, header, body, schema thành công và định dạng ảnh |
| `generateFilter` | Tên nằm trong cùng nhánh phản hồi | Chưa biết method, header, body, schema thành công và định dạng ảnh |
| `applyFilter` | Tên nằm trong cùng nhánh phản hồi | Chưa biết method, header, body, schema thành công và định dạng ảnh |
| `getFilters` / `createFilter` | Nhánh request có thể tạo JSON cục bộ với `result.data.filters` và `data.filters` | Đây là dữ liệu do script tạo. ZIP thiếu mẫu request và response gốc của server |
| `postMomentV2` / `ai-filters` | Chỉ được nhắc trong bình luận về VPS và tải ảnh kết quả | ZIP thiếu method, header, body, schema và mẫu ảnh từ VPS |

Quy tắc Cloud Functions của profile chạy ở chiều request và không yêu cầu đọc body. Profile không đăng ký hook response riêng cho bốn endpoint ghép. Nhánh JS có thể bỏ trường lỗi và trả 200 với `Content-Type: application/json`. Điều đó không xác nhận xử lý thành công ở server. Catalog filter tham chiếu URL overlay và hình minh họa trên host của Phong. ZIP không có mã triển khai trên VPS, tệp ảnh khung gốc hoặc bản ghi request/response thực tế.

Chưa xác định được Locket xử lý ảnh Photobooth trên thiết bị hay gọi API. Một danh sách filter có URL overlay chỉ xác nhận metadata có thể mô tả khung. Cần bằng chứng client chọn khung, chụp theo số ô, ghép ảnh và chuyển ảnh kết quả vào thao tác Đăng thông thường. Nếu có API xử lý, còn thiếu method, body, thứ tự ảnh, key Khung, status, MIME, schema thực tế của `generateFilteredImage` và cơ chế hỗ trợ endpoint riêng. API Sharp của KHON168 có hợp đồng riêng. `/health` ở địa chỉ Render được cung cấp trả HTTP 404 khi kiểm tra. [Kết quả kiểm thử](TEST_REPORT.md) · [Biểu mẫu bằng chứng iPhone](LOCKET_IPHONE_TEST.md).

### Đối chiếu bốn ảnh do người dùng cung cấp

Ảnh 1 có nhóm Photobooth, trong đó tên Ếch Xanh khớp `pb_ech_xanh`. Ảnh 3 có hàng chọn khung cạnh nút chụp. Ảnh 2 hiển thị “ĐANG RỬA ẢNH”. Ảnh 4 ở màn hình “Gửi đến…” có nhãn “Photobooth Trứng Bắc Thảo”, trùng tên của `pb_trung_bac_thao` trong catalog. Hai ô trên có ảnh và hai ô dưới còn chờ. Ảnh không cho biết số request, nơi lưu trạng thái giữa các lần chụp, hay kết quả sau khi bấm gửi. Không có mẫu payload thực tế đi cùng ảnh.

Trong lịch sử KHON168, `15621af` có adapter cũ và `simulate_locket.js`. Tệp mô phỏng tự tạo ảnh và session. Tài liệu cùng commit ghi rõ các trường là phỏng đoán. Adapter đó không cung cấp giao thức đã xác minh.
