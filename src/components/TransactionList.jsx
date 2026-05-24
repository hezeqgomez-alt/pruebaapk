import { useState, useMemo } from 'react'
import { Search, Edit3, Check, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function EditableCategory({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
        style={{ background: CATEGORIES[value]?.color + '22', color: CATEGORIES[value]?.color || '#64748b' }}
      >
        {CATEGORIES[value]?.icon} {CATEGORIES[value]?.label || value}
        <Edit3 size={10} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-xs border rounded px-1 py-0.5"
        autoFocus
      >
        {Object.entries(CATEGORIES).map(([k, c]) => (
          <option key={k} value={k}>{c.icon} {c.label}</option>
        ))}
      </select>
      <button onClick={() => { onChange(val); setEditing(false) }} className="text-emerald-600 hover:text-emerald-700">
        <Check size={14} />
      </button>
      <button onClick={() => { setVal(value); setEditing(false) }} className="text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  )
}

export default function TransactionList({ transactions, onUpdate }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 50

  const months = useMemo(() => {
    const s = new Set(transactions.map(t => t.date.slice(0, 7)))
    return [...s].sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && t.category !== filterCat) return false
      if (filterMonth && !t.date.startsWith(filterMonth)) return false
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, search, filterCat, filterMonth])

  const paged = filtered.slice(0, page * PER_PAGE)

  const updateCategory = (id, category) => {
    onUpdate(transactions.map(t => t.id === id ? { ...t, category } : t))
  }

  if (transactions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <h3 className="text-base font-semibold text-slate-700 mr-auto">Movimientos ({filtered.length})</h3>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="text-sm bg-transparent outline-none w-36 text-slate-700 placeholder-slate-400"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => { setFilterCat(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <option key={k} value={k}>{c.icon} {c.label}</option>
          ))}
        </select>
        <select
          value={filterMonth}
          onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">Todos los meses</option>
          {months.map(m => (
            <option key={m} value={m}>{format(parseISO(m + '-01'), 'MMMM yyyy', { locale: es })}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="pb-2 pr-4 text-slate-500 font-medium">Fecha</th>
              <th className="pb-2 pr-4 text-slate-500 font-medium">Descripción</th>
              <th className="pb-2 pr-4 text-slate-500 font-medium">Categoría</th>
              <th className="pb-2 pr-4 text-slate-500 font-medium">Origen</th>
              <th className="pb-2 text-right text-slate-500 font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-4 text-slate-500 whitespace-nowrap text-xs">
                  {format(parseISO(t.date), 'dd MMM yy', { locale: es })}
                </td>
                <td className="py-2 pr-4 text-slate-700 max-w-xs truncate" title={t.description}>
                  {t.description}
                </td>
                <td className="py-2 pr-4">
                  <EditableCategory
                    value={t.category}
                    onChange={(cat) => updateCategory(t.id, cat)}
                  />
                </td>
                <td className="py-2 pr-4 text-xs text-slate-400 max-w-[140px] truncate" title={t.source}>
                  {t.source}
                </td>
                <td className="py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                  {fmt(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > paged.length && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
        >
          Mostrar más ({filtered.length - paged.length} restantes)
        </button>
      )}
    </div>
  )
}
