#!/usr/bin/env bash
# ==============================================================================
# reTerminal DM CSI Camera to V4L2 Loopback Streamer Bridge (MMAP I420)
# ==============================================================================

# Find loopback device
LOOP_DEV=$(v4l2-ctl --list-devices 2>/dev/null | grep -A 1 "reTerminal-CSI-Cam" | grep "/dev/video" | tr -d '\t ' || true)
if [ -z "$LOOP_DEV" ]; then
  LOOP_DEV="/dev/video24"
fi

sudo chmod 666 "$LOOP_DEV" 2>/dev/null || true

# Stream with MMAP (io-mode=2) and I420 format for direct Chromium V4L2 zero-copy compatibility
exec /usr/bin/gst-launch-1.0 -v libcamerasrc ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! video/x-raw,format=I420 ! v4l2sink device="$LOOP_DEV" sync=false io-mode=2
