# Hướng Dẫn Triển Khai NITEK Check-in Kiosk trên Seeed Studio reTerminal DM

Tài liệu này hướng dẫn chi tiết cách chạy ứng dụng điểm danh **NITEK Check-in Kiosk** trên thiết bị **Seeed Studio reTerminal DM** (Raspberry Pi Compute Module 4, Màn hình cảm ứng 10.1" 1280x800, Linux ARM64).

---

## 🌟 Tính Năng Bản Kiosk reTerminal DM

- 📐 **Tối ưu chuẩn màn hình 10.1" (1280x800)**: Tự động toàn màn hình (Fullscreen Kiosk), ẩn thanh menu, ẩn con trỏ chuột khi không chạm.
- 📷 **Tự động kích hoạt Camera**: Quét mã QR mượt mà góc rộng, hỗ trợ cả camera CSI tích hợp và camera USB gắn ngoài.
- ⚡ **Hỗ trợ đầu đọc mã vạch / QR phần cứng (USB Barcode Scanner)**: Tự động nhận diện chuỗi ký tự quét tức thì mà không cần bấm chọn ô nhập liệu.
- 🔢 **Bàn phím số cảm ứng (Touch Numpad)**: Hỗ trợ thành viên tự nhập mã hoặc số thẻ trực tiếp trên màn hình nếu không mang theo mã QR.
- 🔊 **Âm thanh phản hồi trực tiếp (Audio Chime)**: Báo hiệu âm thanh to, rõ ràng qua loa của reTerminal khi điểm danh thành công hoặc trễ giờ.
- 🔒 **Khóa bảo vệ Admin PIN**: Thoát chế độ Kiosk an toàn bằng mã PIN 4 số (Mặc định: `1234`).
- 🔄 **Tự khởi động cùng hệ thống (Auto-start)**: Bật nguồn thiết bị là ứng dụng tự mở và sẵn sàng điểm danh.

---

## 🚀 Cách 1: Cài đặt và Chạy Trực Tiếp (Khuyến Nghị Nhanh Nhất)

### Bước 1: Sao chép mã nguồn vào reTerminal DM
Mở Terminal trên reTerminal DM (qua màn hình trực tiếp hoặc SSH):
```bash
# Di chuyển vào thư mục người dùng
cd /home/pi

# Clone dự án từ Git (hoặc copy thư mục qr-checkin-app qua SCP / USB)
git clone https://github.com/your-repo/qr-checkin-app.git
cd qr-checkin-app
```

### Bước 2: Tạo file cấu hình Supabase `.env`
```bash
cat << 'EOF' > .env
VITE_SUPABASE_URL=https://iddzqynagemldsykkitq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZHpxeW5hZ2VtbGRzeWtraXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODI1MzcsImV4cCI6MjEwMTg1ODUzN30.Qz-YGLuhwkESz6beYMlYfUETP3EU0FIzoRmS3CxmM1Y
EOF
```

### Bước 3: Chạy script tự động cài đặt
```bash
chmod +x reterminal-setup/setup.sh
./reterminal-setup/setup.sh
```
*Script này sẽ tự động cài Node.js, thư viện đồ họa ARM64, cấp quyền Camera `/dev/video*`, tắt chế độ ngủ màn hình và kích hoạt `systemd` service tự chạy khi bật máy.*

### Bước 4: Khởi động thử
```bash
# Chạy thử trực tiếp trên màn hình Desktop:
npm run electron:start

# Hoặc bật service chạy ngầm tự khởi động:
sudo systemctl start checkin-kiosk.service
```

---

## 📦 Cách 2: Đóng gói thành file `.AppImage` hoặc `.deb` (ARM64)

Nếu bạn muốn tạo một file cài đặt độc lập để phân phối cho nhiều máy reTerminal DM:

1. Trên thiết bị reTerminal DM (hoặc máy ảo Linux ARM64):
```bash
npm run electron:build:linux-arm64
```
2. Kết quả gói cài đặt sẽ nằm trong thư mục `release/`:
   - `release/NITEK Checkin Kiosk-1.0.0-arm64.AppImage`
   - `release/nitek-checkin-kiosk_1.0.0_arm64.deb`

3. Để chạy file `.AppImage`:
```bash
chmod +x "release/NITEK Checkin Kiosk-1.0.0-arm64.AppImage"
./"release/NITEK Checkin Kiosk-1.0.0-arm64.AppImage" --no-sandbox
```

---

## 🌐 Cách 3: Chạy Chế Độ Web Kiosk qua Chromium (Không cần Electron)

Nếu reTerminal DM đã có sẵn trình duyệt Chromium và kết nối Internet:

1. Chạy lệnh sau trong Terminal:
```bash
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  "https://qr-checkin-app-wheat.vercel.app/?mode=kiosk"
```

2. Để thiết lập tự chạy khi mở máy, thêm dòng trên vào file `~/.config/lxsession/LXDE-pi/autostart`.

---

## 🛠️ Các Lệnh Quản Lý & Bảo Trì Hữu Ích

| Thao tác | Lệnh |
|---|---|
| Kiểm tra trạng thái Kiosk | `sudo systemctl status checkin-kiosk.service` |
| Xem log thời gian thực | `journalctl -u checkin-kiosk.service -f` |
| Dừng ứng dụng Kiosk | `sudo systemctl stop checkin-kiosk.service` |
| Khởi động lại Kiosk | `sudo systemctl restart checkin-kiosk.service` |
| Cập nhật code mới từ Git | `git pull && npm run build && sudo systemctl restart checkin-kiosk.service` |
| Thoát Kiosk trên màn hình | Bấm biểu tượng 🔒 góc trên bên phải → Nhập mã PIN: `1234` |
