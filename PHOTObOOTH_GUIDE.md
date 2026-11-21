# Hướng dẫn Photobooth KHON168

## Tạo và lưu ảnh

1. Mở Photobooth trong trình duyệt. Chọn **1 ảnh**, **2 ảnh** hoặc **4 ảnh** và chọn khung.
2. Chọn một ảnh cho mỗi ô. Các ảnh được ghép theo nhãn **Ảnh 1**, **Ảnh 2** và tiếp tục theo thứ tự hiển thị. Khi đổi mẫu, ảnh đã chọn được giữ lại, còn phần căn cắt dùng mặc định của khung mới.
3. Mở **Chỉnh khung cắt**. **Lấp đầy ô** cho phép chỉnh theo chiều ảnh bị cắt. **Giữ toàn bộ ảnh** đặt ảnh vào giữa và để lộ nền ở phần dư.
4. Chọn PNG, JPEG hoặc WebP, bấm **Tạo ảnh**, rồi chọn **Tải ảnh**. Trên Safari iPhone, dùng **Chia sẻ → Lưu hình ảnh** nếu có, hoặc mở tệp tải xuống trong ứng dụng **Tệp** để lưu vào **Ảnh**.
5. Nếu Safari không cho chọn ảnh HEIC hoặc ứng dụng báo sai định dạng, hãy xuất ảnh sang JPEG, PNG hoặc WebP rồi thử lại.

Ảnh đầu vào mặc định giới hạn 8 MiB và 25 triệu pixel mỗi tệp. Trình duyệt xem trước ảnh cục bộ và gửi ảnh lúc bấm **Tạo ảnh**. Sharp xoay theo EXIF và loại bỏ metadata gốc khỏi kết quả. PNG và WebP giữ alpha. JPEG dùng nền trắng cho phần trong suốt.

## Sáu khung có sẵn

| ID | Tên | Bố cục | Canvas |
| --- | --- | --- | --- |
| `peach-sticker` | Đào Mơ | 1 ảnh dọc | 1200 × 1500 |
| `midnight-postcard` | Đêm Lam | 1 ảnh ngang | 1500 × 1200 |
| `rose-duet` | Hồng Song | 2 ảnh xếp dọc | 1120 × 1660 |
| `coastline` | Bưu Thiếp Biển | 2 ảnh xếp ngang | 1680 × 1080 |
| `afterglow-grid` | Hoàng Hôn | 4 ảnh lưới 2×2 | 1400 × 1500 |
| `mint-strip` | Dải Bạc Hà | 4 ảnh dải dọc | 800 × 2000 |

## Thêm khung

Tạo tệp `backend/layouts/custom-example.json` và đặt tài nguyên tương ứng trong `backend/frames/`.

```json
{
  "id": "custom-example",
  "name": "Khung mới",
  "description": "Tối giản · Chân dung",
  "photoCount": 1,
  "canvas": { "width": 1000, "height": 1200 },
  "background": "#FFF1CF",
  "slotColor": "#E3CEC0",
  "gap": 0,
  "order": 30,
  "overlay": "custom-example.png",
  "slots": [
    { "left": 80, "top": 80, "width": 840, "height": 960, "radius": 30, "fit": "cover", "x": 0.5, "y": 0.5 }
  ]
}
```

- Tên tệp JSON phải trùng ID. `photoCount` là 1, 2 hoặc 4 và bằng độ dài `slots`. Tọa độ tính bằng pixel từ góc trên trái. Canvas có tối đa 3000 px mỗi chiều và 4 megapixel.
- `gap` quy định khoảng cách tối thiểu giữa hai ô theo ít nhất một trục. `radius` giới hạn đến một nửa cạnh ngắn nhất của ô. `fit` nhận `cover` hoặc `contain`. `x` và `y` nằm từ 0 đến 1.
- `background` và `slotColor` nhận `#RRGGBB`, `#RRGGBBAA` hoặc `transparent`. `slotColor` chỉ dùng cho ô trống trong bản xem trước.
- `overlay` và `order` là tùy chọn. Lớp khung là SVG hoặc PNG có alpha, đúng kích thước canvas. Đồ họa và watermark cố định có thể đặt trong lớp này.
- Chạy `npm run build` rồi khởi động lại. Server raster hóa lớp khung và tự tạo hình xem trước khi nạp catalog.

## Shadowrocket và Locket

Dùng URL Photobooth trong Safari. Nếu tài khoản Locket đã có quyền chọn ảnh từ thư viện, bạn có thể thử chọn ảnh đã lưu trong ứng dụng. [Tính năng Locket Gold](https://help.locket.com/en/articles/11057185-what-is-locket-gold-and-what-features-are-included).

Kiểm tra riêng khả năng mở Photobooth trong Locket, gọi backend và nhận ảnh theo [quy trình dành cho iPhone](LOCKET_IPHONE_TEST.md).
