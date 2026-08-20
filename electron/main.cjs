const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { exec } = require('child_process');

// ── Ozone Platform & Display Fallback (Supports Wayland & X11 on Raspberry Pi OS) ──
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
app.commandLine.appendSwitch('no-sandbox');

// Ensure DISPLAY is set to :0 if running from headless SSH session
if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  process.env.DISPLAY = ':0';
}

// ── Linux Touchscreen & Hardware Flags for reTerminal DM (Raspberry Pi CM4) ──
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('enable-touch-drag-drop');
app.commandLine.appendSwitch('disable-pinch'); // Disable accidental pinch-to-zoom in Kiosk
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const isWindowed = process.argv.includes('--windowed') || process.argv.includes('--debug');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    fullscreen: !isWindowed,
    kiosk: !isWindowed,
    autoHideMenuBar: true,
    backgroundColor: '#070b14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false, // Keep smooth 60fps scanning in background
    },
  });

  // ── Auto-grant Camera / Media Permissions for WebRTC on Linux ──────────
  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'camera', 'microphone', 'notifications', 'mediaKeySystem'];
    callback(allowed.includes(permission));
  });

  ses.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media' || permission === 'camera';
  });

  ses.setDevicePermissionHandler(() => true);

  // ── Load Application ──────────────────────────────────────────────────
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${devServerUrl}?mode=kiosk`);
    if (isWindowed) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { mode: 'kiosk' },
    });
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer log] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Load Error] ${errorCode}: ${errorDescription}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isWindowed) {
      mainWindow.setFullScreen(true);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC Handlers for Kiosk Control ─────────────────────────────────────────
ipcMain.handle('kiosk:exit', () => {
  if (mainWindow) {
    if (mainWindow.isKiosk()) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
    } else {
      app.quit();
    }
  }
});

ipcMain.handle('kiosk:toggle-fullscreen', () => {
  if (mainWindow) {
    const isFull = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFull);
    mainWindow.setKiosk(!isFull);
    return !isFull;
  }
  return false;
});

ipcMain.handle('system:reboot', () => {
  if (process.platform === 'linux') {
    exec('sudo reboot', (err) => {
      if (err) console.error('Reboot failed:', err);
    });
  }
});

ipcMain.handle('system:shutdown', () => {
  if (process.platform === 'linux') {
    exec('sudo shutdown -h now', (err) => {
      if (err) console.error('Shutdown failed:', err);
    });
  }
});

ipcMain.handle('app:version', () => app.getVersion());
