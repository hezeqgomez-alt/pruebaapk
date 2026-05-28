import { forwardRef, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from '../utils/categorizer'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function safeFormat(dateStr, fmtStr, opts) {
  try { return format(parseISO(dateStr), fmtStr, opts) } catch { return dateStr?.slice(0, 7) || '' }
}

const MonthComparison = forwardRef(function MonthComparison({ transactions }, ref) {
  const [viewMode, setViewMode]     = useState('monthly') // 'monthly' | 'annual'
  const [showStacked, setShowStacked] = useState(false)

  const debits = transactions.filter(t => t.type !== 'credit')

  // ── Monthly grouping ──────────────────────────────────────────────────────────
  const byMonthCat = {}
  const months = new Set()
  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    months.add(mo)
    if (!byMonthCat[mo]) byMonthCat[mo] = {}
    byMonthCat[mo][t.category] = (byMonthCat[mo][t.category] || 0) + t.amount
  }
  const sortedMonths = [...months].sort()

  // ── Annual grouping ───────────────────────────────────────────────────────────
  const byYearCat = {}
  const years = new Set()
  for (const t of debits) {
    const yr = t.date.slice(0, 4)
    years.add(yr)
    if (!byYearCat[yr]) byYearCat[yr] = {}
    byYearCat[yr][t.category] = (byYearCat[yr][t.category] || 0) + t.amount
  }
  const sortedYears = [...years].sort()

  // ── Pick active grouping ──────────────────────────────────────────────────────
  const isAnnual    = viewMode === 'annual'
  const keys        = isAnnual ? sortedYears : sortedMonths
  const byKeyCat    = isAnnual ? byYearCat   : byMonthCat
  const labels      = isAnnual
    ? sortedYears
    : sortedMonths.map(m => safeFormat(m + '-01', 'MMM yy', { locale: es }))

  const cats = Object.keys(CATEGORIES)

  const datasets = cats.map(cat => ({
    label: CATEGORIES[cat]?.label || cat,
    data: keys.map(k => byKeyCat[k]?.[cat] || 0),
    backgroundColor: CATEGORIES[cat]?.color || '#94a3b8',
    borderRadius: 4,
    borderSkipped: false,
  })).filter(d => d.data.some(v => v > 0))

  const totalByKey = {
    label: isAnnual ? 'Total anual' : 'Total gastado',
    data: keys.map(k => Object.values(byKeyCat[k] || {}).reduce((s, v) => s + v, 0)),
    backgroundColor: '#1e40af',
    borderRadius: 4,
    borderSkipped: false,
  }

  const data = { labels, datasets: showStacked ? datasets : [totalByKey] }

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

  // ── Table rows ────────────────────────────────────────────────────────────────
  const tableRows = keys.map((k, i) => {
    const total = Object.values(byKeyCat[k] || {}).reduce((s, v) => s + v, 0)
    const count = debits.filter(t => (isAnnual ? t.date.startsWith(k) : t.date.startsWith(k))).length
    const label = isAnnual
      ? k
      : safeFormat(k + '-01', 'MMMM yyyy', { locale: es })
    return { label, total, count, key: k }
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          {isAnnual ? 'Comparativo anual' : 'Comparativo mes a mes'}
        </h3>
        <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setShowStacked(v => !v)}
          className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
            showStacked
              ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300'
              : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Por categoría
        </button>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !isAnnual
                ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setViewMode('annual')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              isAnnual
                ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Anual
          </button>
        </div>
        </div>
      </div>

      <div style={{ height: 240 }}>
        <Bar ref={ref} data={data} options={options} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">
                {isAnnual ? 'Año' : 'Mes'}
              </th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Total</th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Movimientos</th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Variación</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => {
              const prev = tableRows[i - 1]
              const variation = prev ? ((row.total - prev.total) / prev.total) * 100 : null
              return (
                <tr key={row.key} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 text-slate-700 dark:text-slate-300 capitalize">{row.label}</td>
                  <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{fmt(row.total)}</td>
                  <td className="py-2 text-right text-slate-500 dark:text-slate-400">{row.count}</td>
                  <td className="py-2 text-right">
                    {variation !== null ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${variation > 10 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : variation < -10 ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                      </span>
                    ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
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
