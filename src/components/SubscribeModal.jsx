import { useEffect } from 'react'
import { X, Zap, Check, Lock } from 'lucide-react'
import { getMpCheckoutUrl } from './LicenseGate'
import { trackEvent } from '../utils/analytics'

const FEATURES = [
  ['PDFs ilimitados', 'subí todos los resúmenes que quieras'],
  ['Todos tus bancos y tarjetas', 'Visa, Mastercard, CABAL, AMEX'],
  ['Sincronización en la nube', 'tus datos en todos tus dispositivos'],
  ['Insights y proyecciones', 'cuotas, suscripciones y gastos hormiga'],
  ['Soporte prioritario', 'respuesta en menos de 24hs'],
]

// Post-login subscription invite. Shown only to users without an active
// subscription, once per session (dismissal is remembered in sessionStorage).
export default function SubscribeModal({ user, onClose }) {
  const firstName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '')
    .split(/\s+/)[0] || null

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Suscribite a EasyResumen PRO"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar invitación"
          className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all z-10"
        >
          <X size={16} />
        </button>

        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 px-7 pt-8 pb-7 text-center text-white">
          <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest mb-3.5 select-none">
            <Zap size={10} className="fill-white" /> EASYRESUMEN PRO
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">Usá la herramienta sin límites</h2>
          <p className="text-[13px] opacity-90">
            {firstName ? `Hola ${firstName} 👋 ` : ''}Llevá el control total de tus gastos
          </p>
        </div>

        <div className="px-7 pt-6 pb-7">
          {/* Precio */}
          <div className="text-center mb-5">
            <span className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-50">$2.999</span>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-400">/mes</span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Cancelás cuando quieras, sin permanencia</p>
          </div>

          {/* Beneficios */}
          <ul className="flex flex-col gap-2.5 mb-5">
            {FEATURES.map(([title, detail]) => (
              <li key={title} className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-px">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span><b className="font-semibold text-slate-800 dark:text-slate-100">{title}</b> — {detail}</span>
              </li>
            ))}
          </ul>

          {/* CTA → checkout de suscripción MercadoPago */}
          <a
            href={getMpCheckoutUrl(user?.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('subscribe_click', { source: 'subscribe_modal' })}
            className="block w-full text-center bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-[15px] font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-px"
          >
            Suscribirme ahora
          </a>
          <button
            onClick={onClose}
            className="block w-full text-center text-xs font-medium text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400 pt-3 transition-colors"
          >
            Seguir probando gratis
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-600 mt-3.5 select-none">
            <Lock size={10} /> Pago seguro vía MercadoPago
          </p>
        </div>
      </div>
    </div>
  )
}
