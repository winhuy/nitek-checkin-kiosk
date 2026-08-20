#!/usr/bin/env bash
# ==============================================================================
# reTerminal DM CSI Camera to V4L2 Loopback Streamer Bridge
# Feeds Sony IMX219 libcamera stream into /dev/video20 standard V4L2 device
# ==============================================================================

# Ensure v4l2loopback module is loaded with video_nr=20
sudo modprobe v4l2loopback devices=1 video_nr=20 card_label="reTerminal-CSI-Cam" exclusive_caps=1 || true

# Run GStreamer pipe to continuously stream from libcamerasrc to v4l2sink
exec /usr/bin/gst-launch-1.0 libcamerasrc ! queue ! videoconvert ! queue ! "video/x-raw,format=YUY2,width=640,height=480,framerate=30/1" ! v4l2sink device=/dev/video20
