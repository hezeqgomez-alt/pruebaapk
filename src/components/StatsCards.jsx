import { List, PiggyBank, CreditCard, Landmark, BarChart2, AlertTriangle, Settings2 } from 'lucide-react'

// Total con centavos: el redondeo a pesos enteros hacía que, p.ej., $1.579.501,94
// se mostrara como $1.579.502 y no coincidiera con el SALDO ACTUAL del resumen.
function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const NAV_ICONS = {
  movimientos: List,
  presupuesto: PiggyBank,
  cuotas:      CreditCard,
  prestamos:   Landmark,
  balance:     BarChart2,
  insights:    AlertTriangle,
}

export default function StatsCards({ transactions, tabs, onTab, cardNames = {}, onManage }) {
  if (transactions.length === 0) return null

  const debits      = transactions.filter(t => t.type !== 'credit')
  const totalDebits = debits.reduce((s, t) => s + t.amount, 0)
  // Tarjetas: cada "source" es un banco+marca+tarjeta distinto.
  const sources     = [...new Set(transactions.map(t => t.source))]
  // Nombre a mostrar: alias si existe, si no el source original.
  const displayNames = sources.map(s => cardNames[s] || s)
  // Resúmenes: cada PDF subido (fileName). Datos antiguos pueden no tenerlo.
  const files       = [...new Set(transactions.map(t => t.fileName).filter(Boolean))]
  const cardCount   = sources.length
  const fileCount   = files.length

  const navTabs = tabs?.filter(t => t.id !== 'dashboard') ?? []

  return (
    <div className="space-y-3">

      {/* Info: total gastos + fuentes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40 ring-1 ring-indigo-400/20">
          <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-2">Total gastos</div>
          <div className="text-3xl font-extrabold leading-none mb-1 tabular-nums">{fmt(totalDebits)}</div>
          <div className="text-xs opacity-70">{debits.length} movimientos</div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5" />
        </div>

        <button
          onClick={onManage}
          disabled={!onManage}
          className="group text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition-all enabled:hover:border-indigo-300 dark:enabled:hover:border-indigo-700 enabled:hover:shadow-md enabled:active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tarjetas y resúmenes</span>
            {onManage && <Settings2 size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />}
          </div>
          <div className="flex items-baseline gap-1.5 leading-none mb-1">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">{cardCount}</span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{cardCount === 1 ? 'tarjeta' : 'tarjetas'}</span>
          </div>
          {fileCount > 0 && (
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              en {fileCount} {fileCount === 1 ? 'resumen' : 'resúmenes'}
            </div>
          )}
          <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={displayNames.join(', ')}>
            {displayNames.slice(0, 2).join(', ')}{displayNames.length > 2 ? ` +${displayNames.length - 2}` : ''}
          </div>
          {onManage && (
            <div className="text-[10px] font-medium text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              Tocá para renombrar o eliminar →
            </div>
          )}
        </button>
      </div>

      {/* Nav buttons — solo mobile (en desktop está el tab strip) */}
      {navTabs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          {navTabs.map(tab => {
            const Icon = NAV_ICONS[tab.id] ?? List
            const badge  = tab.count   > 0 ? tab.count   : null
            const green  = tab.countGreen > 0 ? tab.countGreen : null
            return (
              <button
                key={tab.id}
                onClick={() => onTab(tab.id)}
                className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-90 active:bg-indigo-100 dark:active:bg-indigo-900/50 transition-all shadow-sm"
              >
                <div className="relative">
                  <Icon size={18} className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
                  {green != null && (
                    <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold px-1 py-px rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 leading-tight">
                      {green}
                    </span>
                  )}
                  {badge != null && green == null && (
                    <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold px-1 py-px rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 leading-tight">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium leading-tight text-center">{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

    </div>
  )
}
