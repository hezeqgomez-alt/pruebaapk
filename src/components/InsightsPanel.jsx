import { AlertTriangle, RefreshCw, TrendingUp, Zap } from 'lucide-react'
import { CATEGORIES } from '../utils/categorizer'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function InsightsPanel({ findings, transactions }) {
  if (findings.length === 0 && transactions.length === 0) return null

  // Top category
  const byCategory = {}
  for (const t of transactions) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  }
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)

  const insights = [
    ...findings.map(f => ({
      type: f.type,
      icon: f.type === 'subscription' ? <RefreshCw size={16} /> : <Zap size={16} />,
      color: f.type === 'subscription' ? 'purple' : 'amber',
      title: f.label,
      body: f.type === 'subscription'
        ? `"${f.description.slice(0, 30)}" se repite ${f.count} veces — ${fmt(f.total)} en total`
        : f.description,
    })),
  ]

  if (topCat && topCat[1] / total > 0.35) {
    insights.push({
      type: 'concentration',
      icon: <TrendingUp size={16} />,
      color: 'red',
      title: 'Concentración de gasto',
      body: `El ${((topCat[1] / total) * 100).toFixed(0)}% de tus gastos están en "${CATEGORIES[topCat[0]]?.label || topCat[0]}"`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'ok',
      icon: <Zap size={16} />,
      color: 'green',
      title: 'Sin alertas detectadas',
      body: 'No se encontraron suscripciones duplicadas ni patrones inusuales',
    })
  }

  const colorMap = {
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="text-base font-semibold text-slate-700">Alertas e insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((item, i) => (
          <div key={i} className={`flex gap-3 p-3 rounded-xl border ${colorMap[item.color]}`}>
            <div className="mt-0.5 shrink-0">{item.icon}</div>
            <div>
              <div className="font-semibold text-sm">{item.title}</div>
              <div className="text-sm opacity-80 mt-0.5">{item.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
