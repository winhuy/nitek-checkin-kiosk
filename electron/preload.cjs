const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  exitKiosk: () => ipcRenderer.invoke('kiosk:exit'),
  toggleFullscreen: () => ipcRenderer.invoke('kiosk:toggle-fullscreen'),
  rebootSystem: () => ipcRenderer.invoke('system:reboot'),
  shutdownSystem: () => ipcRenderer.invoke('system:shutdown'),
  getVersion: () => ipcRenderer.invoke('app:version'),
});
