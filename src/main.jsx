import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// Polyfills for older browsers / Android WebView — pdfjs-dist v5.x requires these
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function() {
    let resolve, reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
}
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
