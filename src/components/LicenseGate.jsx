import { useState, useEffect } from 'react'
import { KeyRound, AlertTriangle, CheckCircle2, ExternalLink, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const MP_PLAN_ID = '65b536a45d974b038219887643100785'
const IS_WEB     = !window.electronAPI

function getMpCheckoutUrl(userId) {
  return `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${MP_PLAN_ID}&external_reference=${userId}`
}

// ─── Activation form (Electron only) ─────────────────────────────────────────

function formatKey(raw) {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 24)
  const groups = []
  for (let i = 0; i < clean.length; i += 5) groups.push(clean.slice(i, i + 5))
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
          onClick={() => window.electronAPI?.openExternal('https://www.easyresumen.com.ar/#pricing')}
          className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-0.5"
        >
          Comprá EasyResumen <ExternalLink size={10} />
        </button>
      </p>
    </form>
  )
}

// ─── "Ya me suscribí" button (web only) ──────────────────────────────────────

function VerifyButton({ onActivated }) {
  const { user, refreshTrial } = useAuth()
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [ok,      setOk]      = useState(false)

  const handleVerify = async () => {
    if (!user) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.ok && data.activated) {
        setOk(true)
        await refreshTrial()
        setTimeout(() => onActivated?.(), 1500)
      } else {
        setMsg('No encontramos una suscripción activa todavía. Si acabás de pagar, esperá unos minutos e intentá de nuevo.')
      }
    } catch {
      setMsg('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (ok) {
    return (
      <p className="text-center text-sm text-green-600 font-semibold flex items-center justify-center gap-1.5">
        <CheckCircle2 size={16} /> ¡Plan PRO activado!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full py-2 rounded-xl border border-indigo-300 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Ya me suscribí
      </button>
      {msg && <p className="text-xs text-slate-500 text-center leading-snug">{msg}</p>}
    </div>
  )
}

// ─── Trial banner (non-blocking) ─────────────────────────────────────────────

export function TrialBanner({ daysLeft, pdfCount = 0, pdfLimit = 3, onActivated }) {
  const { user } = useAuth()
  const [checkoutOpened, setCheckoutOpened] = useState(false)
  const [showModal,      setShowModal]      = useState(false)
  const urgent = daysLeft <= 5 || pdfCount >= pdfLimit

  const handleWebCTA = () => {
    if (!user) return
    const url = getMpCheckoutUrl(user.id)
    window.open(url, '_blank')
    setCheckoutOpened(true)
  }

  const ctaLabel  = IS_WEB ? 'Suscribirse — $2.999/mes' : 'Activar licencia'
  const ctaAction = IS_WEB ? handleWebCTA : () => setShowModal(true)

  return (
    <>
      <div className={`flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-medium ${urgent ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
        <Clock size={12} />
        <span>
          Prueba gratis:{' '}
          <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>
          {' · '}
          <strong>{pdfCount}/{pdfLimit} resúmenes</strong> usados
        </span>
        <button onClick={ctaAction} className="underline font-semibold hover:no-underline whitespace-nowrap">
          {ctaLabel}
        </button>
        {IS_WEB && checkoutOpened && (
          <VerifyInlineBanner onActivated={onActivated} />
        )}
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

// Inline "Ya me suscribí" dentro del banner (pequeño)
function VerifyInlineBanner({ onActivated }) {
  const { user, refreshTrial } = useAuth()
  const [loading, setLoading] = useState(false)
  const [ok,      setOk]      = useState(false)

  const handleVerify = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.ok && data.activated) {
        setOk(true)
        await refreshTrial()
        setTimeout(() => onActivated?.(), 1500)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  if (ok) return <span className="font-semibold">¡PRO activado!</span>

  return (
    <button
      onClick={handleVerify}
      disabled={loading}
      className="underline font-semibold hover:no-underline opacity-90 disabled:opacity-50 flex items-center gap-1"
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : null}
      Ya me suscribí
    </button>
  )
}

// ─── Expired gate (blocking) ──────────────────────────────────────────────────

export function ExpiredGate({ onActivated }) {
  const { user } = useAuth()
  const [checkoutOpened, setCheckoutOpened] = useState(false)

  if (IS_WEB) {
    const handleCheckout = () => {
      if (!user) return
      const url = getMpCheckoutUrl(user.id)
      window.open(url, '_blank')
      setCheckoutOpened(true)
    }

    return (
      <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <img
            src="/icon.png"
            alt="EasyResumen"
            className="w-16 h-16 mx-auto mb-4 rounded-2xl"
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 className="text-xl font-extrabold text-slate-800 mb-1">Período de prueba finalizado</h1>
          <p className="text-sm text-slate-500 mb-2">
            Gracias por probar EasyResumen. Suscribite para seguir accediendo.
          </p>
          <p className="text-2xl font-extrabold text-indigo-600 mb-6">$2.999<span className="text-base font-normal text-slate-400">/mes</span></p>

          <div className="space-y-3">
            <button
              onClick={handleCheckout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              Suscribirme con MercadoPago <ExternalLink size={14} />
            </button>

            {checkoutOpened && <VerifyButton onActivated={onActivated} />}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            ¿Tenés problemas? Escribinos a{' '}
            <a href="mailto:soporte@easyresumen.com.ar" className="underline">soporte@easyresumen.com.ar</a>
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
  const [state, setState] = useState(null)
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
