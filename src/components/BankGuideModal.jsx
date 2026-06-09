import { useState } from 'react'
import { X, ChevronRight, ExternalLink, HelpCircle } from 'lucide-react'

const GUIDES = [
  {
    bank: 'Galicia',
    icon: '🔴',
    steps: [
      'Ingresá a homebanking.galicia.com.ar',
      'Ir a Tarjetas → tu tarjeta',
      'Clic en "Resumen" y elegí el período',
      'Botón "Descargar PDF" o ícono de descarga',
    ],
    tip: 'Si no lo encontrás, buscá en la sección "Mis resúmenes".',
  },
  {
    bank: 'BBVA',
    icon: '🔵',
    steps: [
      'Ingresá a bbva.com.ar',
      'Ir a Tarjetas de crédito',
      'Seleccioná la tarjeta y "Ver resumen"',
      'Clic en el ícono PDF para descargar',
    ],
    tip: 'También disponible en la app BBVA Argentina.',
  },
  {
    bank: 'Santander',
    icon: '🔴',
    steps: [
      'Ingresá a online.santander.com.ar',
      'Ir a Tarjetas → Resumen de cuenta',
      'Elegí el mes que querés',
      'Clic en "Descargar" → PDF',
    ],
    tip: 'La app móvil Santander Argentina también permite descargarlo.',
  },
  {
    bank: 'Macro',
    icon: '🟡',
    steps: [
      'Ingresá a macro.com.ar/homebanking',
      'Ir a Tarjetas → Mi resumen',
      'Seleccioná el período',
      'Botón "Descargar PDF"',
    ],
    tip: 'Disponible desde la app Macro con el mismo menú.',
  },
  {
    bank: 'Naranja X',
    icon: '🟠',
    steps: [
      'Abrí la app Naranja X',
      'Tocá en tu tarjeta',
      'Ir a "Resumen" y elegí el mes',
      'Tocá los tres puntos → "Descargar PDF"',
    ],
    tip: 'En la web: naranjax.com → Tarjetas → Resumen.',
  },
  {
    bank: 'American Express',
    icon: '🔷',
    steps: [
      'Ingresá a americanexpress.com/ar',
      'Ir a "Mi cuenta" → Resúmenes',
      'Elegí el período',
      'Clic en "Ver resumen" → Descargar PDF',
    ],
    tip: 'También disponible en la app American Express.',
  },
  {
    bank: 'Galicia Más (ex HSBC)',
    icon: '🔴',
    steps: [
      'Ingresá a homebanking.galiciamas.com.ar',
      'Ir a Tarjetas → Resúmenes',
      'Seleccioná el mes',
      'Botón "Descargar" en formato PDF',
    ],
    tip: 'HSBC Argentina pasó a llamarse Galicia Más en diciembre 2024. Si tenés resúmenes anteriores a esa fecha, el formato es compatible igual.',
  },
  {
    bank: 'Banco Nación',
    icon: '🟢',
    steps: [
      'Ingresá a BNA+ (bna.com.ar)',
      'Ir a Tarjetas → Resumen digital',
      'Elegí el período',
      'Clic en "Descargar PDF"',
    ],
    tip: 'Requiere tener activado el resumen digital en tu sucursal.',
  },
  {
    bank: 'Supervielle',
    icon: '🟣',
    steps: [
      'Ingresá a homebanking.supervielle.com.ar',
      'Ir a Tarjetas → Resúmenes',
      'Seleccioná la tarjeta y el período',
      'Botón "Descargar PDF"',
    ],
  },
  {
    bank: 'Banco Ciudad',
    icon: '🟡',
    steps: [
      'Ingresá a hb.bancociudad.com.ar',
      'Ir a Tarjetas → Resumen de cuenta',
      'Elegí el mes',
      'Descargá en formato PDF',
    ],
  },
  {
    bank: 'Brubank',
    icon: '🔵',
    steps: [
      'Abrí la app Brubank',
      'Ir a Tarjeta → Movimientos',
      'Tocá los tres puntos arriba a la derecha',
      'Seleccioná "Descargar resumen"',
    ],
    tip: 'Brubank solo disponible por app móvil.',
  },
  {
    bank: 'Ualá',
    icon: '🟣',
    steps: [
      'Abrí la app Ualá',
      'Ir a Tarjeta Mastercard',
      'Tocá "Resumen" y elegí el período',
      'Botón "Descargar" para obtener el PDF',
    ],
    tip: 'Ualá solo disponible por app móvil.',
  },
  {
    bank: 'ex Itaú (ahora Macro)',
    icon: '🟠',
    steps: [
      'Ingresá a macro.com.ar y accedé al Home Banking',
      'Ir a Tarjetas → tu tarjeta de crédito',
      'Seleccioná "Resumen" y elegí el período',
      'Clic en "Descargar PDF"',
    ],
    tip: 'Banco Itaú Argentina fue absorbido por Banco Macro en noviembre 2023. Los resúmenes anteriores a esa fecha siguen siendo compatibles.',
  },
  {
    bank: 'ICBC',
    icon: '🔴',
    steps: [
      'Ingresá a accessbanking.com.ar',
      'Ir a Tarjetas → Resumen de cuenta',
      'Elegí la tarjeta y el mes',
      'Clic en el ícono PDF para descargar',
    ],
    tip: 'El homebanking de ICBC se llama Access Banking. También disponible en la app ICBC Mobile Banking.',
  },
  {
    bank: 'Banco Patagonia',
    icon: '🟢',
    steps: [
      'Ingresá a ebankpersonas.bancopatagonia.com.ar',
      'Ir a Tarjetas → tu tarjeta de crédito',
      'Seleccioná "Resumen" y el período',
      'Clic en "Descargar" en formato PDF',
    ],
    tip: 'Disponible también desde la app Patagonia Móvil.',
  },
  {
    bank: 'Credicoop',
    icon: '🔵',
    steps: [
      'Ingresá a bancainternet.bancocredicoop.coop',
      'Ir a Tarjetas → Resúmenes',
      'Seleccioná la tarjeta y el período',
      'Clic en "Descargar PDF"',
    ],
    tip: 'Si no encontrás el PDF, contactá a tu sucursal para activar el resumen digital.',
  },
]

export default function BankGuideModal({ onClose }) {
  const [selected, setSelected] = useState(null)
  const guide = selected !== null ? GUIDES[selected] : null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <HelpCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            {guide ? (
              <button onClick={() => setSelected(null)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium mb-0.5 flex items-center gap-1">
                ← Todos los bancos
              </button>
            ) : null}
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              {guide ? `Cómo bajar el PDF — ${guide.bank}` : '¿Cómo bajo el PDF de mi banco?'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {guide ? (
            /* Step-by-step view */
            <div className="px-6 py-5">
              <div className="text-4xl mb-4 text-center">{guide.icon}</div>
              <ol className="space-y-3 mb-4">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{step}</span>
                  </li>
                ))}
              </ol>
              {guide.tip && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                  💡 {guide.tip}
                </div>
              )}
            </div>
          ) : (
            /* Bank list view */
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {GUIDES.map((g, i) => (
                <button
                  key={g.bank}
                  onClick={() => setSelected(i)}
                  className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
                >
                  <span className="text-xl w-8 text-center">{g.icon}</span>
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{g.bank}</span>
                  <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            ¿Tu banco no está en la lista?{' '}
            <a href="mailto:soporte@easyresumen.com.ar" className="text-indigo-500 hover:underline">
              Escribinos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
