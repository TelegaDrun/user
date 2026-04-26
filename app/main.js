const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 400,
    height: 700,
    minWidth: 320,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: __dirname + '/../icons/icon.png'
  });
  
  win.loadFile(__dirname + '/../index.html');
  
  win.webContents.on('did-finish-load', () => {
    win.setTitle('TelegaDrun');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});