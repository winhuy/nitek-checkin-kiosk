#!/usr/bin/env bash
# ==============================================================================
# NITEK CHECKIN — Complete Master Setup Script for Seeed Studio reTerminal DM
# Target OS: Raspberry Pi OS 64-bit / Debian 11/12 (ARM64)
# ==============================================================================

set -e

echo "🚀 [1/6] Bắt đầu dọn dẹp & cấu hình NITEK Check-in Kiosk trên reTerminal DM..."

# 1. Dừng mọi tiến trình và service cũ
echo "🛑 [2/6] Dừng các tiến trình và dịch vụ cũ..."
sudo systemctl stop checkin-kiosk.service 2>/dev/null || true
sudo systemctl stop nitek-kiosk-web.service 2>/dev/null || true
sudo systemctl stop reterminal-camera-bridge.service 2>/dev/null || true
sudo systemctl disable checkin-kiosk.service 2>/dev/null || true

killall -9 chromium-browser chromium electron node npm 2>/dev/null || true
pkill -9 -f "mjpeg_server.py" 2>/dev/null || true
pkill -9 -f "libcamera-vid" 2>/dev/null || true

# 2. Cài đặt các gói bổ trợ hệ thống
echo "📦 [3/6] Kiểm tra và cài đặt gói hệ thống..."
sudo apt-get update -y
sudo apt-get install -y \
  curl \
  git \
  build-essential \
  libcamera-tools \
  libcamera-v4l2 \
  python3 \
  v4l-utils \
  x11-xserver-utils \
  unclutter

# 3. Phân quyền phần cứng
CURRENT_USER=$(whoami)
echo "🔒 Phân quyền Video/Camera cho user '$CURRENT_USER'..."
sudo usermod -a -G video "$CURRENT_USER" || true
sudo usermod -a -G dialout "$CURRENT_USER" || true
sudo usermod -a -G gpio "$CURRENT_USER" || true

# 4. Khôi phục cấu hình Desktop LXDE chuẩn và tắt Screen Blanking
echo "🖥️ [4/6] Cấu hình giao diện Desktop LXDE & Kiosk mode..."
mkdir -p ~/.config/lxsession/LXDE-pi/
cat << 'EOF' > ~/.config/lxsession/LXDE-pi/autostart
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 3 -root
EOF

# 5. Cài đặt dependencies và build dự án
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "🔨 [5/6] Cài đặt Node modules & Build ứng dụng..."
npm install
npm run build

# 6. Đăng ký các dịch vụ tự khởi động (systemd services)
echo "⚙️ [6/6] Cài đặt dịch vụ hệ thống (systemd services)..."

# Service 1: Camera Hardware Streamer
sudo cp "$SCRIPT_DIR/reterminal-camera-bridge.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable reterminal-camera-bridge.service
sudo systemctl restart reterminal-camera-bridge.service

# Service 2: Kiosk Web Server
sudo cp "$SCRIPT_DIR/nitek-kiosk-web.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nitek-kiosk-web.service
sudo systemctl restart nitek-kiosk-web.service

# Tạo shortcut trên Desktop
chmod +x "$SCRIPT_DIR/start-kiosk-ui.sh"
mkdir -p ~/Desktop
cat << EOF > ~/Desktop/NITEK-Kiosk.desktop
[Desktop Entry]
Type=Application
Name=NITEK Check-in Kiosk
Comment=Khởi chạy hệ thống điểm danh Kiosk toàn màn hình
Exec=/bin/bash $SCRIPT_DIR/start-kiosk-ui.sh
Icon=camera-web
Terminal=false
Categories=Application;
EOF
chmod +x ~/Desktop/NITEK-Kiosk.desktop

echo "========================================================================"
echo "🎉 HOÀN TẤT THIẾT LẬP NITEK CHECK-IN KIOSK TRÊN RETERMINAL DM!"
echo "========================================================================"
echo " - Camera Service: active (http://127.0.0.1:5001/stream.mjpg)"
echo " - Web Kiosk: active (http://localhost:4173/?mode=kiosk)"
echo " - Desktop Shortcut: ~/Desktop/NITEK-Kiosk.desktop"
echo "========================================================================"
