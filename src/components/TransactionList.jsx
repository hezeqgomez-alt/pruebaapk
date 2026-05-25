import { useState, useMemo } from 'react'
import { Search, Edit3, Check, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function safeFormat(dateStr, fmtStr, opts) {
  try { return format(parseISO(dateStr), fmtStr, opts) } catch { return dateStr?.slice(0, 10) || '—' }
}

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <ChevronsUpDown size={11} className="opacity-30" />
  return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
}

function EditableCategory({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg hover:ring-1 hover:ring-indigo-200 transition-all"
        style={{ background: (CATEGORIES[value]?.color || '#94a3b8') + '18' }}
      >
        <span style={{ color: CATEGORIES[value]?.color || '#64748b' }} className="font-medium">
          {CATEGORIES[value]?.icon} {CATEGORIES[value]?.label || value}
        </span>
        <Edit3 size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: CATEGORIES[value]?.color || '#64748b' }} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={val}
        onChange={e => setVal(e.target.value)}
        className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
      >
        {Object.entries(CATEGORIES).map(([k, c]) => (
          <option key={k} value={k}>{c.icon} {c.label}</option>
        ))}
      </select>
      <button onClick={() => { onChange(val); setEditing(false) }} className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200">
        <Check size={12} />
      </button>
      <button onClick={() => { setVal(value); setEditing(false) }} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200">
        <X size={12} />
      </button>
    </div>
  )
}

export default function TransactionList({ transactions, onUpdate }) {
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage]             = useState(1)
  const [sortBy, setSortBy]         = useState('date')
  const [sortDir, setSortDir]       = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  const PER_PAGE = 50

  const hasActiveFilter = search || filterCat || filterType || dateFrom || dateTo

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
    setPage(1)
  }

  function clearFilters() {
    setSearch(''); setFilterCat(''); setFilterType(''); setDateFrom(''); setDateTo(''); setPage(1)
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

  const Th = ({ field, children, className = '' }) => (
    <th
      className={`pb-3 pr-4 text-slate-400 font-medium cursor-pointer select-none hover:text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap gap-2 p-4 pb-3 items-center border-b border-slate-100">
        <div>
          <span className="text-base font-semibold text-slate-700">Movimientos</span>
          <span className="ml-2 text-sm text-slate-400">({filtered.length})</span>
          {hasActiveFilter && (
            <span className={`ml-2 text-sm font-semibold ${totalFiltered < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
              · {fmt(Math.abs(totalFiltered))}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${search ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar descripción…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none w-36 text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="text-slate-300 hover:text-slate-500">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors ${
              showFilters || (filterCat || filterType || dateFrom || dateTo)
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filtros</span>
            {(filterCat || filterType || dateFrom || dateTo) && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {[filterCat, filterType, dateFrom || dateTo].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-2 border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <select
            value={filterCat}
            onChange={e => { setFilterCat(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>{c.icon} {c.label}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Débitos y créditos</option>
            <option value="debit">Solo débitos</option>
            <option value="credit">Solo créditos</option>
          </select>

          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <Th field="date">Fecha</Th>
              <Th field="desc">Descripción</Th>
              <Th field="cat">Categoría</Th>
              <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">Origen</th>
              <Th field="amount" className="text-right">Importe</Th>
              <th className="pb-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {paged.map(t => {
              const isCredit = t.type === 'credit'
              return (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap text-xs font-mono">
                    {safeFormat(t.date, 'dd MMM yy', { locale: es })}
                  </td>
                  <td className="py-2.5 pr-4 max-w-xs">
                    <div className="truncate text-slate-700" title={t.description}>{t.description}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      {t.installment && (
                        <span className="text-[10px] text-indigo-500 font-semibold">
                          Cuota {t.installment.current}/{t.installment.total}
                        </span>
                      )}
                      {isCredit && (
                        <span className="text-[10px] text-emerald-600 font-semibold">↩ Crédito</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <EditableCategory value={t.category} onChange={cat => updateCategory(t.id, cat)} />
                  </td>
                  <td className="py-2.5 pr-4 max-w-[110px]">
                    <span className="truncate block text-[11px] text-slate-400" title={t.source}>{t.source}</span>
                  </td>
                  <td className={`py-2.5 pr-2 text-right font-semibold whitespace-nowrap text-sm ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isCredit ? '+' : ''}{fmt(t.amount)}
                  </td>
                  <td className="py-2.5 w-8">
                    <button
                      onClick={() => deleteOne(t.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > paged.length && (
        <div className="p-4 pt-3">
          <button
            onClick={() => setPage(p => p + 1)}
            className="w-full py-2.5 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors font-medium"
          >
            Mostrar más ({filtered.length - paged.length} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
