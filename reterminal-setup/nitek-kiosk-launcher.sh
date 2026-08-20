#!/usr/bin/env bash
# ==============================================================================
# NITEK Kiosk Safe Launcher with Health Check & Display Synchronization
# ==============================================================================

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="/home/pi/.Xauthority"

# 1. Chờ màn hình X11 sẵn sàng (tối đa 20s)
for i in $(seq 1 20); do
  if xset q &>/dev/null; then
    break
  fi
  sleep 1
done

# 2. Tắt chế độ tắt màn hình (Screen Blanking / DPMS)
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# 3. Chờ dịch vụ Camera Streamer sẵn sàng (tối đa 15s)
for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:5001/health | grep -q "ok"; then
    break
  fi
  sleep 1
done

# 4. Khởi chạy Ứng dụng Linux Standalone
APP_PATH="/home/pi/nitek-checkin-kiosk/release/linux-arm64-unpacked/qr-checkin-app"

if [ -f "$APP_PATH" ]; then
  exec "$APP_PATH" --no-sandbox "$@"
else
  # Fallback nếu chưa build release
  exec /usr/lib/chromium-browser/chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-pinch http://localhost:4173/?mode=kiosk
fi
