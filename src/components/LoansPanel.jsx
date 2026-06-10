import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

const STORAGE_KEY = 'easyresumen_loans'

const fmt = n => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const fmtMonth = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

function loadLoans() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseAmount(str) {
  if (typeof str === 'number') return str
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.'))
}

function LoanForm({ onAdd, onCancel }) {
  const [tipo, setTipo] = useState('pagar')
  const [acreedor, setAcreedor] = useState('')
  const [monto, setMonto] = useState('')
  const [plazo, setPlazo] = useState('')
  const [cuota, setCuota] = useState('')
  const [fechaInicio, setFechaInicio] = useState(currentYearMonth())
  const [mesesPagados, setMesesPagados] = useState('0')

  const recalcCuota = (m, p) => {
    const mn = parseAmount(m)
    const pn = parseInt(p)
    if (mn > 0 && pn > 0) setCuota(Math.round(mn / pn).toString())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const montoN = parseAmount(monto)
    const plazoN = parseInt(plazo)
    const cuotaN = parseAmount(cuota)
    const pagadosN = Math.max(0, parseInt(mesesPagados) || 0)
    if (!acreedor.trim() || isNaN(montoN) || montoN <= 0 || isNaN(plazoN) || plazoN < 1 || isNaN(cuotaN) || cuotaN <= 0) return
    onAdd({
      id: Date.now(),
      tipo,
      acreedor: acreedor.trim(),
      monto: montoN,
      plazo: plazoN,
      cuota: cuotaN,
      fechaInicio,
      mesesPagados: Math.min(pagadosN, plazoN),
    })
  }

  const inputCls = 'w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600'
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
      {/* Type toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTipo('pagar')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tipo === 'pagar'
            ? 'bg-red-500 text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
          <span className="mr-1.5">📤</span> Préstamo a pagar
        </button>
        <button type="button" onClick={() => setTipo('cobrar')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tipo === 'cobrar'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
          <span className="mr-1.5">📥</span> Préstamo a cobrar
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            {tipo === 'pagar' ? 'Acreedor (quién me prestó)' : 'Deudor (a quién le presté)'}
          </label>
          <input type="text" value={acreedor} onChange={e => setAcreedor(e.target.value)}
            placeholder={tipo === 'pagar' ? 'Ej: Banco Galicia' : 'Ej: Juan García'}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Monto total del préstamo</label>
          <input type="text" inputMode="decimal" value={monto}
            onChange={e => setMonto(e.target.value)}
            onBlur={() => recalcCuota(monto, plazo)}
            placeholder="Ej: 1.200.000"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Plazo (meses)</label>
          <input type="number" min="1" max="360" value={plazo}
            onChange={e => setPlazo(e.target.value)}
            onBlur={() => recalcCuota(monto, plazo)}
            placeholder="Ej: 24"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cuota mensual</label>
          <input type="text" inputMode="decimal" value={cuota}
            onChange={e => setCuota(e.target.value)}
            placeholder="Se calcula automáticamente"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Mes de inicio</label>
          <input type="month" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cuotas ya pagadas</label>
          <input type="number" min="0" value={mesesPagados}
            onChange={e => setMesesPagados(e.target.value)}
            placeholder="0"
            className={inputCls} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${tipo === 'pagar' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
          <Plus size={15} /> Agregar préstamo
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function LoanCard({ loan, onDelete, onUpdatePagados }) {
  const remaining = loan.plazo - loan.mesesPagados
  const pct = (loan.mesesPagados / loan.plazo) * 100
  const restante = loan.cuota * remaining
  const isPagar = loan.tipo === 'pagar'
  const done = remaining <= 0

  const urgency = remaining <= 2 ? 'red' : remaining <= 6 ? 'amber' : isPagar ? 'red-soft' : 'emerald'
  const barColor = done ? 'bg-slate-300' : isPagar ? 'bg-red-400' : 'bg-emerald-400'

  return (
    <div className={`px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        {/* Type badge */}
        <div className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
          done ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500' :
          isPagar ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
        }`}>
          {done ? '✓ Terminado' : isPagar
            ? <><ArrowDownLeft size={11} /> A pagar</>
            : <><ArrowUpRight size={11} /> A cobrar</>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{loan.acreedor}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Desde {fmtMonth(loan.fechaInicio)} · {loan.plazo} cuotas
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-sm font-bold ${done ? 'text-slate-400' : isPagar ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {done ? '—' : fmt(loan.cuota) + '/mes'}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{fmt(restante)} restante</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Stats + controls */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Cuota <strong className="text-slate-700 dark:text-slate-200">{loan.mesesPagados}/{loan.plazo}</strong></span>
        <span>{fmt(loan.cuota)}/mes</span>
        <span>Total <strong className="text-slate-700 dark:text-slate-200">{fmt(loan.monto)}</strong></span>
        <span className="ml-auto">{pct.toFixed(0)}% pagado</span>

        {/* Pagadas counter — 44px touch targets */}
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={() => onUpdatePagados(loan.id, -1)}
            disabled={loan.mesesPagados <= 0}
            aria-label="Quitar cuota pagada"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => onUpdatePagados(loan.id, +1)}
            disabled={loan.mesesPagados >= loan.plazo}
            aria-label="Agregar cuota pagada"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp size={14} />
          </button>
        </div>

        <button
          onClick={() => onDelete(loan.id)}
          aria-label="Eliminar préstamo"
          className="ml-1 w-11 h-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function LoansPanel() {
  const [loans, setLoans] = useState(loadLoans)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))
  }, [loans])

  const addLoan = (loan) => { setLoans(prev => [...prev, loan]); setShowForm(false) }
  const removeLoan = (id) => setLoans(prev => prev.filter(l => l.id !== id))
  const updatePagados = (id, delta) => setLoans(prev => prev.map(l =>
    l.id !== id ? l : { ...l, mesesPagados: Math.max(0, Math.min(l.plazo, l.mesesPagados + delta)) }
  ))

  const { active, totalPagar, totalCobrar, neto } = useMemo(() => {
    const active = loans.filter(l => l.mesesPagados < l.plazo)
    const totalPagar  = active.filter(l => l.tipo === 'pagar').reduce((s, l) => s + l.cuota, 0)
    const totalCobrar = active.filter(l => l.tipo === 'cobrar').reduce((s, l) => s + l.cuota, 0)
    return { active, totalPagar, totalCobrar, neto: totalCobrar - totalPagar }
  }, [loans])

  const pagar  = loans.filter(l => l.tipo === 'pagar')
  const cobrar = loans.filter(l => l.tipo === 'cobrar')

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/40 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft size={13} className="text-red-500" />
            <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">A pagar/mes</div>
          </div>
          <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">{fmt(totalPagar)}</div>
          <div className="text-xs text-red-400 dark:text-red-500 mt-0.5">
            {pagar.filter(l => l.mesesPagados < l.plazo).length} préstamos activos
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight size={13} className="text-emerald-500" />
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">A cobrar/mes</div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{fmt(totalCobrar)}</div>
          <div className="text-xs text-emerald-400 dark:text-emerald-500 mt-0.5">
            {cobrar.filter(l => l.mesesPagados < l.plazo).length} préstamos activos
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${neto >= 0
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'
          : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40'}`}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Neto/mes</div>
          <div className={`text-2xl font-extrabold ${neto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {neto >= 0 ? '+' : ''}{fmt(neto)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">flujo neto de préstamos</div>
        </div>
      </div>

      {/* Add button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm font-medium">
          <Plus size={16} /> Agregar préstamo
        </button>
      )}

      {/* Form */}
      {showForm && <LoanForm onAdd={addLoan} onCancel={() => setShowForm(false)} />}

      {/* Loans a pagar */}
      {pagar.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-950/20">
            <ArrowDownLeft size={15} className="text-red-500" />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Préstamos a pagar</h3>
            <span className="ml-auto text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalPagar)}/mes</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {pagar.map(l => (
              <LoanCard key={l.id} loan={l} onDelete={removeLoan} onUpdatePagados={updatePagados} />
            ))}
          </div>
        </div>
      )}

      {/* Loans a cobrar */}
      {cobrar.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">
            <ArrowUpRight size={15} className="text-emerald-500" />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Préstamos a cobrar</h3>
            <span className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalCobrar)}/mes</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {cobrar.map(l => (
              <LoanCard key={l.id} loan={l} onDelete={removeLoan} onUpdatePagados={updatePagados} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {loans.length === 0 && !showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <Landmark size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500 font-medium">Sin préstamos registrados</p>
          <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">
            Registrá préstamos que pagás o cobrás para incluirlos en el Balance
          </p>
        </div>
      )}
    </div>
  )
}
