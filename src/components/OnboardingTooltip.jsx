import { useState } from 'react'
import { Info, X } from 'lucide-react'

const STORAGE_KEY = 'easyresumen_onboarding_done'

export default function OnboardingTooltip({ hasData }) {
  const [done, setDone] = useState(() => !!localStorage.getItem(STORAGE_KEY))

  if (hasData || done) return null

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setDone(true)
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
      <Info size={16} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5">Cómo usar EasyResumen</p>
        <ul className="space-y-1">
          <li className="text-xs text-indigo-600 dark:text-indigo-300">
            1. Subí tu resumen PDF — CABAL, Visa, Galicia, AMEX y más
          </li>
          <li className="text-xs text-indigo-600 dark:text-indigo-300">
            2. Detectamos automáticamente categorías, tarjetas adicionales y moneda extranjera
          </li>
          <li className="text-xs text-indigo-600 dark:text-indigo-300">
            3. Todo se procesa en tu dispositivo — ningún dato sale de tu PC
          </li>
        </ul>
        <button
          onClick={handleDismiss}
          className="mt-2.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Entendido
        </button>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="opacity-40 hover:opacity-70 transition-opacity text-indigo-500 dark:text-indigo-400 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
