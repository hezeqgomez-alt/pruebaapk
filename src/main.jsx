import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// Polyfill for Chromium < 136 (e.g. Electron 42) — pdfjs-dist v5.7 uses these
if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function(key, fn) {
    if (!this.has(key)) this.set(key, fn(key))
    return this.get(key)
  }
}
if (!Map.prototype.getOrInsert) {
  Map.prototype.getOrInsert = function(key, val) {
    if (!this.has(key)) this.set(key, val)
    return this.get(key)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
