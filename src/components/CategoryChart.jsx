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
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  }

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a)
  const total = sorted.reduce((s, [, v]) => s + v, 0)

  const data = {
    labels: sorted.map(([k]) => CATEGORIES[k]?.label || k),
    datasets: [{
      data: sorted.map(([, v]) => v),
      backgroundColor: sorted.map(([k]) => CATEGORIES[k]?.color || '#94a3b8'),
      borderWidth: 3,
      borderColor: '#fff',
      hoverBorderWidth: 3,
      hoverOffset: 6,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${fmt(ctx.raw)} · ${((ctx.raw / total) * 100).toFixed(1)}%`,
        },
        backgroundColor: '#1e293b',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        padding: 10,
        cornerRadius: 8,
      },
    },
  }

  const topCat = sorted[0]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Gastos por categoría</h3>

      <div className="flex gap-5 items-start flex-1">
        {/* Donut with center label */}
        <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
          <Doughnut ref={ref} data={data} options={options} />
          {topCat && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium">top</span>
              <span className="text-sm font-bold text-slate-700 leading-tight text-center px-3">
                {CATEGORIES[topCat[0]]?.icon} {CATEGORIES[topCat[0]]?.label || topCat[0]}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {((topCat[1] / total) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Legend list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto" style={{ maxHeight: 180 }}>
          {sorted.map(([key, val]) => {
            const pct = (val / total) * 100
            return (
              <div key={key}>
                <div className="flex items-center gap-2 text-sm mb-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CATEGORIES[key]?.color || '#94a3b8' }}
                  />
                  <span className="flex-1 text-slate-600 truncate text-xs">
                    {CATEGORIES[key]?.icon} {CATEGORIES[key]?.label || key}
                  </span>
                  <span className="font-semibold text-slate-800 text-xs whitespace-nowrap">{fmt(val)}</span>
                </div>
                {/* Progress bar */}
                <div className="ml-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: CATEGORIES[key]?.color || '#94a3b8' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default CategoryChart
