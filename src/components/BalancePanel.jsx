import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react'

const STORAGE_KEY = 'easyresumen_balance'

const fmt = n => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { expenses: [], incomes: [] }
    return JSON.parse(raw)
  } catch {
    return { expenses: [], incomes: [] }
  }
}

function EntryForm({ label, onAdd, color }) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const n = parseFloat(amount.replace(/[.,]/g, m => m === '.' && amount.includes(',') ? '' : m === ',' ? '.' : ''))
    if (!desc.trim() || isNaN(n) || n <= 0) return
    onAdd({ id: Date.now(), description: desc.trim(), amount: n })
    setDesc('')
    setAmount('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="text"
        placeholder="Descripción"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600"
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Monto"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-32 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600"
      />
      <button
        type="submit"
        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-white transition-colors ${color}`}
      >
        <Plus size={14} />
        {label}
      </button>
    </form>
  )
}

export default function BalancePanel({ transactions }) {
  const [entries, setEntries] = useState(loadEntries)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  // Card totals grouped by source
  const bySource = {}
  for (const t of transactions) {
    if (t.type === 'credit') continue
    bySource[t.source] = (bySource[t.source] || 0) + t.amount
  }
  const cardEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1])
  const cardTotal = cardEntries.reduce((s, [, v]) => s + v, 0)

  const manualExpenseTotal = entries.expenses.reduce((s, e) => s + e.amount, 0)
  const incomeTotal = entries.incomes.reduce((s, e) => s + e.amount, 0)
  const totalExpenses = cardTotal + manualExpenseTotal
  const balance = incomeTotal - totalExpenses
  const balancePositive = balance >= 0

  const addExpense = entry => setEntries(prev => ({ ...prev, expenses: [...prev.expenses, entry] }))
  const addIncome  = entry => setEntries(prev => ({ ...prev, incomes:  [...prev.incomes,  entry] }))
  const removeExpense = id => setEntries(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }))
  const removeIncome  = id => setEntries(prev => ({ ...prev, incomes:  prev.incomes.filter(e => e.id !== id)  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Balance summary card */}
      <div className={`rounded-2xl p-5 border-2 ${balancePositive
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
        : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className={balancePositive ? 'text-emerald-600' : 'text-red-500'} />
          <h2 className={`text-base font-bold ${balancePositive ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
            Balance del período
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Total gastos</div>
            <div className="text-xl font-extrabold text-red-600 dark:text-red-400">{fmt(totalExpenses)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Total ingresos</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{fmt(incomeTotal)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Balance</div>
            <div className={`text-2xl font-extrabold ${balancePositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
              {balancePositive ? '+' : ''}{fmt(balance)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* GASTOS column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={17} className="text-red-500" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Gastos</h3>
            <span className="ml-auto text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalExpenses)}</span>
          </div>

          {/* Card totals */}
          {cardEntries.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tarjetas / Resúmenes cargados</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {cardEntries.map(([source, total]) => (
                  <li key={source} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900/40">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-3">{source}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">{fmt(total)}</span>
                  </li>
                ))}
                {cardEntries.length > 1 && (
                  <li className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subtotal tarjetas</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(cardTotal)}</span>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
              Cargá un resumen PDF para ver los totales por tarjeta
            </div>
          )}

          {/* Manual expenses */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Gastos manuales</span>
              {entries.expenses.length > 0 && (
                <span className="text-xs font-bold text-red-500">{fmt(manualExpenseTotal)}</span>
              )}
            </div>
            {entries.expenses.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.expenses.map(e => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900/40 group">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-3">{e.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fmt(e.amount)}</span>
                      <button
                        onClick={() => removeExpense(e.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">Sin gastos manuales aún.</p>
            )}
            <div className="px-4 pb-4 pt-1 bg-white dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
              <EntryForm label="Gasto" onAdd={addExpense} color="bg-red-500 hover:bg-red-600" />
            </div>
          </div>
        </div>

        {/* INGRESOS column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Ingresos</h3>
            <span className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(incomeTotal)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ingresos del período</span>
              {entries.incomes.length > 0 && (
                <span className="text-xs font-bold text-emerald-500">{fmt(incomeTotal)}</span>
              )}
            </div>
            {entries.incomes.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.incomes.map(e => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900/40 group">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-3">{e.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fmt(e.amount)}</span>
                      <button
                        onClick={() => removeIncome(e.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">Sin ingresos cargados aún.</p>
            )}
            <div className="px-4 pb-4 pt-1 bg-white dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
              <EntryForm label="Ingreso" onAdd={addIncome} color="bg-emerald-500 hover:bg-emerald-600" />
            </div>
          </div>

          {/* Tip box */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-3">
            <div className="flex items-start gap-2">
              <Wallet size={14} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
                Sumá tus ingresos del período (sueldo, freelance, alquiler cobrado, etc.) para ver el balance real frente a tus gastos.
                Los datos se guardan localmente y persisten entre sesiones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
