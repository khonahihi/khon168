<div align="center">

# 👑 KHON168

**Xin chào, mình là Khon!**

Dự án tùy chỉnh và mở rộng trải nghiệm **Locket Gold**, được kế thừa và viết lại dựa trên nền tảng module của **Đinh Duy Vinh** và **NightmarketServer**.

Dự án này tối ưu hóa cấu trúc mã nguồn gốc, bổ sung các tùy chỉnh cá nhân hóa , đồng thời tích hợp thêm các tiện ích giải trí YTB-Soundcloud-Sportify.

[![GitHub](https://img.shields.io/badge/GitHub-KHON168-181717?style=for-the-badge&logo=github)](https://github.com/khonahihi/khon168)
[![iOS](https://img.shields.io/badge/iOS-Shadowrocket-1C88E3?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/shadowrocket/id932747118)
[![License](https://img.shields.io/badge/License-Personal_Use-orange?style=for-the-badge)](#-tuyên-bố-miễn-trừ-trách-nhiệm)

</div>

---

## ✨ Giới thiệu & Tính năng

Dự án tập trung vào việc tùy biến module Locket cho ứng dụng Shadowrocket trên iOS:

- 🎨 **Custom Captions (Độc quyền):** Bộ nhãn dán, caption trang trí đa màu sắc, phong cách do chính mình tuyển chọn và thiết kế riêng trong mục `🎨 Decorative by Khon`.
- 👑 **Locket Gold Unlocked:** Mở khóa các đặc quyền Gold (huy hiệu profile, tải ảnh thư viện, không quảng cáo, quay video dài hơn, kết bạn không giới hạn,...).
- 📸 **Photobooth & AI Filter:** Tích hợp bộ chuyển tiếp xử lý bộ lọc ảnh AI Photobooth.
- 🧩 **All-in-One Media (Tích hợp thêm):**
  - 🛑 Chặn quảng cáo **YouTube**
  - 🎵 Mở rộng tiện ích **Spotify Premium** & **SoundCloud Go+**

---

## 🚀 Hướng dẫn cài đặt

### 1. Chuẩn bị

- Thiết bị iPhone / iPad chạy iOS.
- Ứng dụng **Shadowrocket** (đã cài đặt).
- Ứng dụng **Locket Widget**.

### 2. URL Module chính thức

Sao chép liên kết module:

```text
https://raw.githubusercontent.com/khonahihi/khon168/main/khon.module
```

### 3. Các bước thêm vào Shadowrocket

1. **Thêm Module:**
   - Mở ứng dụng **Shadowrocket** -> Chọn tab **Cấu hình (Config)**.
   - Kéo xuống phần **Modules** -> Nhấn dấu **`+`** ở góc trên.
   - Dán URL module ở trên vào và bấm **Lưu / Download**.
   - Chạm vào module vừa thêm để kích hoạt (hiển thị dấu tích màu cam).

2. **Cài đặt & Bật chứng chỉ HTTPS (Bắt buộc):**
   - Trong Shadowrocket, chạm vào file config đang sử dụng (icon chữ `(i)`) -> Chọn **Giải mã HTTPS (HTTPS Decryption)** -> Bật gạt.
   - Chọn **Tạo chứng chỉ mới (Generate New CA)** -> **Cài đặt chứng chỉ vào hệ thống**.
   - Mở **Cài đặt (Settings)** của iPhone -> **Cài đặt chung** -> **Giới thiệu** -> Kéo xuống dưới cùng chọn **Cài đặt tin cậy chứng nhận** -> Gạt **BẬT** tin cậy chứng chỉ Shadowrocket.

3. **Áp dụng:**
   - Quay lại Shadowrocket và bật công tắc **Kết nối VPN**.
   - Vuốt tắt hoàn toàn ứng dụng Locket trong màn hình đa nhiệm (App Switcher) rồi mở lại để tải cấu hình mới.

> [!TIP]
> Nếu mở Locket chưa thấy caption mới, hãy chuyển mạng (giữa Wi-Fi và 4G) hoặc bật tắt lại kết nối VPN một lần để ứng dụng nhận dữ liệu Remote Config mới.

---

## 🛠️ Định hướng phát triển

| Tính năng | Trạng thái / Định hướng |
|---|---|
| 🎨 Custom Captions | Tiếp tục cập nhật thêm phong cách và biểu tượng mới |
| 📸 Photobooth AI | Duy trì cầu nối máy chủ xử lý AI |
| 👥 Custom Groups | Nghiên cứu tùy biến phân nhóm bạn bè |
| 🔥 Trending Badges | Bổ sung các huy hiệu theo sự kiện / xu hướng |
| 📤 Photo & Video 30s | Tối ưu độ ổn định khi tải ảnh/quay video dài |

---

## ⚠️ Tuyên bố miễn trừ trách nhiệm

- Đây là dự án cá nhân không buôn bán, phi thương mại, phục vụ mục đích học tập, nghiên cứu và tùy biến trải nghiệm cá nhân.
- Dự án không thuộc sở hữu, không liên kết và không được chứng thực bởi Locket, RevenueCat hay Google Firebase.
- Không sử dụng cấu hình này cho bất kỳ mục đích thương mại hay mua bán dịch vụ.
- Người dùng tự chịu trách nhiệm đối với thiết bị và tài khoản của mình khi sử dụng cấu hình tùy chỉnh.

---

## 💛 Nguồn & Lời cảm ơn (Credits)

Dự án được xây dựng dựa trên nền tảng mã nguồn và đóng góp giá trị từ các tác giả:

- **Đinh Duy Vinh (@duyvinh09)** – Tác giả nền tảng script Locket Gold, AI Filter Bridge, cấu hình Remote Config và các script đa phương tiện.  
  🔗 **Git nguồn:** [https://github.com/duyvinh09/Module_IOS](https://github.com/duyvinh09/Module_IOS)
- **NightmarketServer** – Tham khảo cấu trúc module Shadowrocket và cộng đồng hỗ trợ.  
  🔗 **Git tham khảo:** [https://github.com/NightmarketServer/Module-Shadowrocket-NMS](https://github.com/NightmarketServer/Module-Shadowrocket-NMS)

Trân trọng ghi nhận và cảm ơn công sức đóng góp của các tác giả!

---

<div align="center">

**KHON168 – Locket Custom Module**  
Made with 💛 by **Khon**

</div>