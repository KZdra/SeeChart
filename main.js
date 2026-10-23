const { app, BrowserWindow, Menu, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');

// Prevent multiple instances on stage
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let sleepBlockerId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0a0b10', // Dark stage background to avoid startup flashes
    fullscreen: true,           // Start in Fullscreen mode directly on launch
    autoHideMenuBar: true,
    show: false,
    title: 'SeeChart — Live Stage Sheet & Chord Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false         // Disable spellcheck to avoid red squiggles under chords and lyrics
    }
  });

  // Remove default application menu bar for an immersive stage experience
  Menu.setApplicationMenu(null);

  // Load the main SeeChart single-page app
  mainWindow.loadFile('index.html');

  // Smooth show when ready to avoid white flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Keep screen awake while on stage (native OS power save blocker)
  try {
    sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    console.log('[SeeChart] Screen power save blocker active (ID:', sleepBlockerId, ')');
  } catch (err) {
    console.warn('[SeeChart] Unable to start power save blocker:', err);
  }

  // Forward fullscreen changes to renderer
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', true);
    }
  });

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('set-fullscreen', (_event, flag) => {
  if (mainWindow) {
    mainWindow.setFullScreen(Boolean(flag));
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('will-quit', () => {
  if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) {
    powerSaveBlocker.stop(sleepBlockerId);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
