import { useState, useEffect, useMemo } from 'react'
import { X, CreditCard, FileText, Trash2, Check, Pencil, RotateCcw } from 'lucide-react'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function CardManagerModal({ transactions, cardNames, onCardNamesChange, onDeleteSource, onDeleteFile, onClose }) {
  const [editing, setEditing]       = useState(null)   // source actualmente en edición
  const [draft, setDraft]           = useState('')
  const [confirmDel, setConfirmDel] = useState(null)   // { type: 'card'|'file', key }

  // Tarjetas: agrupadas por source, con conteo + total + último resumen
  const cards = useMemo(() => {
    const map = new Map()
    for (const t of transactions) {
      const k = t.source || '—'
      if (!map.has(k)) map.set(k, { count: 0, total: 0 })
      const e = map.get(k)
      e.count += 1
      if (t.type !== 'credit') e.total += t.amount
    }
    return [...map.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => a.source.localeCompare(b.source))
  }, [transactions])

  // Resúmenes: agrupados por fileName
  const files = useMemo(() => {
    const map = new Map()
    for (const t of transactions) {
      if (!t.fileName) continue
      if (!map.has(t.fileName)) map.set(t.fileName, 0)
      map.set(t.fileName, map.get(t.fileName) + 1)
    }
    return [...map.entries()].map(([fileName, count]) => ({ fileName, count })).sort((a, b) => a.fileName.localeCompare(b.fileName))
  }, [transactions])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function startEdit(source) {
    setEditing(source)
    setDraft(cardNames[source] || '')
  }

  function commitEdit(source) {
    const trimmed = draft.trim()
    const next = { ...cardNames }
    if (trimmed && trimmed !== source) next[source] = trimmed
    else delete next[source]   // vacío o igual al original → quita el alias
    onCardNamesChange(next)
    setEditing(null)
    setDraft('')
  }

  function resetName(source) {
    const next = { ...cardNames }
    delete next[source]
    onCardNamesChange(next)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tarjetas y resúmenes"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <CreditCard size={17} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Tarjetas y resúmenes</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Renombrá o eliminá tus tarjetas y archivos</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Tarjetas ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Tarjetas ({cards.length})
            </p>
            <div className="space-y-1.5">
              {cards.map(({ source, count, total }) => {
                const alias = cardNames[source]
                const isEditing = editing === source
                return (
                  <div key={source} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={draft}
                          autoFocus
                          onChange={e => setDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(source)
                            if (e.key === 'Escape') { setEditing(null); setDraft('') }
                          }}
                          placeholder={source}
                          maxLength={40}
                          className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button onClick={() => commitEdit(source)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setEditing(null); setDraft('') }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-400 shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ) : confirmDel?.type === 'card' && confirmDel.key === source ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          ¿Borrar {count} movimiento{count > 1 ? 's' : ''} de esta tarjeta?
                        </span>
                        <button onClick={() => { onDeleteSource(source); setConfirmDel(null) }} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Borrar</button>
                        <button onClick={() => setConfirmDel(null)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 transition-colors">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                          <CreditCard size={13} className="text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {alias || source}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {alias && <span className="italic">{source} · </span>}
                            {count} mov. · {fmt(total)}
                          </p>
                        </div>
                        {alias && (
                          <button onClick={() => resetName(source)} title="Quitar nombre personalizado"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all shrink-0">
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button onClick={() => startEdit(source)} title="Renombrar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all shrink-0">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDel({ type: 'card', key: source })} title="Eliminar tarjeta"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Resúmenes (archivos) ── */}
          {files.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Resúmenes subidos ({files.length})
              </p>
              <div className="space-y-1.5">
                {files.map(({ fileName, count }) => (
                  <div key={fileName} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
                    {confirmDel?.type === 'file' && confirmDel.key === fileName ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          ¿Borrar {count} movimiento{count > 1 ? 's' : ''} de este resumen?
                        </span>
                        <button onClick={() => { onDeleteFile(fileName); setConfirmDel(null) }} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Borrar</button>
                        <button onClick={() => setConfirmDel(null)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 transition-colors">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                          <FileText size={13} className="text-violet-500 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={fileName}>{fileName}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{count} movimiento{count > 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={() => setConfirmDel({ type: 'file', key: fileName })} title="Eliminar resumen"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                Los resúmenes antiguos (subidos antes de esta versión) pueden no aparecer acá.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
