#!/usr/bin/env python3
"""
reTerminal DM Ultra-Fast Native MJPEG Camera Streamer
Uses libcamera-vid directly with zero-copy stdout piping and HTTP streaming.
Endpoints:
  - http://127.0.0.1:5001/stream.mjpg (Continuous MJPEG stream @ 30 FPS)
  - http://127.0.0.1:5001/snapshot.jpg (Latest frame JPEG)
  - http://127.0.0.1:5001/health (Healthcheck JSON)
"""

import sys
import os
import subprocess
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 5001
LATEST_FRAME = None
FRAME_LOCK = threading.Lock()
CLIENTS = set()


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class MJPEGHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Quiet logging for high throughput

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        global LATEST_FRAME

        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"ok","camera":"libcamera-vid"}\n')
            return

        if self.path == '/snapshot.jpg':
            with FRAME_LOCK:
                frame = LATEST_FRAME
            if frame is None:
                self.send_error(503, 'Camera initializing')
                return
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Content-Length', str(len(frame)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(frame)
            return

        if self.path in ('/stream.mjpg', '/video_feed', '/'):
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.end_headers()

            last_sent = None
            try:
                while True:
                    with FRAME_LOCK:
                        frame = LATEST_FRAME
                    if frame is not None and frame is not last_sent:
                        self.wfile.write(b'--frame\r\n')
                        self.wfile.write(b'Content-Type: image/jpeg\r\n')
                        self.wfile.write(f'Content-Length: {len(frame)}\r\n\r\n'.encode('ascii'))
                        self.wfile.write(frame)
                        self.wfile.write(b'\r\n')
                        self.wfile.flush()
                        last_sent = frame
                    else:
                        time.sleep(0.01)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        self.send_error(404, 'Not Found')


def capture_loop():
    global LATEST_FRAME

    cmd = [
        '/usr/bin/libcamera-vid',
        '-t', '0',
        '--inline',
        '--width', '640',
        '--height', '480',
        '--framerate', '30',
        '--codec', 'mjpeg',
        '--nopreview',
        '-o', '-'
    ]

    while True:
        try:
            print(f"[MJPEG Server] Launching: {' '.join(cmd)}")
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=65536)
            
            buf = bytearray()
            while proc.poll() is None:
                chunk = proc.stdout.read(8192)
                if not chunk:
                    break
                buf.extend(chunk)

                # Search for JPEG SOI (0xFF, 0xD8) and EOI (0xFF, 0xD9)
                while True:
                    soi = buf.find(b'\xff\xd8')
                    if soi == -1:
                        if len(buf) > 8192:
                            del buf[:-2]
                        break
                    eoi = buf.find(b'\xff\xd9', soi + 2)
                    if eoi == -1:
                        if soi > 0:
                            del buf[:soi]
                        break
                    
                    jpeg_bytes = bytes(buf[soi:eoi + 2])
                    del buf[:eoi + 2]

                    with FRAME_LOCK:
                        LATEST_FRAME = jpeg_bytes

            stderr_out = proc.stderr.read().decode('utf-8', errors='ignore') if proc.stderr else ''
            print(f"[MJPEG Server] Camera process exited with code {proc.returncode}. Stderr: {stderr_out}")
        except Exception as e:
            print(f"[MJPEG Server] Capture loop error: {e}")

        time.sleep(1)


def main():
    print(f"[MJPEG Server] Starting reTerminal DM Camera Service on port {PORT}...")
    t = threading.Thread(target=capture_loop, daemon=True)
    t.start()

    server = ThreadedHTTPServer(('0.0.0.0', PORT), MJPEGHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[MJPEG Server] Shutting down...")
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
