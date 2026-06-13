import { useState, useEffect } from 'react'

const PAD = 12

const STEPS = [
  {
    tab: 'dashboard',
    selector: '[data-tour="stats-cards"]',
    emoji: '📊',
    title: 'Tu resumen de un vistazo',
    body: 'Acá ves el total gastado, cuántas tarjetas cargaste y los movimientos del período. Todo se actualiza automáticamente al subir nuevos resúmenes.',
    tip: 'Tocá "Tarjetas y resúmenes" para renombrarlas como quieras.',
  },
  {
    tab: 'dashboard',
    selector: '[data-tour="category-chart"]',
    emoji: '🎯',
    title: '¿En qué gastás más?',
    body: 'El gráfico clasifica tus gastos automáticamente en categorías. Tocá una para filtrar solo esos movimientos en la tabla.',
    tip: null,
  },
  {
    tab: 'movimientos',
    selector: '[data-tour="transaction-search"]',
    emoji: '🔍',
    title: 'Buscá cualquier gasto',
    body: 'Filtrá por categoría, mes o tarjeta. Hacé click en cualquier movimiento para editar su categoría o agregar una nota personal.',
    tip: null,
  },
  {
    tab: 'insights',
    selector: '[data-tour="insights-panel"]',
    emoji: '💡',
    title: 'Alertas inteligentes',
    body: 'EasyResumen detecta suscripciones activas, gastos inusuales y cuotas próximas a vencer. Todo automático, sin configurar nada.',
    tip: null,
  },
  {
    tab: null,
    selector: '[data-tour="report-btn"]',
    emoji: '📄',
    title: 'Tu informe listo para compartir',
    body: 'Con un click generás un PDF completo con gráficos, análisis por categoría y evolución mensual. También podés exportar a Excel o CSV.',
    tip: null,
    isLast: true,
  },
]

// Tracks the bounding rect of the target element, polling until it appears in the DOM
// (needed because tab switches cause elements to mount asynchronously).
function useSpotlight(selector) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!selector) { setRect(null); return }

    let timer = null
    let attempts = 0

    function measure() {
      const el = document.querySelector(selector)
      if (!el) return false
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      return true
    }

    function poll() {
      if (measure() || attempts++ > 30) return
      timer = setTimeout(poll, 80)
    }
    poll()

    function onResize() { measure() }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [selector])

  return rect
}

function StepDots({ step, totalSteps }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          key={i}
          className={
            i === step
              ? 'block w-2.5 h-2.5 rounded-full bg-indigo-500 transition-all duration-300'
              : i < step
              ? 'block w-2 h-2 rounded-full bg-indigo-400 transition-all duration-300'
              : 'block w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300'
          }
        />
      ))}
    </div>
  )
}

export default function TourGuide({ step, totalSteps, onNext, onSkip }) {
  const current = STEPS[step]
  const spotRect = useSpotlight(current?.selector)

  if (!current) return null

  const hasSpot = spotRect && spotRect.width > 0

  return (
    <>
      <style>{`
        @keyframes tourCardIn {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spotlightAppear {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Spotlight — a transparent div that casts a huge box-shadow outward,
          darkening everything except the area directly under this element. */}
      {hasSpot ? (
        <div
          style={{
            position: 'fixed',
            zIndex: 40,
            pointerEvents: 'none',
            top:    spotRect.top  - PAD,
            left:   spotRect.left - PAD,
            width:  spotRect.width  + PAD * 2,
            height: spotRect.height + PAD * 2,
            borderRadius: 16,
            // The huge outward shadow IS the dark overlay; the element itself stays clear.
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.68), 0 0 0 2px rgba(99,102,241,0.55)',
            // Smooth slide between targets when step advances
            transition: [
              'top    0.45s cubic-bezier(0.4,0,0.2,1)',
              'left   0.45s cubic-bezier(0.4,0,0.2,1)',
              'width  0.45s cubic-bezier(0.4,0,0.2,1)',
              'height 0.45s cubic-bezier(0.4,0,0.2,1)',
            ].join(', '),
            animation: 'spotlightAppear 0.3s ease-out',
          }}
        />
      ) : (
        // Fallback: plain dark overlay while target element hasn't mounted yet
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.68)', animation: 'spotlightAppear 0.3s ease-out' }}
        />
      )}

      {/* Floating tour card */}
      <div
        key={step}
        role="dialog"
        aria-label={`Tour paso ${step + 1} de ${totalSteps}: ${current.title}`}
        className="fixed bottom-8 left-1/2 z-50 w-[360px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/20 rounded-3xl p-5"
        style={{ animation: 'tourCardIn 0.3s ease-out' }}
      >
        {/* Top row: progress dots + skip */}
        <div className="flex items-center justify-between mb-3">
          <StepDots step={step} totalSteps={totalSteps} />
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Saltar tour
          </button>
        </div>

        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none select-none">{current.emoji}</span>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-snug">
            {current.title}
          </h2>
        </div>

        {/* Body */}
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
          {current.body}
        </p>

        {/* Optional tip */}
        {current.tip && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl px-3 py-2 mt-3 text-xs text-indigo-600 dark:text-indigo-400">
            <span className="mr-1">💬</span>{current.tip}
          </div>
        )}

        {/* Bottom row: counter + CTA */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Paso {step + 1} de {totalSteps}
          </span>
          <button
            onClick={onNext}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            {current.isLast ? '¡Entendido! 🎉' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </>
  )
}
