#!/usr/bin/env python3
"""
reTerminal DM Ultra-Fast Native MJPEG Camera Streamer with Dynamic Orientation Control
Uses libcamera-vid directly with zero-copy stdout piping and HTTP streaming.
Endpoints:
  - http://127.0.0.1:5001/stream.mjpg (Continuous MJPEG stream @ 30 FPS)
  - http://127.0.0.1:5001/snapshot.jpg (Latest frame JPEG)
  - http://127.0.0.1:5001/health (Healthcheck JSON)
  - http://127.0.0.1:5001/flip (Toggle flip / rotation: ?hflip=0/1&vflip=0/1 or ?rotation=0/180)
"""

import sys
import os
import json
import subprocess
import threading
import time
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 5001
LATEST_FRAME = None
FRAME_LOCK = threading.Lock()
CLIENTS = set()
CONFIG_FILE = "/tmp/camera_orientation.json"

# Default orientation for reTerminal DM (sensor is physically mounted 180 degrees inverted)
CURRENT_CONFIG = {
    "hflip": True,
    "vflip": True,
    "rotation": 180
}

CURRENT_PROCESS = None
PROCESS_LOCK = threading.Lock()


def load_config():
    global CURRENT_CONFIG
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                saved = json.load(f)
                CURRENT_CONFIG.update(saved)
        except Exception:
            pass


def save_config():
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(CURRENT_CONFIG, f)
    except Exception:
        pass


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class MJPEGHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Quiet logging for high throughput

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        global LATEST_FRAME, CURRENT_CONFIG

        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            resp = {
                "status": "ok",
                "camera": "libcamera-vid",
                "config": CURRENT_CONFIG
            }
            self.wfile.write(json.dumps(resp).encode('utf-8') + b'\n')
            return

        if path in ('/flip', '/rotate', '/set_orientation'):
            params = parse_qs(parsed.query)
            changed = False

            if 'hflip' in params:
                val = params['hflip'][0].lower() in ('1', 'true', 'yes')
                if CURRENT_CONFIG['hflip'] != val:
                    CURRENT_CONFIG['hflip'] = val
                    changed = True

            if 'vflip' in params:
                val = params['vflip'][0].lower() in ('1', 'true', 'yes')
                if CURRENT_CONFIG['vflip'] != val:
                    CURRENT_CONFIG['vflip'] = val
                    changed = True

            if 'rotation' in params:
                try:
                    rot = int(params['rotation'][0])
                    if rot in (0, 180) and CURRENT_CONFIG['rotation'] != rot:
                        CURRENT_CONFIG['rotation'] = rot
                        CURRENT_CONFIG['hflip'] = (rot == 180)
                        CURRENT_CONFIG['vflip'] = (rot == 180)
                        changed = True
                except ValueError:
                    pass

            if changed:
                save_config()
                restart_camera_process()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "config": CURRENT_CONFIG}).encode('utf-8') + b'\n')
            return

        if path == '/snapshot.jpg':
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

        if path in ('/stream.mjpg', '/video_feed', '/'):
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


def restart_camera_process():
    global CURRENT_PROCESS
    with PROCESS_LOCK:
        if CURRENT_PROCESS and CURRENT_PROCESS.poll() is None:
            print("[MJPEG Server] Terminating camera process for orientation update...")
            try:
                CURRENT_PROCESS.terminate()
                CURRENT_PROCESS.wait(timeout=2)
            except Exception:
                try:
                    CURRENT_PROCESS.kill()
                except Exception:
                    pass


def build_camera_cmd():
    cmd = [
        '/usr/bin/libcamera-vid',
        '-t', '0',
        '--inline',
        '--width', '640',
        '--height', '480',
        '--framerate', '30',
        '--codec', 'mjpeg',
        '--nopreview'
    ]

    if CURRENT_CONFIG.get('hflip', False):
        cmd.append('--hflip')
    if CURRENT_CONFIG.get('vflip', False):
        cmd.append('--vflip')

    cmd.extend(['-o', '-'])
    return cmd


def capture_loop():
    global LATEST_FRAME, CURRENT_PROCESS

    while True:
        cmd = build_camera_cmd()
        try:
            print(f"[MJPEG Server] Launching: {' '.join(cmd)}")
            with PROCESS_LOCK:
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=65536)
                CURRENT_PROCESS = proc

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

        time.sleep(0.5)


def main():
    load_config()
    print(f"[MJPEG Server] Starting reTerminal DM Camera Service on port {PORT} with orientation: {CURRENT_CONFIG}...")
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
