import { TrendingUp, TrendingDown, CreditCard, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function StatsCards({ transactions }) {
  if (transactions.length === 0) return null

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  const byMonth = {}
  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = 0
    byMonth[key] += t.amount
  }
  const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  const lastMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const trend = prevMonth ? ((lastMonth[1] - prevMonth[1]) / prevMonth[1]) * 100 : null

  const sources = [...new Set(transactions.map(t => t.source))]

  const cards = [
    {
      icon: <CreditCard size={20} />,
      label: 'Total cargado',
      value: fmt(total),
      sub: `${transactions.length} movimientos`,
      color: 'blue',
    },
    {
      icon: <Calendar size={20} />,
      label: 'Último mes',
      value: lastMonth ? fmt(lastMonth[1]) : '-',
      sub: lastMonth ? format(parseISO(lastMonth[0] + '-01'), 'MMMM yyyy', { locale: es }) : '',
      color: 'indigo',
    },
    {
      icon: trend !== null && trend > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
      label: 'Variación mensual',
      value: trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%` : 'N/A',
      sub: 'vs mes anterior',
      color: trend !== null && trend > 15 ? 'red' : 'green',
    },
    {
      icon: <CreditCard size={20} />,
      label: 'Resúmenes cargados',
      value: sources.length,
      sub: sources.slice(0, 2).join(', ') + (sources.length > 2 ? '...' : ''),
      color: 'slate',
    },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-2xl border p-4 ${colorMap[c.color]}`}>
          <div className="flex items-center gap-2 mb-2 opacity-70">{c.icon}<span className="text-xs font-medium uppercase tracking-wide">{c.label}</span></div>
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs opacity-60 mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
