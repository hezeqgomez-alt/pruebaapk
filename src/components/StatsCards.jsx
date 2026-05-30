import { TrendingUp, TrendingDown, CreditCard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function safeFormat(dateStr, fmtStr, opts) {
  try { return format(parseISO(dateStr), fmtStr, opts) } catch { return dateStr?.slice(0, 7) || '' }
}

export default function StatsCards({ transactions }) {
  if (transactions.length === 0) return null

  const debits  = transactions.filter(t => t.type !== 'credit')
  const credits = transactions.filter(t => t.type === 'credit')

  const totalDebits  = debits.reduce((s, t) => s + t.amount, 0)
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0)
  const net = totalDebits - totalCredits

  const byMonth = {}
  for (const t of debits) {
    const key = t.date.slice(0, 7)
    byMonth[key] = (byMonth[key] || 0) + t.amount
  }
  const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  const lastMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const trend = prevMonth ? ((lastMonth[1] - prevMonth[1]) / prevMonth[1]) * 100 : null

  const sources = [...new Set(transactions.map(t => t.source))]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* Total gastos */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200/50">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowDownCircle size={18} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Gastos</span>
        </div>
        <div className="text-2xl font-extrabold leading-none mb-1">{fmt(totalDebits)}</div>
        <div className="text-xs opacity-70">{debits.length} movimientos</div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      </div>

      {/* Créditos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
            <ArrowUpCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Créditos</span>
        </div>
        <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-1">{fmt(totalCredits)}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {credits.length > 0
            ? <span>Neto: <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(net)}</span></span>
            : 'Sin créditos'}
        </div>
      </div>

      {/* Variación */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            trend === null ? 'bg-slate-50 dark:bg-slate-700' : trend > 0 ? 'bg-red-50 dark:bg-red-900/40' : 'bg-emerald-50 dark:bg-emerald-900/40'
          }`}>
            {trend === null
              ? <TrendingUp size={18} className="text-slate-400" />
              : trend > 0
              ? <TrendingUp size={18} className="text-red-500" />
              : <TrendingDown size={18} className="text-emerald-600 dark:text-emerald-400" />}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Variación</span>
        </div>
        <div className={`text-2xl font-extrabold leading-none mb-1 ${
          trend === null ? 'text-slate-400' : trend > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%` : '—'}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {lastMonth
            ? safeFormat(lastMonth[0] + '-01', "MMM ''yy", { locale: es }) + ' vs mes anterior'
            : 'vs mes anterior'}
        </div>
      </div>

      {/* Fuentes */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
            <CreditCard size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tarjetas</span>
        </div>
        <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-1">{sources.length}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={sources.join(', ')}>
          {sources.slice(0, 2).join(', ')}{sources.length > 2 ? ` +${sources.length - 2}` : ''}
        </div>
      </div>

    </div>
  )
}
