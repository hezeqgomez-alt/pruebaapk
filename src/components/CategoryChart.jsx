import { forwardRef } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import { CATEGORIES } from '../utils/categorizer'

Chart.register(ArcElement, Tooltip, Legend)

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const CategoryChart = forwardRef(function CategoryChart({ transactions }, ref) {
  const debits = transactions.filter(t => t.type !== 'credit')
  const byCategory = {}
  for (const t of debits) {
    if (!byCategory[t.category]) byCategory[t.category] = 0
    byCategory[t.category] += t.amount
  }

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a)
  const total = sorted.reduce((s, [, v]) => s + v, 0)

  const data = {
    labels: sorted.map(([k]) => CATEGORIES[k]?.label || k),
    datasets: [{
      data: sorted.map(([, v]) => v),
      backgroundColor: sorted.map(([k]) => CATEGORIES[k]?.color || '#94a3b8'),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${fmt(ctx.raw)} (${((ctx.raw / total) * 100).toFixed(1)}%)`,
        },
      },
    },
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Gastos por categoría</h3>
      <div className="flex gap-6 items-start">
        <div style={{ height: 200, minWidth: 200 }}>
          <Doughnut ref={ref} data={data} options={options} />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto max-h-52">
          {sorted.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span style={{ background: CATEGORIES[key]?.color || '#94a3b8' }} className="w-3 h-3 rounded-full shrink-0" />
              <span className="flex-1 text-slate-600 truncate">{CATEGORIES[key]?.icon} {CATEGORIES[key]?.label || key}</span>
              <span className="font-medium text-slate-800">{fmt(val)}</span>
              <span className="text-slate-400 text-xs w-10 text-right">{((val / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default CategoryChart
