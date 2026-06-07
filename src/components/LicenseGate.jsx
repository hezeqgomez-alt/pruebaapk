import { useState, useEffect } from 'react'
import { KeyRound, AlertTriangle, CheckCircle2, ExternalLink, Clock, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const MP_PLAN_ID   = '65b536a45d974b038219887643100785'
const BUY_URL      = 'https://easyresumen.com/#pricing'
const IS_WEB       = !window.electronAPI

function getMpCheckoutUrl(userId) {
  const base = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${MP_PLAN_ID}`
  return userId ? `${base}&external_reference=${userId}` : base
}

function formatKey(raw) {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 24)
  const groups = []
  for (let i = 0; i < clean.length; i += 5) groups.push(clean.slice(i, i + 5))
  // Always prefix EASY if user didn't type it
  if (groups.length && groups[0] !== 'EASY') groups.unshift('EASY')
  return groups.slice(0, 5).join('-')
}

function ActivationForm({ onActivated }) {
  const [key,     setKey]     = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [ok,      setOk]      = useState(false)

  const handleChange = (e) => {
    setError('')
    setKey(formatKey(e.target.value))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI.activateLicense(key)
      if (result.success) {
        setOk(true)
        setTimeout(() => onActivated(), 1200)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Error de comunicación. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Clave de licencia</label>
        <input
          value={key}
          onChange={handleChange}
          placeholder="EASY-XXXXX-XXXXX-XXXXX-XXXXX"
          maxLength={29}
          spellCheck={false}
          className="w-full font-mono text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300"
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle size={11} /> {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || ok || key.length < 20}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {ok ? (
          <><CheckCircle2 size={15} /> ¡Licencia activada!</>
        ) : loading ? (
          'Verificando...'
        ) : (
          <><KeyRound size={15} /> Activar licencia</>
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        ¿No tenés una clave?{' '}
        <button
          type="button"
          onClick={() => window.electronAPI?.openExternal(BUY_URL)}
          className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-0.5"
        >
          Comprá EasyResumen <ExternalLink size={10} />
        </button>
      </p>
    </form>
  )
}

// ─── Trial banner (non-blocking) ─────────────────────────────────────────────

export function TrialBanner({ daysLeft, pdfCount = 0, onActivated }) {
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuth()
  const urgent = daysLeft <= 5

  const ctaLabel  = IS_WEB ? 'Suscribirme' : 'Activar licencia'
  const ctaAction = IS_WEB
    ? () => window.open(getMpCheckoutUrl(user?.id), '_blank')
    : () => setShowModal(true)

  return (
    <>
      <div className={`flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-medium ${urgent ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
        <Clock size={12} />
        <span>
          Prueba gratis:{' '}
          <strong>{daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}</strong>
          {pdfCount > 0 && <> · <strong>{pdfCount} resúmenes</strong> procesados</>}
        </span>
        <button onClick={ctaAction} className="underline font-semibold hover:no-underline">
          {ctaLabel}
        </button>
      </div>

      {showModal && !IS_WEB && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <KeyRound size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Activar EasyResumen</h2>
                <p className="text-xs text-slate-400">Ingresá tu clave de licencia</p>
              </div>
              <button onClick={() => setShowModal(false)} className="ml-auto text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
            </div>
            <ActivationForm onActivated={() => { setShowModal(false); onActivated() }} />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Expired gate (blocking) ──────────────────────────────────────────────────

export function ExpiredGate({ onActivated }) {
  const { user, refreshTrial } = useAuth()
  const [checking, setChecking] = useState(false)
  const [checked,  setChecked]  = useState(false)

  async function handleAlreadySubscribed() {
    setChecking(true)
    await refreshTrial()
    setChecking(false)
    setChecked(true)
    setTimeout(() => setChecked(false), 3000)
  }

  if (IS_WEB) {
    return (
      <div className="fixed inset-0 bg-[#0f0f1a]/98 flex items-center justify-center z-50 p-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl shadow-black/40">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white mb-2">Período de prueba finalizado</h1>
          <p className="text-sm text-slate-400 mb-7 leading-relaxed">
            Gracias por probar EasyResumen.<br />
            Suscribite para seguir analizando tus resúmenes sin límites.
          </p>

          <div className="space-y-3">
            <a
              href={getMpCheckoutUrl(user?.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
            >
              Suscribirme <ExternalLink size={14} />
            </a>

            <button
              onClick={handleAlreadySubscribed}
              disabled={checking}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 text-sm transition-all disabled:opacity-50"
            >
              {checking ? (
                <><RefreshCw size={14} className="animate-spin" /> Verificando...</>
              ) : checked ? (
                <><CheckCircle2 size={14} className="text-emerald-400" /> Verificado</>
              ) : (
                <><RefreshCw size={14} /> Ya me suscribí</>
              )}
            </button>
          </div>

          <p className="mt-5 text-xs text-slate-600">
            Después de suscribirte, hacé clic en "Ya me suscribí" para activar tu cuenta.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <img src="/icon.png" alt="EasyResumen" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
        <h1 className="text-xl font-extrabold text-slate-800 mb-1">Período de prueba finalizado</h1>
        <p className="text-sm text-slate-500 mb-6">
          Gracias por probar EasyResumen. Activá tu licencia para seguir usándolo.
        </p>
        <ActivationForm onActivated={onActivated} />
      </div>
    </div>
  )
}

// ─── Update notification (toast) ─────────────────────────────────────────────

export function UpdateToast() {
  const [state, setState] = useState(null) // null | 'available' | 'downloading' | 'ready'
  const [pct,   setPct]   = useState(0)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onUpdateAvailable(() => setState('available'))
    window.electronAPI.onUpdateProgress(({ percent }) => { setState('downloading'); setPct(Math.round(percent)) })
    window.electronAPI.onUpdateReady(() => setState('ready'))
  }, [])

  if (!state) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72">
      {state === 'available' && (
        <>
          <p className="text-sm font-semibold text-slate-800 mb-1">Nueva versión disponible</p>
          <p className="text-xs text-slate-500">Descargando actualización en segundo plano...</p>
        </>
      )}
      {state === 'downloading' && (
        <>
          <p className="text-sm font-semibold text-slate-800 mb-2">Descargando actualización...</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{pct}%</p>
        </>
      )}
      {state === 'ready' && (
        <>
          <p className="text-sm font-semibold text-slate-800 mb-1">Actualización lista</p>
          <p className="text-xs text-slate-500 mb-3">Reiniciá la app para aplicar la nueva versión.</p>
          <button
            onClick={() => window.electronAPI.installUpdate()}
            className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
          >
            Reiniciar ahora
          </button>
        </>
      )}
    </div>
  )
}
