import { forwardRef, useMemo } from 'react'
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
  const topCat = sorted[0]

  // Draw center label directly on canvas so Chart.js tooltips always render on top
  const centerPlugin = useMemo(() => ({
    id: 'centerLabel',
    afterDatasetsDraw(chart) {
      if (!topCat) return
      const { ctx, chartArea: { top, bottom, left, right } } = chart
      const cx = (left + right) / 2
      const cy = (top + bottom) / 2
      const isDark = document.documentElement.classList.contains('dark')

      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.font = '500 10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('top', cx, cy - 18)

      const label = CATEGORIES[topCat[0]]?.label || topCat[0]
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b'
      if (label.length <= 12) {
        ctx.fillText(label, cx, cy)
      } else {
        const words = label.split(' ')
        const mid = Math.ceil(words.length / 2)
        ctx.fillText(words.slice(0, mid).join(' '), cx, cy - 7)
        ctx.fillText(words.slice(mid).join(' '), cx, cy + 7)
      }

      const pct = ((topCat[1] / total) * 100).toFixed(0) + '%'
      ctx.font = '500 10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText(pct, cx, cy + 20)

      ctx.restore()
    },
  }), [topCat, total])

  const data = {
    labels: sorted.map(([k]) => CATEGORIES[k]?.label || k),
    datasets: [{
      data: sorted.map(([, v]) => v),
      backgroundColor: sorted.map(([k]) => CATEGORIES[k]?.color || '#94a3b8'),
      borderWidth: 3,
      borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
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
      centerLabel: {},
    },
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Gastos por categoría</h3>

      {/* Mobile: donut arriba centrado + leyenda en 2 columnas. Desktop: lado a lado */}
      <div className="flex flex-col sm:flex-row gap-4 items-start flex-1">
        {/* Donut */}
        <div className="shrink-0 mx-auto sm:mx-0" style={{ width: 160, height: 160 }}>
          <Doughnut ref={ref} data={data} options={options} plugins={[centerPlugin]} />
        </div>

        {/* Legend — 2 columnas en mobile para aprovechar el ancho */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-1.5 sm:overflow-y-auto" style={{ maxHeight: undefined }}>
          {sorted.map(([key, val]) => {
            const pct = (val / total) * 100
            return (
              <div key={key} className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CATEGORIES[key]?.color || '#94a3b8' }}
                  />
                  <span className="flex-1 text-slate-600 dark:text-slate-300 truncate text-xs">
                    {CATEGORIES[key]?.icon} {CATEGORIES[key]?.label || key}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 ml-3.5">
                  <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: CATEGORIES[key]?.color || '#94a3b8' }}
                    />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-[10px] whitespace-nowrap shrink-0">{fmt(val)}</span>
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
