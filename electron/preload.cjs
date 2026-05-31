const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // License
  getLicenseStatus:  ()    => ipcRenderer.invoke('license:status'),
  activateLicense:   (key) => ipcRenderer.invoke('license:activate', key),

  // Auto-update
  checkForUpdates:   ()    => ipcRenderer.invoke('updater:check'),
  installUpdate:     ()    => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (cb)  => ipcRenderer.on('update-available',  (_, i) => cb(i)),
  onUpdateProgress:  (cb)  => ipcRenderer.on('download-progress', (_, i) => cb(i)),
  onUpdateReady:     (cb)  => ipcRenderer.on('update-downloaded', (_, i) => cb(i)),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('open:external', url),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
})
