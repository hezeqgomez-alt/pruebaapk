import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddTransactionModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    date: today(),
    description: '',
    category: 'otros',
    amount: '',
    type: 'debit',
    note: '',
  })
  const [error, setError] = useState('')

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) return setError('Ingresá una descripción')
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return setError('Ingresá un importe válido mayor a 0')
    if (!form.date) return setError('Ingresá una fecha')

    onAdd({
      id: crypto.randomUUID(),
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount,
      type: form.type,
      note: form.note.trim(),
      installment: null,
      source: 'Ingreso manual',
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
      >

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Plus size={18} className="text-white" />
          </div>
          <div>
            <h2 id="modal-title" className="font-semibold text-slate-800 dark:text-slate-100">Agregar movimiento</h2>
            <p className="text-xs text-slate-400">Ingreso manual de transacción</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="debit">Débito / Gasto</option>
                <option value="credit">Crédito / Devolución</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción *</label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Ej: Almuerzo con cliente"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300"
              autoFocus
            />
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Importe (ARS) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0,00"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {Object.entries(CATEGORIES).map(([k, c]) => (
                  <option key={k} value={k}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="Comentario libre…"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm"
            >
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
