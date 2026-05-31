const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path   = require('path')
const http   = require('http')
const fs     = require('fs')
const { autoUpdater } = require('electron-updater')
const license = require('./license.cjs')

const CORS_HEADERS = {
  'Cross-Origin-Opener-Policy':   'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
}

function startServer(distPath) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0]
      if (urlPath === '/') urlPath = '/index.html'

      const filePath = path.join(distPath, urlPath)
      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(distPath, 'index.html'), (err2, data2) => {
            if (err2) { res.writeHead(404); res.end('Not found'); return }
            res.writeHead(200, { 'Content-Type': 'text/html', ...CORS_HEADERS })
            res.end(data2)
          })
          return
        }
        const ext  = path.extname(filePath)
        const mime = MIME_TYPES[ext] || 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': mime, ...CORS_HEADERS })
        res.end(data)
      })
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

function registerIPC() {
  const userDataPath = app.getPath('userData')

  ipcMain.handle('license:status',   ()       => license.getStatus(userDataPath))
  ipcMain.handle('license:activate', (_, key) => license.activate(userDataPath, key))
  ipcMain.handle('license:trackpdf', ()       => license.trackPDF(userDataPath))

  ipcMain.handle('updater:check',   () => autoUpdater.checkForUpdates().catch(() => null))
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true))

  ipcMain.handle('open:external', (_, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('app:version', () => app.getVersion())
}

// ─── Auto-updater ─────────────────────────────────────────────────────────────

function setupUpdater(win) {
  autoUpdater.autoDownload        = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available',  (i) => win.webContents.send('update-available',  i))
  autoUpdater.on('download-progress', (i) => win.webContents.send('download-progress', i))
  autoUpdater.on('update-downloaded', (i) => win.webContents.send('update-downloaded', i))

  // Check 10 s after startup — avoids blocking the initial load
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 10000)
}

// ─── Window ───────────────────────────────────────────────────────────────────

async function createWindow() {
  const distPath    = path.join(__dirname, '..', 'dist')
  const preloadPath = path.join(__dirname, 'preload.cjs')
  const { port }    = await startServer(distPath)

  const win = new BrowserWindow({
    width:  1280,
    height: 820,
    minWidth:  900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          preloadPath,
    },
    title:           'EasyResumen',
    show:            false,
    backgroundColor: '#f1f5f9',
  })

  win.loadURL(`http://127.0.0.1:${port}`)
  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  setupUpdater(win)
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIPC()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
