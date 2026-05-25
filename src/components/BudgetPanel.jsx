import { useState, useMemo } from 'react'
import { Target, Edit3, Check, X, AlertTriangle } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'
import { saveBudgets } from '../utils/storage'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function EditBudget({ value, onSave, onCancel }) {
  const [val, setVal] = useState(value ? String(value).replace('.', ',') : '')
  function commit() {
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n) && n > 0) onSave(n)
    else if (val === '' || val === '0') onSave(0)
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
        className="w-28 text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 dark:border-indigo-500 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
        placeholder="0"
      />
      <button onClick={commit} className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
        <Check size={11} />
      </button>
      <button onClick={onCancel} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-600 text-slate-400">
        <X size={11} />
      </button>
    </div>
  )
}

export default function BudgetPanel({ transactions, budgets, onBudgetsChange }) {
  const [editing, setEditing] = useState(null) // categoryKey being edited

  // Determine current period = most recent month in data
  const currentMonth = useMemo(() => {
    const months = transactions.map(t => t.date.slice(0, 7)).sort()
    return months[months.length - 1] || null
  }, [transactions])

  // Spend per category this month (debits only)
  const spendByCategory = useMemo(() => {
    const map = {}
    for (const t of transactions) {
      if (t.type === 'credit') continue
      if (currentMonth && !t.date.startsWith(currentMonth)) continue
      map[t.category] = (map[t.category] || 0) + t.amount
    }
    return map
  }, [transactions, currentMonth])

  // All categories that have spend or a budget
  const categories = useMemo(() => {
    const keys = new Set([...Object.keys(spendByCategory), ...Object.keys(budgets)])
    return [...keys].sort((a, b) => (spendByCategory[b] || 0) - (spendByCategory[a] || 0))
  }, [spendByCategory, budgets])

  function saveBudget(cat, value) {
    const next = { ...budgets, [cat]: value }
    if (!value) delete next[cat]
    onBudgetsChange(next)
    saveBudgets(next)
    setEditing(null)
  }

  const totalSpend = Object.values(spendByCategory).reduce((s, v) => s + v, 0)
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const budgetedCategories = categories.filter(c => budgets[c])
  const overBudget = budgetedCategories.filter(c => (spendByCategory[c] || 0) > budgets[c])

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
        <Target size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-400 dark:text-slate-500 font-medium">Cargá resúmenes para configurar presupuestos</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gastado este mes', value: fmt(totalSpend), sub: currentMonth?.replace('-', '/') || '—', color: 'indigo' },
          { label: 'Presupuesto total', value: totalBudget ? fmt(totalBudget) : 'Sin definir', sub: `${budgetedCategories.length} categ. configuradas`, color: 'violet' },
          { label: 'Disponible', value: totalBudget ? fmt(Math.max(0, totalBudget - totalSpend)) : '—', sub: totalBudget ? `${((totalSpend / totalBudget) * 100).toFixed(0)}% usado` : 'Configurá tu presupuesto', color: totalBudget && totalSpend > totalBudget ? 'red' : 'emerald' },
          { label: 'Categorías sobre límite', value: overBudget.length, sub: overBudget.length ? overBudget.map(c => CATEGORIES[c]?.label).join(', ') : 'Todo dentro del límite', color: overBudget.length ? 'red' : 'emerald' },
        ].map((c, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${
            c.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900' :
            c.color === 'violet' ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900' :
            c.color === 'red'    ? 'bg-red-50 dark:bg-red-950/50 border-red-100 dark:border-red-900' :
            'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900'
          }`}>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{c.label}</div>
            <div className={`text-xl font-extrabold ${
              c.color === 'indigo' ? 'text-indigo-700 dark:text-indigo-300' :
              c.color === 'violet' ? 'text-violet-700 dark:text-violet-300' :
              c.color === 'red'    ? 'text-red-600 dark:text-red-400' :
              'text-emerald-700 dark:text-emerald-300'
            }`}>{c.value}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Category rows */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
            <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Presupuesto por categoría</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Hacé clic en el lápiz para editar</span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {categories.map(cat => {
            const spend   = spendByCategory[cat] || 0
            const budget  = budgets[cat] || 0
            const pct     = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
            const over    = budget > 0 && spend > budget
            const near    = budget > 0 && pct >= 80 && !over
            const barColor = over ? 'bg-red-500' : near ? 'bg-amber-400' : 'bg-indigo-500'
            const catDef  = CATEGORIES[cat]

            return (
              <div key={cat} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  {/* Icon + name */}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: (catDef?.color || '#94a3b8') + '22' }}>
                    {catDef?.icon || '📦'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
                    {catDef?.label || cat}
                  </span>

                  {/* Spend */}
                  <span className={`text-sm font-semibold ${over ? 'text-red-600 dark:text-red-400' : near ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {fmt(spend)}
                  </span>

                  {/* Budget display / edit */}
                  {editing === cat ? (
                    <EditBudget
                      value={budget}
                      onSave={v => saveBudget(cat, v)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {budget ? `/ ${fmt(budget)}` : '/ sin límite'}
                      </span>
                      <button
                        onClick={() => setEditing(cat)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all"
                        title="Editar presupuesto"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  )}

                  {/* Alert icon */}
                  {(over || near) && (
                    <AlertTriangle size={14} className={over ? 'text-red-500' : 'text-amber-400'} />
                  )}
                </div>

                {/* Progress bar */}
                {budget > 0 && (
                  <div className="ml-10">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{pct.toFixed(0)}% usado</span>
                      {over && <span className="text-[10px] text-red-500 font-medium">+{fmt(spend - budget)} sobre el límite</span>}
                      {near && !over && <span className="text-[10px] text-amber-500 font-medium">Cerca del límite</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
