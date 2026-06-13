import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Polyfill Map.prototype.getOrInsertComputed for Chromium < 136 (e.g. Electron 42)
// pdfjs-dist v5.7 uses this method in its worker during image rendering
const POLYFILL = `
if(!Map.prototype.getOrInsertComputed){
  Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
}
if(!Map.prototype.getOrInsert){
  Map.prototype.getOrInsert=function(k,v){if(!this.has(k))this.set(k,v);return this.get(k)};
}
`

function pdfjsWorkerPolyfill() {
  return {
    name: 'pdfjs-worker-polyfill',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.includes('pdf.worker') && chunk.type === 'asset') {
          chunk.source = POLYFILL + chunk.source
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), pdfjsWorkerPolyfill()],
  // './' para Electron (rutas relativas en el .exe), '/' para Vercel/web
  base: process.env.ELECTRON_BUILD ? './' : '/',
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Function form required by Rollup 4 (Vite 6+). pdfjs-dist excluded
        // intentionally — it has a separate worker asset that can't be chunked.
        manualChunks(id) {
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('/node_modules/chart.js/') || id.includes('/node_modules/react-chartjs-2/')) {
            return 'vendor-charts'
          }
          if (id.includes('/node_modules/date-fns/')) {
            return 'vendor-date'
          }
        },
      },
    },
  },
})
