const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  setFullscreen: (flag) => ipcRenderer.send('set-fullscreen', flag),
  quitApp: () => ipcRenderer.send('quit-app'),
  onFullscreenChange: (callback) => {
    ipcRenderer.on('fullscreen-change', (_event, isFullscreen) => callback(isFullscreen));
  }
});
