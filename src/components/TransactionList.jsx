import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Edit3, Check, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Tag, MessageSquare, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'
import { loadFilterPrefs, saveFilterPrefs } from '../utils/storage'

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
        className="group flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg hover:ring-1 hover:ring-indigo-200 dark:hover:ring-indigo-700 transition-all"
        style={{ background: (CATEGORIES[value]?.color || '#94a3b8') + '18' }}
      >
        <span style={{ color: CATEGORIES[value]?.color || '#64748b' }} className="font-medium">
          {CATEGORIES[value]?.icon} {CATEGORIES[value]?.label || value}
        </span>
        <Edit3 size={9} className="opacity-20 group-hover:opacity-60 transition-opacity" style={{ color: CATEGORIES[value]?.color || '#64748b' }} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={val}
        onChange={e => setVal(e.target.value)}
        className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
      >
        {Object.entries(CATEGORIES).map(([k, c]) => (
          <option key={k} value={k}>{c.icon} {c.label}</option>
        ))}
      </select>
      <button onClick={() => { onChange(val); setEditing(false) }} className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
        <Check size={12} />
      </button>
      <button onClick={() => { setVal(value); setEditing(false) }} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
        <X size={12} />
      </button>
    </div>
  )
}

function InlineNote({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)

  function commit() {
    onSave(val.trim())
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }}
        title={value ? value : 'Agregar nota'}
        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${
          value
            ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400'
            : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100'
        }`}
      >
        <MessageSquare size={12} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 min-w-[180px]">
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false) } }}
        onBlur={commit}
        placeholder="Nota…"
        className="flex-1 text-xs border border-indigo-300 dark:border-indigo-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300"
      />
    </div>
  )
}

export default function TransactionList({ transactions, onUpdate }) {
  const prefs = loadFilterPrefs()

  const [searchInput, setSearchInput] = useState(prefs.search || '')
  const [search, setSearch]           = useState(prefs.search || '')
  const searchTimer                   = useRef(null)
  const [filterCat, setFilterCat]     = useState(prefs.filterCat || '')
  const [filterSource, setFilterSource] = useState(prefs.filterSource || '')
  const [dateFrom, setDateFrom]       = useState(prefs.dateFrom || '')
  const [dateTo, setDateTo]           = useState(prefs.dateTo || '')
  const [filterType, setFilterType]   = useState(prefs.filterType || '')
  const [page, setPage]               = useState(1)
  const [sortBy, setSortBy]           = useState('date')
  const [sortDir, setSortDir]         = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Multi-select
  const [selected, setSelected]   = useState(new Set())
  const [bulkCat, setBulkCat]     = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const PER_PAGE = 50
  const hasActiveFilter = searchInput || filterCat || filterType || dateFrom || dateTo || filterSource

  const sources = useMemo(() => [...new Set(transactions.map(t => t.source))].sort(), [transactions])

  // Persist filter prefs
  useEffect(() => {
    saveFilterPrefs({ search: searchInput, filterCat, filterType, dateFrom, dateTo, filterSource })
  }, [searchInput, filterCat, filterType, dateFrom, dateTo, filterSource])

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
    setPage(1)
  }

  function clearFilters() {
    setSearchInput(''); setSearch(''); setFilterCat(''); setFilterSource(''); setFilterType(''); setDateFrom(''); setDateTo(''); setPage(1)
    clearTimeout(searchTimer.current)
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && t.category !== filterCat) return false
      if (filterSource && t.source !== filterSource) return false
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

  const pagedIds = useMemo(() => new Set(paged.map(t => t.id)), [paged])
  const allPageSelected = pagedIds.size > 0 && [...pagedIds].every(id => selected.has(id))
  const someSelected = selected.size > 0

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => { const n = new Set(prev); pagedIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); pagedIds.forEach(id => n.add(id)); return n })
    }
  }

  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function clearSelection() { setSelected(new Set()); setBulkCat(''); setConfirmDelete(false) }

  function applyBulkCategory() {
    if (!bulkCat || selected.size === 0) return
    onUpdate(transactions.map(t => selected.has(t.id) ? { ...t, category: bulkCat } : t))
    clearSelection()
  }

  function bulkDelete() {
    if (!confirmDelete) return setConfirmDelete(true)
    onUpdate(transactions.filter(t => !selected.has(t.id)))
    clearSelection()
  }

  function updateCategory(id, category) {
    onUpdate(transactions.map(t => t.id === id ? { ...t, category } : t))
  }

  function updateNote(id, note) {
    onUpdate(transactions.map(t => t.id === id ? { ...t, note } : t))
  }

  function deleteOne(id) {
    onUpdate(transactions.filter(t => t.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  if (transactions.length === 0) return null

  const Th = ({ field, children, className = '' }) => (
    <th
      className={`pb-3 pr-4 text-slate-400 dark:text-slate-500 font-medium cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300 whitespace-nowrap text-xs uppercase tracking-wide ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">{children}<SortIcon field={field} sortBy={sortBy} sortDir={sortDir} /></span>
    </th>
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">

      {/* Header */}
      <div className="flex flex-wrap gap-2 p-4 pb-3 items-center border-b border-slate-100 dark:border-slate-700">
        <div>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200">Movimientos</span>
          <span className="ml-2 text-sm text-slate-400 dark:text-slate-500">({filtered.length})</span>
          {hasActiveFilter && (
            <span className={`ml-2 text-sm font-semibold ${totalFiltered < 0 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
              · {fmt(Math.abs(totalFiltered))}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${searchInput ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500'}`}>
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar…"
              value={searchInput}
              onChange={e => {
                const v = e.target.value
                setSearchInput(v); setPage(1)
                clearTimeout(searchTimer.current)
                searchTimer.current = setTimeout(() => setSearch(v), 150)
              }}
              className="text-sm bg-transparent outline-none w-36 text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
            {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors ${
              showFilters || (filterCat || filterType || dateFrom || dateTo || filterSource)
                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filtros</span>
            {(filterCat || filterType || dateFrom || dateTo || filterSource) && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {[filterCat, filterType, filterSource, dateFrom || dateTo].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilter && (
            <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20">
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
          </select>
          {sources.length > 1 && (
            <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1) }}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Todas las tarjetas</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">Débitos y créditos</option>
            <option value="debit">Solo débitos</option>
            <option value="credit">Solo créditos</option>
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">{selected.size}</span>
            {selected.size === 1 ? 'movimiento seleccionado' : 'movimientos seleccionados'}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Category assign */}
            <Tag size={14} className="text-indigo-500 shrink-0" />
            <select value={bulkCat} onChange={e => setBulkCat(e.target.value)}
              className="text-sm border border-indigo-200 dark:border-indigo-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">— Categoría —</option>
              {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
            </select>
            <button onClick={applyBulkCategory} disabled={!bulkCat}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 transition-colors">
              <Check size={13} /> Aplicar
            </button>
            {/* Bulk delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">¿Confirmar?</span>
                <button onClick={bulkDelete} className="text-sm px-2 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Eliminar</button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">No</button>
              </div>
            ) : (
              <button onClick={bulkDelete}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                <Trash2 size={13} /> Eliminar
              </button>
            )}
            <button onClick={clearSelection} className="text-sm px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 text-left">
              <th className="pb-3 pr-3 w-8">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer" title="Seleccionar todos" />
              </th>
              <Th field="date">Fecha</Th>
              <Th field="desc">Descripción</Th>
              <Th field="cat">Categoría</Th>
              <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Nota</th>
              <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap hidden lg:table-cell">Origen</th>
              <Th field="amount" className="text-right">Importe</Th>
              <th className="pb-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {paged.map(t => {
              const isCredit   = t.type === 'credit'
              const isSelected = selected.has(t.id)
              return (
                <tr key={t.id} className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors group ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'}`}>
                  <td className="py-2.5 pr-3 w-8">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(t.id)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer" />
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs font-mono">
                    {safeFormat(t.date, 'dd MMM yy', { locale: es })}
                  </td>
                  <td className="py-2.5 pr-4 max-w-xs">
                    <div className="truncate text-slate-700 dark:text-slate-200" title={t.description}>{t.description}</div>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {t.installment && <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">Cuota {t.installment.current}/{t.installment.total}</span>}
                      {isCredit && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">↩ Crédito</span>}
                      {t.originalCurrency && (
                        <span className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold font-mono">
                          {t.originalCurrency} {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.originalAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <EditableCategory value={t.category} onChange={cat => updateCategory(t.id, cat)} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-col gap-0.5">
                      <InlineNote value={t.note} onSave={note => updateNote(t.id, note)} />
                      {t.note && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]" title={t.note}>{t.note}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 max-w-[100px] hidden lg:table-cell">
                    <span className="truncate block text-[11px] text-slate-400 dark:text-slate-500" title={t.source}>{t.source}</span>
                  </td>
                  <td className={`py-2.5 pr-2 text-right font-semibold whitespace-nowrap text-sm ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {isCredit ? '+' : ''}{fmt(t.amount)}
                  </td>
                  <td className="py-2.5 w-8">
                    <button onClick={() => deleteOne(t.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all" title="Eliminar">
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
          <button onClick={() => setPage(p => p + 1)}
            className="w-full py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors font-medium">
            Mostrar más ({filtered.length - paged.length} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
