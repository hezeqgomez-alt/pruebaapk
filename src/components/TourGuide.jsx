const STEPS = [
  {
    tab: 'dashboard',
    emoji: '📊',
    title: 'Tu resumen de un vistazo',
    body: 'Acá ves el total gastado, cuántas tarjetas cargaste y los movimientos del período. Todo se actualiza automáticamente al subir nuevos resúmenes.',
    tip: 'Tocá "Tarjetas y resúmenes" para renombrarlas como quieras.',
  },
  {
    tab: 'dashboard',
    emoji: '🎯',
    title: '¿En qué gastás más?',
    body: 'El gráfico clasifica tus gastos automáticamente en categorías. Tocá una para filtrar solo esos movimientos en la tabla.',
    tip: null,
  },
  {
    tab: 'movimientos',
    emoji: '🔍',
    title: 'Buscá cualquier gasto',
    body: 'Filtrá por categoría, mes o tarjeta. Hacé click en cualquier movimiento para editar su categoría o agregar una nota personal.',
    tip: null,
  },
  {
    tab: 'insights',
    emoji: '💡',
    title: 'Alertas inteligentes',
    body: 'EasyResumen detecta suscripciones activas, gastos inusuales y cuotas próximas a vencer. Todo automático, sin configurar nada.',
    tip: null,
  },
  {
    tab: 'insights',
    emoji: '📄',
    title: 'Tu informe listo para compartir',
    body: 'Con un click generás un PDF completo con gráficos, análisis por categoría y evolución mensual. También podés exportar a Excel o CSV.',
    tip: null,
    isLast: true,
  },
]

function StepDots({ step, totalSteps }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isCurrent = i === step
        const isPast = i < step
        const isFuture = i > step
        return (
          <span
            key={i}
            className={
              isFuture
                ? 'w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 transition-all'
                : isCurrent
                ? 'w-2.5 h-2.5 rounded-full bg-indigo-500 transition-all'
                : isPast
                ? 'w-2 h-2 rounded-full bg-indigo-500 transition-all'
                : ''
            }
          />
        )
      })}
    </div>
  )
}

export default function TourGuide({ step, totalSteps, onNext, onSkip, darkMode }) {
  const current = STEPS[step]
  if (!current) return null

  return (
    <>
      {/* Subtle backdrop — non-blocking */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />

      <style>{`
        @keyframes tourSlideIn {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {/* Floating card */}
      <div
        key={step}
        className="fixed bottom-8 left-1/2 z-50 w-[360px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl shadow-indigo-500/10 rounded-3xl p-5"
        style={{ animation: 'tourSlideIn 0.3s ease-out' }}
        role="dialog"
        aria-label={`Tour paso ${step + 1} de ${totalSteps}: ${current.title}`}
      >
        {/* Top bar: dots + skip */}
        <div className="flex items-center justify-between mb-3">
          <StepDots step={step} totalSteps={totalSteps} />
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Saltar tour
          </button>
        </div>

        {/* Emoji + Title */}
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

        {/* Tip box */}
        {current.tip && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl px-3 py-2 mt-3 text-xs text-indigo-600 dark:text-indigo-400">
            <span className="mr-1">💬</span>
            {current.tip}
          </div>
        )}

        {/* Bottom row */}
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
