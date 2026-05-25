import { AlertTriangle, RefreshCw, TrendingUp, Zap, CheckCircle2 } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const TYPE_CONFIG = {
  subscription: {
    icon: RefreshCw,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    text: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-600',
  },
  impulse: {
    icon: Zap,
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-600',
  },
  concentration: {
    icon: TrendingUp,
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-600',
  },
  ok: {
    icon: CheckCircle2,
    gradient: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-600',
  },
}

export default function InsightsPanel({ findings, transactions }) {
  if (findings.length === 0 && transactions.length === 0) return null

  const byCategory = {}
  for (const t of transactions) {
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <AlertTriangle size={16} className="text-amber-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Alertas e insights</h3>
        {insights.length > 0 && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
            {insights.filter(i => i.type !== 'ok').length || 0} alertas
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {insights.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.ok
          const Icon = cfg.icon
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${cfg.text}`}>{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.body}</div>
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
    </div>
  )
}
