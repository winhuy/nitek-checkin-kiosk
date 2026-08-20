#!/usr/bin/env bash
# ==============================================================================
# NITEK CHECKIN — Setup & Auto-launch Script for Seeed Studio reTerminal DM
# Target OS: Raspberry Pi OS 64-bit / Debian 11/12 (ARM64)
# ==============================================================================

set -e

echo "🚀 Bắt đầu cấu hình NITEK Check-in Kiosk trên reTerminal DM..."

# 1. Cập nhật hệ điều hành & cài đặt gói bổ trợ
echo "📦 Cập nhật gói hệ thống..."
sudo apt-get update
sudo apt-get install -y \
  curl \
  git \
  build-essential \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  v4l-utils \
  x11-xserver-utils \
  unclutter

# 2. Cài đặt Node.js 20 LTS (nếu chưa có)
if ! command -v node &> /dev/null; then
  echo "📥 Cài đặt Node.js 20 LTS ARM64..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ NPM version: $(npm -v)"

# 3. Phân quyền Camera & Video cho người dùng hiện tại
CURRENT_USER=$(whoami)
echo "🔒 Cấp quyền Camera (/dev/video*) cho user '$CURRENT_USER'..."
sudo usermod -a -G video "$CURRENT_USER"
sudo usermod -a -G dialout "$CURRENT_USER"
sudo usermod -a -G gpio "$CURRENT_USER"

# 4. Tắt chế độ tắt màn hình / Sleep (Screen Blanking / DPMS)
echo "🖥️ Tắt chế độ tắt màn hình tự động (Kiosk Mode Always ON)..."
mkdir -p ~/.config/lxsession/LXDE-pi/
cat << 'EOF' >> ~/.config/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 3 -root
EOF

# 5. Cài đặt dependencies và build dự án
echo "🔨 Cài đặt dependencies dự án..."
npm install

echo "🏗️ Đóng gói ứng dụng web..."
npm run build

# 6. Cấu hình systemd service để tự chạy khi mở máy
SERVICE_FILE="/etc/systemd/system/checkin-kiosk.service"
CURRENT_DIR=$(pwd)

echo "⚙️ Đăng ký dịch vụ tự khởi động (systemd service)..."
sudo bash -c "cat << EOF > $SERVICE_FILE
[Unit]
Description=NITEK Checkin Kiosk on reTerminal DM
After=network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$CURRENT_USER/.Xauthority
Environment=NODE_ENV=production
WorkingDirectory=$CURRENT_DIR
ExecStartPre=/bin/sleep 3
ExecStart=$(which npm) run electron:start
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable checkin-kiosk.service

echo ""
echo "=========================================================================="
echo "🎉 HOÀN TẤT CẤU HÌNH CHO RETERMINAL DM!"
echo "=========================================================================="
echo "• Khởi chạy ngay thử nghiệm: npm run electron:start"
echo "• Dịch vụ tự khởi động: sudo systemctl start checkin-kiosk.service"
echo "• Xem nhật ký hoạt động: journalctl -u checkin-kiosk.service -f"
echo "• Khởi động lại thiết bị: sudo reboot"
echo "=========================================================================="
