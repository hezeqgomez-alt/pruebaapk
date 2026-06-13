import { useState, useMemo, useEffect, useRef, memo } from 'react'
import { Search, Edit3, Check, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Tag, MessageSquare, AlertTriangle, Info } from 'lucide-react'
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

function EditableCategory({ value, onChange, allCategories }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const cat = allCategories[value]

  if (!editing) {
    return (
      <button
        onClick={() => { setVal(value); setEditing(true) }}
        className="group flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg hover:ring-1 hover:ring-indigo-200 dark:hover:ring-indigo-700 transition-all"
        style={{ background: (cat?.color || '#94a3b8') + '18' }}
      >
        <span style={{ color: cat?.color || '#64748b' }} className="font-medium">
          {cat?.icon} {cat?.label || value}
        </span>
        <Edit3 size={9} className="opacity-20 group-hover:opacity-60 transition-opacity" style={{ color: cat?.color || '#64748b' }} />
      </button>
    )
  }

  const systemEntries = Object.entries(CATEGORIES)
  const customEntries = Object.entries(allCategories).filter(([k]) => !CATEGORIES[k])

  return (
    <div className="flex items-center gap-1">
      <select
        value={val}
        onChange={e => setVal(e.target.value)}
        className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
      >
        <optgroup label="Sistema">
          {systemEntries.map(([k, c]) => (
            <option key={k} value={k}>{c.icon} {c.label}</option>
          ))}
        </optgroup>
        {customEntries.length > 0 && (
          <optgroup label="Mis categorías">
            {customEntries.map(([k, c]) => (
              <option key={k} value={k}>{c.icon} {c.label}</option>
            ))}
          </optgroup>
        )}
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
        aria-label={value ? 'Editar nota' : 'Agregar nota'}
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
    <div className="flex items-center gap-1 w-full max-w-[180px]">
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

function SourceFilter({ sources, selected, onChange, cardNames = {} }) {
  const dn = s => cardNames[s] || s
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function handleKeyDown(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const allSelected = selected.length === 0
  const label = allSelected
    ? 'Todas las tarjetas'
    : selected.length === 1
      ? dn(selected[0])
      : `${selected.length} de ${sources.length} tarjetas`

  function toggle(source) {
    if (selected.includes(source)) onChange(selected.filter(s => s !== source))
    else onChange([...selected, source])
  }

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filtrar por tarjeta: ${label}`}
        className={`flex items-center justify-between gap-2 text-sm border rounded-xl px-3 py-1.5 w-full sm:w-52 text-left transition-colors
          ${selected.length > 0
            ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          {/* All / None shortcuts */}
          <div className="flex gap-0 border-b border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors
                ${allSelected
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onChange([...sources])}
              className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors border-l border-slate-100 dark:border-slate-700
                ${!allSelected && selected.length === sources.length
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Seleccionar todas
            </button>
          </div>
          {/* Checkboxes */}
          <ul className="max-h-60 overflow-y-auto">
            {sources.map(source => {
              const checked = selected.includes(source)
              return (
                <li key={source}>
                  <label className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none transition-colors
                    ${checked
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(source)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer shrink-0"
                    />
                    <span className={`text-sm truncate ${checked ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {dn(source)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function Th({ field, children, className = '', sortBy, sortDir, onSort }) {
  const isActive = sortBy === field
  return (
    <th
      className={`pb-3 pr-4 text-slate-400 dark:text-slate-500 font-medium cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300 whitespace-nowrap text-xs uppercase tracking-wide ${className}`}
      onClick={() => onSort(field)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(field) } }}
      tabIndex={0}
      role="columnheader"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1">{children}<SortIcon field={field} sortBy={sortBy} sortDir={sortDir} /></span>
    </th>
  )
}

function TransactionList({ transactions, onUpdate, onFilteredChange, customCategories = {}, cardNames = {} }) {
  const allCategories = useMemo(() => ({ ...CATEGORIES, ...customCategories }), [customCategories])
  const dn = s => cardNames[s] || s
  const [_p] = useState(loadFilterPrefs)
  const [searchInput, setSearchInput] = useState(_p.search || '')
  const [search, setSearch]           = useState(_p.search || '')
  const searchTimer                   = useRef(null)
  const [filterCat, setFilterCat]     = useState(_p.filterCat || '')
  const [filterSources, setFilterSources] = useState(() => Array.isArray(_p.filterSources) ? _p.filterSources : [])
  const [dateFrom, setDateFrom]       = useState(_p.dateFrom || '')
  const [dateTo, setDateTo]           = useState(_p.dateTo || '')
  const [filterType, setFilterType]   = useState(_p.filterType || '')
  const [page, setPage]               = useState(1)
  const [sortBy, setSortBy]           = useState('date')
  const [sortDir, setSortDir]         = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Multi-select
  const [selected, setSelected]   = useState(new Set())
  const [bulkCat, setBulkCat]     = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Undo toast
  const deletedRef   = useRef([])
  const undoTimerRef = useRef(null)
  const [undoCount, setUndoCount] = useState(0)

  const PER_PAGE = 50
  const hasActiveFilter = searchInput || filterCat || filterType || dateFrom || dateTo || filterSources.length > 0

  const sources = useMemo(() => [...new Set(transactions.map(t => t.source))].sort(), [transactions])

  // Persist filter prefs
  useEffect(() => {
    saveFilterPrefs({ search: searchInput, filterCat, filterType, dateFrom, dateTo, filterSources })
  }, [searchInput, filterCat, filterType, dateFrom, dateTo, filterSources])

  useEffect(() => () => clearTimeout(undoTimerRef.current), [])

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
    setPage(1)
  }

  function clearFilters() {
    setSearchInput(''); setSearch(''); setFilterCat(''); setFilterSources([]); setFilterType(''); setDateFrom(''); setDateTo(''); setPage(1)
    clearTimeout(searchTimer.current)
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && t.category !== filterCat) return false
      if (filterSources.length > 0 && !filterSources.includes(t.source)) return false
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
  }, [transactions, search, filterCat, filterSources, filterType, dateFrom, dateTo, sortBy, sortDir])

  // Notify parent of current filtered list so it can use it for report generation
  useEffect(() => { onFilteredChange?.(filtered) }, [filtered, onFilteredChange])

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
    onUpdate(prev => prev.map(t => selected.has(t.id) ? { ...t, category: bulkCat } : t))
    clearSelection()
  }

  function bulkDelete() {
    if (!confirmDelete) return setConfirmDelete(true)
    const removed = transactions.filter(t => selected.has(t.id))
    deletedRef.current = removed
    onUpdate(prev => prev.filter(t => !selected.has(t.id)))
    clearSelection()
    clearTimeout(undoTimerRef.current)
    setUndoCount(removed.length)
    undoTimerRef.current = setTimeout(() => {
      setUndoCount(0)
      deletedRef.current = []
    }, 5000)
  }

  function handleUndo() {
    clearTimeout(undoTimerRef.current)
    const toRestore = deletedRef.current
    deletedRef.current = []
    setUndoCount(0)
    if (toRestore.length > 0) {
      onUpdate(prev => [...prev, ...toRestore])
    }
  }

  function updateCategory(id, category) {
    onUpdate(prev => prev.map(t => t.id === id ? { ...t, category, userCat: true } : t))
  }

  function updateNote(id, note) {
    onUpdate(prev => prev.map(t => t.id === id ? { ...t, note } : t))
  }

  function deleteOne(id) {
    onUpdate(prev => prev.filter(t => t.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  if (transactions.length === 0) return null

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

        <div className="ml-auto flex items-center gap-2 flex-wrap" data-tour="transaction-search">
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
              showFilters || (filterCat || filterType || dateFrom || dateTo || filterSources.length > 0)
                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filtros</span>
            {(filterCat || filterType || dateFrom || dateTo || filterSources.length > 0) && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {[filterCat, filterType, filterSources.length > 0 ? '1' : '', dateFrom || dateTo].filter(Boolean).length}
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
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full sm:w-auto">
            <option value="">Todas las categorías</option>
            {Object.entries(allCategories).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
          </select>
          {sources.length > 1 && (
            <SourceFilter
              sources={sources}
              selected={filterSources}
              onChange={v => { setFilterSources(v); setPage(1) }}
              cardNames={cardNames}
            />
          )}
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full sm:w-auto">
            <option value="">Débitos y créditos</option>
            <option value="debit">Solo débitos</option>
            <option value="credit">Solo créditos</option>
          </select>
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 flex-1 min-w-0" />
            <span className="text-slate-300 dark:text-slate-600 shrink-0">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 flex-1 min-w-0" />
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
              {Object.entries(allCategories).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
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

      {/* Mobile cards — visible only on small screens */}
      <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
        {filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
            <Search size={24} className="opacity-30" />
            <p className="text-sm font-medium">Sin resultados</p>
            <button onClick={clearFilters} className="text-xs text-indigo-500 underline underline-offset-2">Limpiar filtros</button>
          </div>
        ) : paged.map(t => {
          const isCredit = t.type === 'credit'
          return (
            <div key={t.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                  {safeFormat(t.date, 'dd MMM yy', { locale: es })}
                  {t.source && <span className="ml-1.5 not-italic font-sans">· {dn(t.source)}</span>}
                </p>
                <div className="mt-1.5">
                  <EditableCategory value={t.category} onChange={cat => updateCategory(t.id, cat)} allCategories={allCategories} />
                </div>
                {t.installment && (
                  <span className="inline-flex text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full mt-0.5">
                    Cuota {t.installment.current}/{t.installment.total}
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                <span className={`text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {isCredit ? '+' : ''}{fmt(t.amount)}
                </span>
                <button
                  onClick={() => deleteOne(t.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table — hidden on mobile */}
      <div className="hidden sm:block relative overflow-x-auto px-4 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-white dark:after:from-slate-800 after:to-transparent sm:after:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 text-left">
              <th className="pb-3 pr-3 w-8">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer" title="Seleccionar todos" />
              </th>
              <Th field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Fecha</Th>
              <Th field="desc" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Descripción</Th>
              <Th field="cat" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Categoría</Th>
              <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Nota</th>
              <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap hidden lg:table-cell">
                <span className="flex items-center gap-1">
                  Origen
                  <Info size={11} className="opacity-50" title="Filtrá por tarjeta usando el botón Filtros ↑" />
                </span>
              </th>
              <Th field="amount" className="text-right" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Importe</Th>
              <th className="pb-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                    <Search size={28} className="opacity-30" />
                    <p className="text-sm font-medium">Sin resultados para los filtros aplicados</p>
                    <button
                      onClick={clearFilters}
                      className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map(t => {
                const isCredit   = t.type === 'credit'
                const isSelected = selected.has(t.id)
                return (
                  <tr key={t.id} className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors group ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-[inset_3px_0_0_#6366f1] dark:shadow-[inset_3px_0_0_#818cf8]' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'}`}>
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
                        {t.installment && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full">Cuota {t.installment.current}/{t.installment.total}</span>}
                        {isCredit && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded-full">↩ Crédito</span>}
                        {t.originalCurrency && (
                          <span className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold font-mono">
                            {t.originalCurrency} {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.originalAmount)}
                          </span>
                        )}
                        {t.source && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium lg:hidden truncate max-w-[140px]" title={t.cardHolder ? `${dn(t.source)} · ${t.cardHolder}` : dn(t.source)}>
                            {dn(t.source)}{t.cardHolder ? ` · ${t.cardHolder}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <EditableCategory value={t.category} onChange={cat => updateCategory(t.id, cat)} allCategories={allCategories} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-col gap-0.5">
                        <InlineNote value={t.note} onSave={note => updateNote(t.id, note)} />
                        {t.note && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]" title={t.note}>{t.note}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 max-w-[120px] hidden lg:table-cell">
                      <span className="truncate block text-[11px] text-slate-400 dark:text-slate-500" title={t.cardHolder ? `${dn(t.source)} · ${t.cardHolder}` : dn(t.source)}>{dn(t.source)}</span>
                      {t.cardHolder && <span className="truncate block text-[10px] text-slate-300 dark:text-slate-600">{t.cardHolder}</span>}
                    </td>
                    <td className={`py-2.5 pr-2 text-right font-semibold whitespace-nowrap text-sm tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {isCredit ? '+' : ''}{fmt(t.amount)}
                    </td>
                    <td className="py-2.5 w-10">
                      <button onClick={() => deleteOne(t.id)}
                        aria-label="Eliminar movimiento"
                        className="opacity-20 group-hover:opacity-100 focus:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>{/* end desktop table */}

      {filtered.length > paged.length && (
        <div className="p-4 pt-3">
          <button onClick={() => setPage(p => p + 1)}
            className="w-full py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors font-medium">
            Mostrar más ({filtered.length - paged.length} restantes)
          </button>
        </div>
      )}

      {undoCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-slate-800 dark:bg-slate-700 text-white text-sm border border-slate-600 dark:border-slate-500">
          <Trash2 size={14} className="text-slate-300 shrink-0" />
          <span className="whitespace-nowrap">{undoCount} movimiento{undoCount > 1 ? 's' : ''} eliminado{undoCount > 1 ? 's' : ''}</span>
          <button
            onClick={handleUndo}
            className="ml-1 px-3 py-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Deshacer
          </button>
          <button
            onClick={() => { clearTimeout(undoTimerRef.current); setUndoCount(0); deletedRef.current = [] }}
            aria-label="Cerrar"
            className="w-5 h-5 flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(TransactionList)
