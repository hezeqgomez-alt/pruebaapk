import { useMemo } from 'react'
import { CreditCard, TrendingDown, CalendarDays } from 'lucide-react'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function InstallmentsPanel({ transactions }) {
  const groups = useMemo(() => {
    const map = {}
    for (const t of transactions) {
      if (!t.installment || t.type === 'credit') continue
      const key = t.description.toLowerCase().trim().slice(0, 35)
      if (!map[key]) map[key] = []
      map[key].push(t)
    }

    return Object.values(map).map(txs => {
      const latest = txs.reduce((a, b) =>
        b.installment.current > a.installment.current ? b : a
      )
      const { current, total } = latest.installment
      const perCuota   = latest.amount
      const remaining  = total - current
      const totalAmt   = perCuota * total
      const paid       = perCuota * current
      const restante   = perCuota * remaining
      const pct        = (current / total) * 100

      return {
        description: latest.description,
        source: latest.source,
        current,
        total,
        perCuota,
        totalAmt,
        paid,
        restante,
        pct,
        remaining,
        dates: txs.map(t => t.date).sort(),
      }
    }).sort((a, b) => a.remaining - b.remaining)
  }, [transactions])

  // Projection of installments for the next 3 calendar months from today.
  // Uses remaining count directly: a plan with R remaining payments will pay
  // in months +1 through +R from today, regardless of purchase date.
  const nextMonths = useMemo(() => {
    const today = new Date()
    const todayIdx = today.getFullYear() * 12 + today.getMonth()

    return [1, 2, 3].map(offset => {
      const absMonth = todayIdx + offset
      const year  = Math.floor(absMonth / 12)
      const month = absMonth % 12

      const activePlans = groups.filter(g => g.remaining >= offset)
      const total = activePlans.reduce((s, g) => s + g.perCuota, 0)

      return { label: `${MONTH_NAMES[month]} ${year}`, month, year, plans: activePlans, total }
    })
  }, [groups])

  const totalDeuda = groups.reduce((s, g) => s + g.restante, 0)
  const totalCuotas = groups.length

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
        <CreditCard size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-400 dark:text-slate-500 font-medium">Sin cuotas activas</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
        <CreditCard size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-400 dark:text-slate-500 font-medium">No se detectaron compras en cuotas</p>
        <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">Los planes de cuotas aparecen cuando el PDF incluye "Cuota X/Y"</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200/40 dark:shadow-none">
          <div className="text-xs font-medium opacity-70 mb-1 uppercase tracking-wide">Deuda en cuotas</div>
          <div className="text-2xl font-extrabold">{fmt(totalDeuda)}</div>
          <div className="text-xs opacity-60 mt-0.5">total pendiente estimado</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">Planes activos</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{totalCuotas}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">compras financiadas</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">Cuota promedio</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {totalCuotas > 0 ? fmt(groups.reduce((s, g) => s + g.perCuota, 0) / totalCuotas) : '—'}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">por mes</div>
        </div>
      </div>

      {/* Next 3 months projection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
            <CalendarDays size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Proyección próximos 3 meses</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Gasto fijo mensual en cuotas</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-700">
          {nextMonths.map((nm, i) => {
            const accent = i === 0 ? 'violet' : i === 1 ? 'indigo' : 'sky'
            const accentHeader = i === 0
              ? 'bg-violet-500'
              : i === 1 ? 'bg-indigo-500' : 'bg-sky-500'
            const accentText = i === 0
              ? 'text-violet-600 dark:text-violet-400'
              : i === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-600 dark:text-sky-400'
            const accentBg = i === 0
              ? 'bg-violet-50 dark:bg-violet-950/40'
              : i === 1 ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'bg-sky-50 dark:bg-sky-950/40'

            return (
              <div key={i} className="p-4">
                {/* Month header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${accentHeader}`} />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{nm.label}</span>
                </div>

                {/* Total amount */}
                <div className={`rounded-xl px-3 py-2 mb-3 ${accentBg}`}>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Total cuotas</div>
                  <div className={`text-xl font-extrabold ${nm.total > 0 ? accentText : 'text-slate-300 dark:text-slate-600'}`}>
                    {nm.total > 0 ? fmt(nm.total) : '—'}
                  </div>
                  {nm.plans.length > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {nm.plans.length} {nm.plans.length === 1 ? 'plan activo' : 'planes activos'}
                    </div>
                  )}
                </div>

                {/* Plan breakdown */}
                {nm.plans.length === 0 ? (
                  <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-2">Sin cuotas este mes</p>
                ) : (
                  <div className="space-y-1.5">
                    {nm.plans.map((g, j) => (
                      <div key={j} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate leading-tight">{g.description}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{g.source}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{fmt(g.perCuota)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Installment cards */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
            <TrendingDown size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Detalle por plan</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Ordenado por cuotas restantes</span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {groups.map((g, i) => {
            const urgency = g.remaining <= 2 ? 'red' : g.remaining <= 5 ? 'amber' : 'indigo'
            return (
              <div key={i} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${
                    urgency === 'red'   ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                    urgency === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                  }`}>
                    {g.remaining === 0 ? 'Última' : `${g.remaining} resta${g.remaining === 1 ? '' : 'n'}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{g.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{g.source}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt(g.restante)}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">restante</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        urgency === 'red' ? 'bg-red-400' : urgency === 'amber' ? 'bg-amber-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Cuota <strong className="text-slate-700 dark:text-slate-200">{g.current}/{g.total}</strong></span>
                  <span>{fmt(g.perCuota)}/cuota</span>
                  <span>Total <strong className="text-slate-700 dark:text-slate-200">{fmt(g.totalAmt)}</strong></span>
                  <span className="ml-auto">{g.pct.toFixed(0)}% pagado</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
