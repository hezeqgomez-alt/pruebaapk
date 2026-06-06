import { useEffect, useRef } from 'react'
import {
  X, FileBarChart2, FileSpreadsheet, Download, Upload,
  Plus, Trash2, Moon, Sun, LogOut, RefreshCw,
  LayoutDashboard, List, PiggyBank, CreditCard, Landmark, BarChart2, AlertTriangle,
  FileText,
} from 'lucide-react'

const NAV_ICONS = {
  dashboard:   LayoutDashboard,
  movimientos: List,
  presupuesto: PiggyBank,
  cuotas:      CreditCard,
  prestamos:   Landmark,
  balance:     BarChart2,
  insights:    AlertTriangle,
}

export default function MobileDrawer({
  open, onClose,
  tabs, activeTab, onTab,
  hasData, generating,
  onReport, onExcelExport, onCSVExport, onClear,
  onImport, onPDFFiles,
  darkMode, onDarkMode,
  user, onSignOut,
  filteredCount, totalCount,
  isSupabaseConfigured,
}) {
  const pdfInputRef = useRef(null)
  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const hasFilter = filteredCount != null && filteredCount < totalCount

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header del drawer */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <span className="font-bold text-slate-700 dark:text-slate-200">Menú</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 px-4">

          {/* ── Subir PDF ── */}
          <div>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || [])
                if (files.length) onPDFFiles(files)
                e.target.value = ''
                onClose()
              }}
            />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <FileText size={16} />
              Subir resumen PDF
            </button>
          </div>

          {/* ── Navegación ── */}
          {hasData && tabs.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
                Vistas
              </p>
              <nav className="space-y-0.5">
                {tabs.map(tab => {
                  const Icon = NAV_ICONS[tab.id] || LayoutDashboard
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { onTab(tab.id); onClose() }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-indigo-500' : 'text-slate-400'} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {tab.count != null && tab.count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                          {tab.count}
                        </span>
                      )}
                      {tab.countGreen > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                          {tab.countGreen}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </section>
          )}

          {/* ── Acciones ── */}
          {hasData && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
                Acciones
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => { onReport(); onClose() }}
                  disabled={generating}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all disabled:opacity-50"
                >
                  {generating ? <RefreshCw size={16} className="animate-spin" /> : <FileBarChart2 size={16} />}
                  {generating ? 'Generando...' : 'Informe PDF'}
                </button>

                <button
                  onClick={() => { onExcelExport(); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all"
                >
                  <FileSpreadsheet size={16} />
                  Excel{hasFilter ? ` (${filteredCount})` : ''}
                </button>

                <button
                  onClick={() => { onCSVExport(); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Download size={16} />
                  CSV{hasFilter ? ` (${filteredCount})` : ''}
                </button>

                <button
                  onClick={() => { onClear(); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                >
                  <Trash2 size={16} />
                  Borrar datos
                </button>
              </div>
            </section>
          )}

          {/* ── Importar / Agregar ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
              Datos
            </p>
            <div className="space-y-0.5">
              <label className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all cursor-pointer">
                <Upload size={16} />
                Importar Excel / CSV
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { onImport(e); onClose() }} />
              </label>
            </div>
          </section>

        </div>

        {/* ── Footer: dark mode + logout ── */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 space-y-0.5 shrink-0">
          <button
            onClick={onDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {isSupabaseConfigured && !window.electronAPI && user && (
            <button
              onClick={() => { onSignOut(); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <LogOut size={16} />
              <span className="flex-1 text-left">Cerrar sesión</span>
              {user.email && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</span>}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
