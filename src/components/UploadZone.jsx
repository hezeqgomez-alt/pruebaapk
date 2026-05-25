import { useCallback, useState } from 'react'
import { Upload, ShieldCheck } from 'lucide-react'

const BANKS = ['CABAL', 'VISA', 'Mastercard', 'AMEX', 'Galicia', 'BBVA', 'Santander', 'Naranja X', '+más']

export default function UploadZone({ onFiles, compact }) {
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (pdfs.length === 0) return
    onFiles(pdfs)
  }, [onFiles])

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onInput = (e) => { handleFiles(e.target.files); e.target.value = '' }

  if (compact) {
    return (
      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-indigo-400 bg-indigo-50/80'
            : 'border-slate-200 bg-white/60 hover:border-indigo-300 hover:bg-indigo-50/40'
        }`}
      >
        <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={onInput} />
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          dragging ? 'bg-indigo-100' : 'bg-slate-100'
        }`}>
          <Upload size={15} className={dragging ? 'text-indigo-500' : 'text-slate-400'} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">Agregar más resúmenes</p>
          <p className="text-xs text-slate-400">Arrastrá o hacé clic · PDF</p>
        </div>
      </label>
    )
  }

  return (
    <label
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`block rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-indigo-400 bg-indigo-50/80 shadow-lg shadow-indigo-100'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md hover:shadow-indigo-50'
      }`}
    >
      <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={onInput} />
      <div className="p-10 text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors ${
          dragging
            ? 'bg-indigo-100'
            : 'bg-gradient-to-br from-indigo-50 to-violet-50'
        }`}>
          <Upload size={28} className={dragging ? 'text-indigo-500' : 'text-indigo-400'} />
        </div>

        <p className="text-lg font-semibold text-slate-700 mb-1">
          {dragging ? 'Soltá los archivos aquí' : 'Arrastrá tus resúmenes de tarjeta'}
        </p>
        <p className="text-sm text-slate-400 mb-6">o hacé clic para seleccionar archivos PDF</p>

        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {BANKS.map(b => (
            <span key={b} className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">{b}</span>
          ))}
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Procesamiento 100% local — ningún archivo sale de tu dispositivo</span>
        </div>
      </div>
    </label>
  )
}
