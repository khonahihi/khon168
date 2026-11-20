# API Photobooth

API và giao diện dùng chung origin. API trả URL tài nguyên tương đối khi thiếu `PUBLIC_BASE_URL` và `RENDER_EXTERNAL_URL`.

| Method | Đường dẫn | Kết quả |
| --- | --- | --- |
| GET | `/health` | `200` và `{"status":"ok"}` |
| GET | `/api/photobooth/config` | Số ảnh, MIME đầu vào, định dạng đầu ra, chế độ trả kết quả và giới hạn |
| GET | `/api/photobooth/frames` | `{ "frames": [...] }` với `id`, `name`, `description`, `photoCount`, `canvas` và `previewUrl` |
| GET | `/api/photobooth/frames/:id` | Thêm `background`, `slotColor`, `gap`, `slots` và `overlayUrl` |
| GET | `/api/photobooth/frames/:id/preview.png` | Preview PNG có chỗ trống, cạnh dài tối đa 320 px |
| GET | `/api/photobooth/frames/:id/overlay.png` | Lớp khung PNG với alpha, nếu khung có overlay |
| POST | `/api/photobooth/compose` | `200` kèm ảnh hoặc `201` kèm liên kết tạm |
| GET | `/api/photobooth/results/:id` | `200` kèm ảnh khi còn hiệu lực, `404` khi liên kết hết hạn |

## Gửi ảnh ghép

Dùng `multipart/form-data` và để trình duyệt, curl hoặc Postman tạo boundary.

| Trường | Kiểu và giá trị |
| --- | --- |
| `frameId` | Text, bắt buộc. ID trong danh sách khung |
| `photos` | File, lặp một lần cho mỗi ảnh theo thứ tự ô |
| `format` | Text. `png` mặc định, `jpeg` hoặc `webp` |
| `mode` | Text. `binary` mặc định hoặc `url` |
| `edits` | Text chứa mảng JSON. Một mục cho mỗi ảnh, chấp nhận `null` để dùng mặc định |

Mỗi tùy chỉnh có thể gồm `fit` (`cover` hoặc `contain`), `x` và `y` từ 0 đến 1. Với `cover`, 0 là trái hoặc trên, 0.5 là giữa, 1 là phải hoặc dưới. `contain` căn giữa. Backend dựa vào nội dung tệp để nhận PNG, JPEG và WebP một khung hình.

Chế độ `binary` trả MIME của ảnh, `Content-Disposition: attachment` và `Cache-Control: no-store, private`. Chế độ `url` trả `{ "url": "...", "expiresAt": "...", "format": "png", "canvas": { "width": 1200, "height": 1500 } }`. Ai có URL đều có thể tải ảnh trong thời hạn. Kết quả biến mất khi hết hạn hoặc tiến trình khởi động lại.

### curl và Postman

```powershell
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/api/photobooth/frames
curl.exe -f -F "frameId=coastline" -F "photos=@a.jpg" -F "photos=@b.png" -F "format=webp" http://localhost:3000/api/photobooth/compose -o khon168.webp
curl.exe -f -F "frameId=peach-sticker" -F "mode=url" -F "photos=@a.jpg" http://localhost:3000/api/photobooth/compose
```

Trong Postman, tạo POST đến `/api/photobooth/compose`. Chọn **Body → form-data**, nhập `frameId` và phần tùy chọn dưới dạng **Text**, rồi thêm mỗi dòng `photos` dưới dạng **File**. Dùng **Send and Download** cho ảnh trả về trực tiếp. Chế độ URL trả JSON để dùng đường dẫn trong yêu cầu GET.

## Lỗi

```json
{
  "error": {
    "code": "WRONG_PHOTO_COUNT",
    "message": "Khung này cần đúng 2 ảnh."
  }
}
```

| HTTP | Mã lỗi tiêu biểu |
| --- | --- |
| 400 | `FRAME_REQUIRED`, `WRONG_PHOTO_COUNT`, `INVALID_EDITS`, `INVALID_FIELDS`, `INVALID_MODE`, `INVALID_FORMAT`, `INVALID_MULTIPART` |
| 403 | `CROSS_SITE_UPLOAD` |
| 404 | `FRAME_NOT_FOUND`, `ASSET_NOT_FOUND`, `RESULT_NOT_FOUND` |
| 408 | `UPLOAD_TIMEOUT` |
| 413 | `FILE_TOO_LARGE`, `TOO_MANY_PIXELS` |
| 415 | `UNSUPPORTED_IMAGE`, `MULTIPART_REQUIRED` |
| 422 | `INVALID_IMAGE` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |
| 503 | `BUSY`, `RESULT_STORE_FULL` |
| 504 | `COMPOSE_TIMEOUT` |

`429` và `503 BUSY` trả `Retry-After`. Dùng `binary` khi bộ nhớ kết quả tạm đầy.
