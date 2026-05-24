import { useCallback, useState } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

export default function UploadZone({ onFiles }) {
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (pdfs.length === 0) return
    onFiles(pdfs)
  }, [onFiles])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onInput = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <label
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50'}`}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={onInput}
      />
      <Upload className={`mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} size={40} />
      <p className="text-lg font-semibold text-slate-700">
        Arrastrá tus resúmenes de tarjeta aquí
      </p>
      <p className="text-sm text-slate-500 mt-1">o hacé clic para seleccionar archivos PDF</p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {['Galicia', 'BBVA', 'Santander', 'ICBC', 'Naranja X', 'Mercado Pago', 'Amex', 'Itaú', '+más'].map(b => (
          <span key={b} className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">{b}</span>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
        <AlertCircle size={12} /> Los archivos se procesan localmente, nunca se suben a ningún servidor
      </p>
    </label>
  )
}
