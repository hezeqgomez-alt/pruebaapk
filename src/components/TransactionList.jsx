import { useState, useMemo } from 'react'
import { Search, Edit3, Check, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function safeFormat(dateStr, fmt, opts) {
  try { return format(parseISO(dateStr), fmt, opts) } catch { return dateStr?.slice(0, 10) || '—' }
}

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <ChevronsUpDown size={12} className="opacity-30" />
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
}

function EditableCategory({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
        style={{ background: (CATEGORIES[value]?.color || '#94a3b8') + '22', color: CATEGORIES[value]?.color || '#64748b' }}
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
        onChange={e => setVal(e.target.value)}
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
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage]           = useState(1)
  const [sortBy, setSortBy]       = useState('date')
  const [sortDir, setSortDir]     = useState('desc')
  const PER_PAGE = 50

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && t.category !== filterCat) return false
      if (filterType && (t.type || 'debit') !== filterType) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    }).sort((a, b) => {
      let va, vb
      if (sortBy === 'date')        { va = a.date; vb = b.date }
      else if (sortBy === 'amount') { va = a.amount; vb = b.amount }
      else if (sortBy === 'desc')   { va = a.description; vb = b.description }
      else if (sortBy === 'cat')    { va = a.category; vb = b.category }
      else { va = a.date; vb = b.date }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, search, filterCat, filterType, dateFrom, dateTo, sortBy, sortDir])

  const paged = filtered.slice(0, page * PER_PAGE)

  const totalFiltered = filtered.reduce((s, t) => {
    return t.type === 'credit' ? s - t.amount : s + t.amount
  }, 0)

  function updateCategory(id, category) {
    onUpdate(transactions.map(t => t.id === id ? { ...t, category } : t))
  }

  function deleteOne(id) {
    onUpdate(transactions.filter(t => t.id !== id))
  }

  if (transactions.length === 0) return null

  const Th = ({ field, children }) => (
    <th
      className="pb-2 pr-4 text-slate-500 font-medium cursor-pointer select-none hover:text-slate-700 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <h3 className="text-base font-semibold text-slate-700 mr-auto">
          Movimientos ({filtered.length})
          <span className={`ml-2 text-sm font-normal ${totalFiltered < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
            · {totalFiltered < 0 ? '-' : ''}{fmt(Math.abs(totalFiltered))}
          </span>
        </h3>

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="text-sm bg-transparent outline-none w-32 text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Category */}
        <select
          value={filterCat}
          onChange={e => { setFilterCat(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <option key={k} value={k}>{c.icon} {c.label}</option>
          ))}
        </select>

        {/* Type */}
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
        >
          <option value="">Débitos y créditos</option>
          <option value="debit">Solo débitos</option>
          <option value="credit">Solo créditos</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 bg-white"
          />
          <span>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 bg-white"
          />
        </div>

        {(search || filterCat || filterType || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setFilterCat(''); setFilterType(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 border border-slate-200 rounded-lg"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <Th field="date">Fecha</Th>
              <Th field="desc">Descripción</Th>
              <Th field="cat">Categoría</Th>
              <th className="pb-2 pr-4 text-slate-500 font-medium">Origen</th>
              <Th field="amount">
                <span className="ml-auto">Importe</span>
              </Th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {paged.map(t => {
              const isCredit = t.type === 'credit'
              return (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap text-xs">
                    {safeFormat(t.date, 'dd MMM yy', { locale: es })}
                  </td>
                  <td className="py-2 pr-4 text-slate-700 max-w-xs">
                    <span className="truncate block" title={t.description}>{t.description}</span>
                    {t.installment && (
                      <span className="text-xs text-blue-500 font-medium">
                        Cuota {t.installment.current}/{t.installment.total}
                      </span>
                    )}
                    {isCredit && (
                      <span className="text-xs text-emerald-600 font-medium ml-1">↩ Crédito</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <EditableCategory value={t.category} onChange={cat => updateCategory(t.id, cat)} />
                  </td>
                  <td className="py-2 pr-4 text-xs text-slate-400 max-w-[120px] truncate" title={t.source}>
                    {t.source}
                  </td>
                  <td className={`py-2 pr-2 text-right font-semibold whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isCredit ? '+' : ''}{fmt(t.amount)}
                  </td>
                  <td className="py-2 w-8">
                    <button
                      onClick={() => deleteOne(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
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
