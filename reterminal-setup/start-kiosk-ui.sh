#!/usr/bin/env bash
# ==============================================================================
# reTerminal DM Kiosk UI Auto-Launcher
# ==============================================================================

# Wait for X11 and local web server
sleep 4

# Disable screen blanking / power saving
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Hide cursor when idle (if unclutter installed)
unclutter -idle 3 -root & 2>/dev/null || true

# Launch Chromium in Fullscreen Kiosk Mode
exec /usr/bin/chromium-browser \
  --remote-debugging-port=9222 \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --check-for-update-interval=31536000 \
  "http://localhost:4173/?mode=kiosk"
