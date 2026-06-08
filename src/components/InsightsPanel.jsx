import { useState } from 'react'
import { AlertTriangle, RefreshCw, TrendingUp, Zap, CheckCircle2, PiggyBank, X, PartyPopper } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const TYPE_CONFIG = {
  subscription: {
    icon: RefreshCw,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-100 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-600 dark:bg-violet-800 dark:text-violet-200',
  },
  impulse: {
    icon: Zap,
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-200',
  },
  concentration: {
    icon: TrendingUp,
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-100 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200',
  },
  highFrequency: {
    icon: Zap,
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-200',
  },
  ok: {
    icon: CheckCircle2,
    gradient: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-100 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200',
  },
  lastInstallment: {
    icon: PartyPopper,
    gradient: 'from-teal-400 to-emerald-500',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-100 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-300',
    badge: 'bg-teal-100 text-teal-600 dark:bg-teal-800 dark:text-teal-200',
  },
}

function formatCompletedDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(dateStr + 'T12:00:00'))
  } catch { return dateStr.slice(0, 7) }
}

function FreedCapitalSummary({ findings }) {
  const [dismissed, setDismissed] = useState(new Set())
  const completed = findings
    .filter(f => f.type === 'lastInstallment' && f.transactions?.[0] && !dismissed.has(f.transactions[0].description))
  if (completed.length === 0) return null
  const totalFreed = completed.reduce((s, f) => s + f.total, 0)
  return (
    <div className="mb-5 rounded-2xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
          <PartyPopper size={16} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-teal-800 dark:text-teal-200">Capital liberado próximo resumen</h4>
          <p className="text-xs text-teal-600 dark:text-teal-400">
            {completed.length === 1 ? '1 plan de cuotas completado' : `${completed.length} planes de cuotas completados`}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-lg font-extrabold text-teal-700 dark:text-teal-300">{fmt(totalFreed)}</div>
          <div className="text-xs text-teal-500 dark:text-teal-400">menos por mes</div>
        </div>
      </div>
      <div className="space-y-2">
        {completed.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/70 dark:bg-white/10 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {f.transactions[0]?.description}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {f.transactions[0]?.installment?.total} cuotas · completado {formatCompletedDate(f.completedDate)}
              </div>
            </div>
            <div className="text-sm font-bold text-teal-700 dark:text-teal-300 shrink-0">
              {fmt(f.total)}/mes
            </div>
            <button
              onClick={() => setDismissed(d => new Set([...d, f.transactions[0]?.description]))}
              title="Descartar"
              className="w-5 h-5 flex items-center justify-center rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-teal-600/70 dark:text-teal-500 mt-3 text-center">
        El próximo resumen será {fmt(totalFreed)} más liviano 🎉
      </p>
    </div>
  )
}

function SavingsCalculator({ findings, transactions }) {
  const [dismissed, setDismissed] = useState(new Set())

  const subs = findings.filter(f => f.type === 'subscription' && !dismissed.has(f.description))
  if (subs.length === 0) return null

  // Estimate monthly cost: total spend / number of distinct months spanned
  const months = new Set(transactions.map(t => t.date.slice(0, 7)))
  const monthCount = Math.max(months.size, 1)

  const subsWithCost = subs.map(f => ({
    ...f,
    monthly: f.total / monthCount,
  }))

  const totalMonthly = subsWithCost.reduce((s, f) => s + f.monthly, 0)
  const totalAnnual  = totalMonthly * 12

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <PiggyBank size={16} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Calculadora de ahorro</h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Suscripciones detectadas que podrías cancelar</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{fmt(totalMonthly)}/mes</div>
          <div className="text-xs text-emerald-500 dark:text-emerald-400">{fmt(totalAnnual)} al año</div>
        </div>
      </div>

      <div className="space-y-2">
        {subsWithCost.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/70 dark:bg-white/10 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {f.description.slice(0, 40)}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {f.count} cobros · {fmt(f.total)} total
              </div>
            </div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              {fmt(f.monthly)}/mes
            </div>
            <button
              onClick={() => setDismissed(d => new Set([...d, f.description]))}
              title="Descartar"
              className="w-5 h-5 flex items-center justify-center rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-3 text-center">
        Cancelar todas estas suscripciones te ahorraría {fmt(totalAnnual)} por año
      </p>
    </div>
  )
}

export default function InsightsPanel({ findings, transactions, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false) // eslint-disable-line no-unused-vars

  if (findings.length === 0 && transactions.length === 0) return null

  const byCategory = {}
  for (const t of transactions) {
    if (t.type === 'credit') continue
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  }
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)

  const insights = [
    ...findings.map(f => ({
      type: f.type,
      title: f.label,
      body: f.type === 'subscription'
        ? `"${f.description.slice(0, 30)}" se repite ${f.count} veces — ${fmt(f.total)} en total`
        : f.type === 'lastInstallment' && f.transactions?.[0]
        ? `Cuota ${f.transactions[0].installment.total}/${f.transactions[0].installment.total} · completado ${formatCompletedDate(f.completedDate)} · libera ${fmt(f.total)}/mes`
        : f.description,
      amount: f.total ? fmt(f.total) : null,
    })),
  ]

  if (topCat && topCat[1] / total > 0.35) {
    insights.push({
      type: 'concentration',
      title: 'Concentración de gasto',
      body: `${((topCat[1] / total) * 100).toFixed(0)}% de tus gastos están en "${CATEGORIES[topCat[0]]?.label || topCat[0]}"`,
      amount: fmt(topCat[1]),
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'ok',
      title: '¡Sin alertas!',
      body: 'No se detectaron suscripciones duplicadas ni patrones inusuales.',
      amount: null,
    })
  }

  const alertCount = insights.filter(i => i.type !== 'ok').length

  function handleRefresh() {
    onRefresh?.()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle size={16} className="text-amber-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Alertas e insights</h3>

        <div className="ml-auto flex items-center gap-2">
          {alertCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-200">
              {alertCount} {alertCount === 1 ? 'alerta' : 'alertas'}
            </span>
          )}
          <button
            onClick={handleRefresh}
            title="Reiniciar alertas descartadas"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <FreedCapitalSummary findings={findings} />

      <div className="grid sm:grid-cols-2 gap-3">
        {insights.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.ok
          const Icon = cfg.icon
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl border p-4 ${cfg.bg} ${cfg.border} ${refreshing ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${cfg.text}`}>{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.body}</div>
                  {item.amount && (
                    <div className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {item.amount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SavingsCalculator findings={findings} transactions={transactions} />
    </div>
  )
}
