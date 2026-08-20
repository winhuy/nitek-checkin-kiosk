#!/usr/bin/env bash
# ==============================================================================
# reTerminal DM CSI Camera to V4L2 Loopback Streamer Bridge
# Feeds Sony IMX219 libcamera stream into v4l2loopback standard V4L2 device
# ==============================================================================

# Find the loopback device node dynamically
LOOP_DEV=$(v4l2-ctl --list-devices 2>/dev/null | grep -A 1 "reTerminal-CSI-Cam" | grep "/dev/video" | tr -d '\t ' || true)

if [ -z "$LOOP_DEV" ]; then
  LOOP_DEV="/dev/video24"
fi

sudo chmod 666 "$LOOP_DEV" 2>/dev/null || true

# Continuous streaming from Sony IMX219 (libcamerasrc) to loopback device
exec /usr/bin/gst-launch-1.0 libcamerasrc ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! video/x-raw,format=YUY2 ! v4l2sink device="$LOOP_DEV" sync=false
