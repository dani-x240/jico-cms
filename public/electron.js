const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.jinjacollege.cms');
}

function createWindow() {
  const windowIcon = process.platform === 'win32'
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: windowIcon,
    title: 'Jinja College CMS'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
