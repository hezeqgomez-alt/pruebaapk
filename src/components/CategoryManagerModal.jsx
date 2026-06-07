import { useState } from 'react'
import { X, Plus, Trash2, Check, Tag } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#64748b','#a16207',
]

const ICONS = ['🏷️','🛒','🏠','🚗','✈️','🍔','☕','🎮','💊','🐾','👗','📚','💼','🎁','🔧','💡','🌿','🎵','🏋️','💰','📱','🌐','🔑','🎯','🧾']

function slugify(str) {
  return 'custom_' + str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30)
}

export default function CategoryManagerModal({ customCategories, onChange, onClose }) {
  const [label, setLabel]   = useState('')
  const [icon,  setIcon]    = useState('🏷️')
  const [color, setColor]   = useState('#6366f1')
  const [error, setError]   = useState('')

  function handleAdd() {
    const trimmed = label.trim()
    if (!trimmed) return setError('Ingresá un nombre')
    const key = slugify(trimmed)
    if (CATEGORIES[key] || customCategories[key]) return setError('Ya existe una categoría con ese nombre')
    onChange({ ...customCategories, [key]: { label: trimmed, icon, color } })
    setLabel('')
    setError('')
  }

  function handleDelete(key) {
    const next = { ...customCategories }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <Tag size={17} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex-1">Categorías personalizadas</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* New category form */}
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nueva categoría</p>

            <input
              type="text"
              value={label}
              onChange={e => { setLabel(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ej: Veterinaria, Gym, Regalos..."
              maxLength={30}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Icon picker */}
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Ícono</p>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(em => (
                  <button
                    key={em}
                    onClick={() => setIcon(em)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${icon === em ? 'bg-indigo-100 dark:bg-indigo-900 ring-2 ring-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>

            {/* Preview + Add */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium" style={{ background: color + '22', color }}>
                {icon} {label || 'Vista previa'}
              </div>
              <button
                onClick={handleAdd}
                disabled={!label.trim()}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
          </div>

          {/* Custom categories list */}
          {Object.keys(customCategories).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Tus categorías</p>
              <div className="space-y-1.5">
                {Object.entries(customCategories).map(([key, cat]) => (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: cat.color + '22' }}>
                      {cat.icon}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{cat.label}</span>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                    <button
                      onClick={() => handleDelete(key)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built-in categories reference */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Categorías del sistema ({Object.keys(CATEGORIES).length})</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(CATEGORIES).map(c => (
                <span key={c.label} className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: c.color + '18', color: c.color }}>
                  {c.icon} {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
