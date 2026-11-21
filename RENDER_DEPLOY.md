# Triển khai KHON168 trên Render Free

Giao diện và REST API dùng chung một Node Web Service. Các tệp triển khai nằm ở gốc repository.

## Đưa nhánh tính năng lên GitHub

1. Trong VS Code, kiểm tra thay đổi ở Source Control và chạy `npm test` cùng `npm run build`.
2. Commit trên nhánh `feature/khon168-photobooth` rồi dùng **Publish Branch** khi sẵn sàng. Có thể dùng `git push -u origin feature/khon168-photobooth` sau khi commit và có quyền ghi.
3. Dùng nhánh tính năng để thử trên Render hoặc chọn nhánh mặc định sau khi bạn hợp nhất PR.

## Tạo Web Service

Trong Render Dashboard, chọn **New → Web Service**, kết nối GitHub và chọn repository `khonahihi/khon168`. Đặt **Root Directory** ở gốc repository, runtime **Node**, **Instance Type** là **Free**. Có thể dùng **New → Blueprint** để đọc `render.yaml` từ nhánh đã chọn. Xác nhận gói **Free** trong bản tóm tắt. [Render Blueprints](https://render.com/docs/infrastructure-as-code) · [Blueprint YAML](https://render.com/docs/blueprint-spec).

| Thiết lập | Giá trị |
| --- | --- |
| Node.js | 24.x theo `package.json` |
| Build Command | `npm ci --include=optional && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Environment | `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` |
| Port | Do Render cung cấp qua `PORT` |
| URL | HTTPS tại tên miền `onrender.com` do Render cấp |

App lấy URL công khai từ `RENDER_EXTERNAL_URL` nếu không đặt `PUBLIC_BASE_URL`. Để ghi đè, đặt origin HTTPS không kèm đường dẫn. Khi Render cấp `RENDER=true`, giới hạn yêu cầu ưu tiên địa chỉ hợp lệ trong `CF-Connecting-IP` do Cloudflare ghi, rồi dùng IP từ cấu hình proxy nếu thiếu header. Chạy trực tiếp trên máy dùng `TRUST_PROXY_HOPS=0`. [Biến môi trường Render](https://render.com/docs/environment-variables) · [Render Web Services](https://render.com/docs/web-services) · [Header IP trên Render](https://render.com/articles/host-pocketbase-on-render).

| Biến | Mặc định | Vai trò |
| --- | ---: | --- |
| `MAX_IMAGE_BYTES` | `8388608` | Số byte mỗi ảnh |
| `MAX_INPUT_PIXELS` | `25000000` | Số pixel mỗi ảnh |
| `MAX_ACTIVE_COMPOSITIONS` | `1` | Số upload/ghép đang hoạt động trên một tiến trình |
| `REQUEST_TIMEOUT_MS` | `45000` | Thời hạn upload và ghép của một yêu cầu |
| `SHARP_TIMEOUT_SECONDS` | `12` | Thời hạn tối đa của mỗi pipeline Sharp |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Cửa sổ giới hạn yêu cầu |
| `COMPOSE_REQUESTS_PER_WINDOW` | `12` | Số lần compose mỗi IP trong cửa sổ |
| `RESULT_TTL_SECONDS` | `300` | Thời hạn liên kết ảnh |
| `MAX_RESULT_BYTES` | `25165824` | Tổng bộ nhớ đệm ảnh có liên kết |
| `MAX_STORED_RESULTS` | `12` | Số ảnh có liên kết trong bộ nhớ |

Ảnh gốc và liên kết kết quả chỉ dùng RAM. Render có thể khởi động lại instance và hệ thống tệp của gói Free là tạm thời. Web Service Free có thể ngủ sau 15 phút không hoạt động và mất khoảng một phút để thức dậy. Hạn mức là 750 giờ instance Free mỗi workspace mỗi tháng, kèm hạn mức băng thông và thời gian build theo tài khoản. [Giới hạn Render Free](https://render.com/docs/free).

## Xác minh sau khi triển khai

1. Trong **Events** và **Logs**, tìm `KHON168 Photobooth listening on 0.0.0.0` cùng cổng do Render cấp.
2. Mở `https://<ten-dich-vu>.onrender.com/health` và kiểm tra `{"status":"ok"}`.
3. Chạy `npm run test:api -- https://<ten-dich-vu>.onrender.com` ở máy local. Mở trang HTTPS trên Safari iPhone rồi thử tạo, tải và chia sẻ ảnh.
4. Nếu lỗi build, kiểm tra Node 24, tùy chọn `--include=optional` và nhánh chứa `package-lock.json`. Nếu lỗi cổng, xác nhận server nhận `PORT` từ Render. [Xử lý lỗi deploy](https://render.com/docs/troubleshooting-deploys).
