import { forwardRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const MonthComparison = forwardRef(function MonthComparison({ transactions, selectedCategories }, ref) {
  const debits = transactions.filter(t => t.type !== 'credit')

  const byMonthCat = {}
  const months = new Set()

  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    months.add(mo)
    if (!byMonthCat[mo]) byMonthCat[mo] = {}
    byMonthCat[mo][t.category] = (byMonthCat[mo][t.category] || 0) + t.amount
  }

  const sortedMonths = [...months].sort()
  const labels = sortedMonths.map(m => format(parseISO(m + '-01'), 'MMM yy', { locale: es }))

  const cats = selectedCategories && selectedCategories.length > 0
    ? selectedCategories
    : Object.keys(CATEGORIES)

  const datasets = cats.map(cat => ({
    label: CATEGORIES[cat]?.label || cat,
    data: sortedMonths.map(m => byMonthCat[m]?.[cat] || 0),
    backgroundColor: CATEGORIES[cat]?.color || '#94a3b8',
    borderRadius: 4,
    borderSkipped: false,
  })).filter(d => d.data.some(v => v > 0))

  const totalByMonth = {
    label: 'Total gastado',
    data: sortedMonths.map(m => Object.values(byMonthCat[m] || {}).reduce((s, v) => s + v, 0)),
    backgroundColor: '#1e40af',
    borderRadius: 4,
    borderSkipped: false,
  }

  const showStacked = selectedCategories && selectedCategories.length > 0
  const data = { labels, datasets: showStacked ? datasets : [totalByMonth] }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: showStacked, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
    },
    scales: {
      x: { stacked: showStacked, grid: { display: false } },
      y: { stacked: showStacked, ticks: { callback: v => fmt(v) }, grid: { color: '#f1f5f9' } },
    },
  }

  const monthTable = sortedMonths.map(m => ({
    label: format(parseISO(m + '-01'), 'MMMM yyyy', { locale: es }),
    total: Object.values(byMonthCat[m] || {}).reduce((s, v) => s + v, 0),
    count: debits.filter(t => t.date.startsWith(m)).length,
  }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Comparativo mes a mes</h3>
      <div style={{ height: 240 }}>
        <Bar ref={ref} data={data} options={options} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-slate-500 font-medium">Mes</th>
              <th className="text-right py-2 text-slate-500 font-medium">Total</th>
              <th className="text-right py-2 text-slate-500 font-medium">Movimientos</th>
              <th className="text-right py-2 text-slate-500 font-medium">Variación</th>
            </tr>
          </thead>
          <tbody>
            {monthTable.map((row, i) => {
              const prev = monthTable[i - 1]
              const variation = prev ? ((row.total - prev.total) / prev.total) * 100 : null
              return (
                <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 text-slate-700 capitalize">{row.label}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">{fmt(row.total)}</td>
                  <td className="py-2 text-right text-slate-500">{row.count}</td>
                  <td className="py-2 text-right">
                    {variation !== null ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${variation > 10 ? 'bg-red-100 text-red-600' : variation < -10 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default MonthComparison
