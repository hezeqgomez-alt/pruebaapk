const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const url = require('url')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'GastoTracker',
    show: false,
    backgroundColor: '#f1f5f9',
  })

  const indexPath = path.join(__dirname, 'dist', 'index.html')
  win.loadURL(url.format({ pathname: indexPath, protocol: 'file:', slashes: true }))

  win.once('ready-to-show', () => win.show())

  // Open external links in the default browser, not in the app
  win.webContents.setWindowOpenHandler(({ url: linkUrl }) => {
    if (linkUrl.startsWith('http')) {
      shell.openExternal(linkUrl)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
