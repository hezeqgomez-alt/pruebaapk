import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ReceiptText, Trash2, Download, RefreshCw, FileBarChart2, X,
  CheckCircle, AlertTriangle, Info, Moon, Sun, Plus, FileSpreadsheet, Upload, LogOut, Menu, HelpCircle, Share2, Tag,
} from 'lucide-react'
import MobileDrawer from './components/MobileDrawer'
import UploadZone from './components/UploadZone'
import OnboardingTooltip from './components/OnboardingTooltip'
import StatsCards from './components/StatsCards'
import CategoryChart from './components/CategoryChart'
import MonthComparison from './components/MonthComparison'
import InsightsPanel from './components/InsightsPanel'
import TransactionList from './components/TransactionList'
import BudgetPanel from './components/BudgetPanel'
import InstallmentsPanel from './components/InstallmentsPanel'
import BalancePanel from './components/BalancePanel'
import LoansPanel from './components/LoansPanel'
import AddTransactionModal from './components/AddTransactionModal'
import BankGuideModal from './components/BankGuideModal'
import CategoryManagerModal from './components/CategoryManagerModal'
import { TrialBanner, ExpiredGate, UpdateToast } from './components/LicenseGate'
import AuthGate from './components/AuthGate'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { parsePDF } from './utils/pdfParser'
import { detectUnnecessary } from './utils/categorizer'
import { loadData, saveData, clearData, loadBudgets, saveBudgets, loadDarkMode, saveDarkMode, loadCustomCategories, saveCustomCategories } from './utils/storage'
import { cloudLoad, cloudSave } from './utils/cloudStorage'
import { generateReport } from './utils/reportGenerator'
import { exportXLSX } from './utils/exportXLSX'
import { importFromXLSX, importFromCSV } from './utils/importFile'

function Toast({ msg, onDone }) {
  const isError   = msg.startsWith('❌')
  const isWarning = msg.startsWith('⚠️')
  const isSuccess = msg.startsWith('✅') || msg.startsWith('📄') || msg.startsWith('📥') || msg.startsWith('🗑️')

  const base = 'fixed bottom-6 right-6 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm z-50 max-w-sm border backdrop-blur-sm'
  const style = isError
    ? `${base} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-700 dark:text-red-100`
    : isWarning
    ? `${base} bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/80 dark:border-amber-700 dark:text-amber-100`
    : `${base} bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100`

  const Icon = isError ? AlertTriangle : isWarning ? AlertTriangle : isSuccess ? CheckCircle : Info
  const iconColor = isError ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-indigo-500'

  useEffect(() => {
    const t = setTimeout(onDone, 3800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={style}>
      <Icon size={16} className={`${iconColor} shrink-0 mt-0.5`} />
      <span className="flex-1 leading-snug">{msg.replace(/^(?:✅|❌|⚠️|📄|📥|🗑️|ℹ️)\s*/, '')}</span>
      <button onClick={onDone} className="opacity-40 hover:opacity-70 transition-opacity ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

export default function App() {
  const [transactions, setTransactions]           = useState(() => {
    const saved = loadData()
    return saved.transactions?.length > 0 ? saved.transactions : []
  })
  const [loading, setLoading]                     = useState([])
  const [toast, setToast]                         = useState(null)
  const [activeTab, setActiveTab]                 = useState('dashboard')
  const [generating, setGenerating]               = useState(false)
  const [budgets, setBudgets]                     = useState(() => loadBudgets())
  const [darkMode, setDarkMode]                   = useState(() => loadDarkMode())
  const [customCategories, setCustomCategories]   = useState(() => loadCustomCategories())
  const [showAddModal, setShowAddModal]           = useState(false)
  const [showBankGuide, setShowBankGuide]         = useState(false)
  const [showCatManager, setShowCatManager]       = useState(false)
  const [ocrProgress, setOcrProgress]             = useState(null)
  const [filteredForReport, setFilteredForReport] = useState(null)
  const [drawerOpen, setDrawerOpen]               = useState(false)
  const { user, trialStatus, trackPDF: webTrackPDF, refreshTrial, signOut } = useAuth()

  // In Electron: use electronAPI license. On web: use auth context.
  const [electronLicense, setElectronLicense] = useState(null)
  const licenseStatus = window.electronAPI ? electronLicense : trialStatus

  const chartDonutRef = useRef(null)
  const chartBarRef   = useRef(null)
  const addBtnRef     = useRef(null)

  // Electron-only license check on mount
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getLicenseStatus().then(setElectronLicense)
  }, [])

  // Apply / remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    saveDarkMode(darkMode)
  }, [darkMode])

  // Load from cloud when user logs in (web only)
  useEffect(() => {
    if (window.electronAPI || !user?.id) return
    cloudLoad(user.id).then(cloud => {
      const localTxs   = loadData().transactions ?? []
      const localBudg  = loadBudgets()
      const localCats  = loadCustomCategories()

      if (cloud?.transactions?.length > 0) {
        // Cloud has data — use it as source of truth
        const valid = cloud.transactions.filter(t => t && t.date && t.amount > 0)
        setTransactions(valid)
        setToast(`📥 ${valid.length} movimientos cargados desde la nube`)
      } else if (localTxs.length > 0) {
        // First login with local data — push to cloud so it's not lost
        cloudSave(user.id, { transactions: localTxs, budgets: localBudg, customCategories: localCats })
      }

      if (cloud?.budgets && Object.keys(cloud.budgets).length > 0) setBudgets(cloud.budgets)
      if (cloud?.custom_categories && Object.keys(cloud.custom_categories).length > 0) {
        setCustomCategories(cloud.custom_categories)
      }
    })
  }, [user?.id])

  // Save to localStorage always; sync to cloud (debounced 2s) when logged in
  useEffect(() => {
    saveData({ transactions })
  }, [transactions])

  useEffect(() => {
    if (window.electronAPI || !user?.id) return
    const t = setTimeout(() => cloudSave(user.id, { transactions, budgets, customCategories }), 2000)
    return () => clearTimeout(t)
  }, [transactions, budgets, customCategories, user?.id])

  const handleBudgetsChange = useCallback((b) => {
    setBudgets(b)
    saveBudgets(b)
  }, [])

  const handleCustomCategoriesChange = useCallback((cats) => {
    setCustomCategories(cats)
    saveCustomCategories(cats)
  }, [])

  const handleFiles = useCallback(async (files) => { // eslint-disable-line react-hooks/exhaustive-deps
    for (const file of files) {
      // Check PDF limit for trial users before parsing
      if (window.electronAPI) {
        const check = await window.electronAPI.trackPDF()
        if (!check.allowed) {
          setToast(`❌ Límite de prueba: ya analizaste ${check.pdfLimit} resúmenes. Activá tu licencia para continuar.`)
          setElectronLicense(s => s ? { ...s, pdfCount: check.pdfCount } : s)
          continue
        }
        setElectronLicense(s => s?.status === 'trial' ? { ...s, pdfCount: check.pdfCount } : s)
      } else if (isSupabaseConfigured && user) {
        await webTrackPDF()
      }

      setLoading(l => [...l, file.name])
      try {
        const result = await parsePDF(file, {
          onProgress: (info) => {
            if (info.stage === 'ocr') {
              setOcrProgress({ file: file.name, page: info.page, total: info.total, pct: info.pct })
            }
          },
        })
        setOcrProgress(null)

        if (result.pageErrors > 0) {
          setToast(`⚠️ ${result.pageErrors} página(s) con error en "${file.name}" — resto importado`)
        }

        if (result.scanned && result.ocrFailed) {
          setToast(`⚠️ "${file.name}" es escaneado y el OCR falló. Revisá el archivo.`)
        } else if (result.scanned && !result.ocr) {
          setToast(`⚠️ "${file.name}" es un PDF escaneado. Subilo de nuevo para procesar con OCR.`)
        } else if (result.transactions.length === 0) {
          setToast(`⚠️ Sin movimientos en "${file.name}" (banco: ${result.bank})`)
        } else {
          setTransactions(prev => {
            // Count-based dedup: allow a transaction from this batch if it appears
            // more times in result.transactions than it already does in prev.
            // This preserves legitimate same-key duplicates (e.g. two NEUMEN cuotas
            // with identical date/amount/description) while still blocking true
            // cross-upload duplicates.
            const txKey = t => `${t.date}|${t.amount}|${t.description}|${t.source}`
            const existingCounts = new Map()
            for (const t of prev) {
              const k = txKey(t)
              existingCounts.set(k, (existingCounts.get(k) ?? 0) + 1)
            }
            const seenInBatch = new Map()
            const newOnes = result.transactions.filter(t => {
              const k = txKey(t)
              const batchCount = (seenInBatch.get(k) ?? 0) + 1
              seenInBatch.set(k, batchCount)
              return batchCount > (existingCounts.get(k) ?? 0)
            })
            const debCnt = newOnes.filter(t => t.type !== 'credit').length
            const creCnt = newOnes.filter(t => t.type === 'credit').length
            const ocrTag = result.ocr ? ' (OCR)' : ''
            const detail = creCnt > 0 ? ` · ${debCnt} débitos + ${creCnt} créditos` : ''
            const dupeCount = result.transactions.length - newOnes.length
            const dupeMsg = dupeCount > 0 ? ` · ${dupeCount} duplicada${dupeCount > 1 ? 's' : ''} omitida${dupeCount > 1 ? 's' : ''}` : ''
            setToast(`✅ ${newOnes.length} movimientos de ${result.bank}${detail}${ocrTag}${dupeMsg}`)
            return [...prev, ...newOnes]
          })
        }
      } catch (e) {
        setOcrProgress(null)
        console.error('parsePDF error:', e)
        setToast(`❌ Error en "${file.name}": ${e?.message || String(e)}`)
      }
      setLoading(l => l.filter(n => n !== file.name))
    }
  }, [user, webTrackPDF])

  const handleClearAll = () => {
    if (confirm('¿Borrar todos los movimientos cargados?')) {
      setTransactions([])
      clearData()
      if (user?.id && !window.electronAPI) {
        cloudSave(user.id, { transactions: [], budgets, customCategories })
      }
      setToast('🗑️ Datos eliminados')
    }
  }

  const exportCSV = () => {
    const data = filteredForReport ?? transactions
    const rows = [
      ['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Importe', 'Origen'],
      ...data.map(t => [
        t.date,
        `"${t.description.replace(/"/g, "'")}"`,
        t.category,
        t.type || 'debit',
        t.type === 'credit' ? t.amount : -t.amount,
        `"${t.source}"`,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    const blobUrl = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.href = blobUrl
    a.download = 'easyresumen_gastos.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    setToast('📥 CSV exportado')
  }

  const handleShare = useCallback(async () => {
    const txs = filteredForReport ?? transactions
    const total = txs.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0)
    const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
    const months = [...new Set(txs.map(t => t.date.slice(0, 7)))].sort()
    const period = months.length === 1 ? months[0] : `${months[0]} al ${months[months.length - 1]}`
    const text = `📊 *Resumen EasyResumen* — ${period}\n💳 Total gastos: ${fmt(total)}\n📦 ${txs.length} movimientos\n\nGenerado en www.easyresumen.com.ar`

    if (navigator.share) {
      // Try Web Share API level 2 — share PDF + Excel files
      try {
        setToast('⏳ Generando archivos...')
        setActiveTab('dashboard')
        await new Promise(r => setTimeout(r, 300))
        const [pdfResult, xlsxResult] = await Promise.all([
          generateReport({ transactions: txs, chartDonutRef, chartBarRef, asBlob: true }),
          Promise.resolve(exportXLSX(txs, { asBlob: true })),
        ])
        const files = [
          new File([pdfResult.blob], pdfResult.fileName, { type: 'application/pdf' }),
          new File([xlsxResult.blob], xlsxResult.fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        ]
        if (navigator.canShare?.({ files })) {
          await navigator.share({ title: 'Mi resumen — EasyResumen', text, files })
          setToast('✅ Archivos compartidos')
          return
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        // File share not supported — fall through to text-only
      }
      // Fallback: share text only (desktop browsers / no file support)
      try {
        await navigator.share({ title: 'Mi resumen — EasyResumen', text })
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard?.writeText(text)
          setToast('✅ Resumen copiado al portapapeles')
        }
      }
    } else {
      navigator.clipboard.writeText(text)
      setToast('✅ Resumen copiado al portapapeles')
    }
  }, [transactions, filteredForReport, chartDonutRef, chartBarRef])

  const handleExportXLSX = () => {
    try {
      const data = filteredForReport ?? transactions
      exportXLSX(data)
      setToast('📥 Excel exportado')
    } catch (e) {
      setToast(`❌ Error exportando Excel: ${e.message}`)
    }
  }

  const handleImportFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const name = file.name.toLowerCase()
    const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls')
    const isCSV  = name.endsWith('.csv')
    if (!isXLSX && !isCSV) {
      setToast('⚠️ Solo se pueden importar archivos .xlsx o .csv')
      return
    }

    try {
      let imported
      if (isXLSX) {
        imported = await importFromXLSX(file)
      } else {
        const text = await file.text()
        imported = importFromCSV(text)
      }

      if (imported.length === 0) {
        setToast('⚠️ No se encontraron movimientos válidos en el archivo')
        return
      }

      setTransactions(prev => {
        const existingKeys = new Set(prev.map(t => t.date + '|' + t.amount + '|' + t.description + '|' + t.source))
        const newOnes = imported.filter(t => !existingKeys.has(t.date + '|' + t.amount + '|' + t.description + '|' + t.source))
        const dupes = imported.length - newOnes.length
        const dupeMsg = dupes > 0 ? ` (${dupes} ya existían)` : ''
        setToast(`✅ ${newOnes.length} movimientos importados desde ${file.name}${dupeMsg}`)
        return [...prev, ...newOnes]
      })
    } catch (err) {
      setToast(`❌ Error importando "${file.name}": ${err.message}`)
    }
  }, [])

  const handleGenerateReport = async () => {
    if (generating) return
    setActiveTab('dashboard')
    setGenerating(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const reportTxs = filteredForReport ?? transactions
      const fileName = await generateReport({ transactions: reportTxs, chartDonutRef, chartBarRef })
      setToast(`📄 Informe guardado: ${fileName}`)
    } catch (e) {
      setToast(`❌ Error generando informe: ${e.message}`)
    }
    setGenerating(false)
  }

  const handleAddTransaction = (tx) => {
    setTransactions(prev => [...prev, tx])
    setToast('✅ Movimiento agregado')
  }

  const [findingsKey, setFindingsKey] = useState(0)
  const findings = useMemo(() => detectUnnecessary(transactions), [transactions])
  const hasData  = transactions.length > 0

  const hasInstallments = transactions.some(t => t.installment)

  const tabs = [
    { id: 'dashboard',    label: 'Resumen' },
    { id: 'movimientos',  label: 'Movimientos', count: (filteredForReport && filteredForReport.length < transactions.length) ? filteredForReport.length : transactions.length },
    { id: 'presupuesto',  label: 'Presupuesto' },
    ...(hasInstallments ? [{ id: 'cuotas', label: 'Cuotas' }] : []),
    { id: 'prestamos',    label: 'Préstamos' },
    { id: 'balance',      label: 'Balance' },
    { id: 'insights',     label: 'Alertas',
      count: findings.filter(f => f.type !== 'lastInstallment').length,
      countGreen: findings.filter(f => f.type === 'lastInstallment').length },
  ]

  const refreshLicense = () => {
    if (window.electronAPI) {
      window.electronAPI.getLicenseStatus().then(setElectronLicense)
    } else {
      refreshTrial()
    }
  }

  // Web auth gate: show login/register when Supabase is configured and user is not logged in
  // user===undefined means still loading; null means no session
  if (isSupabaseConfigured && !window.electronAPI && user === null) {
    return <AuthGate />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:bg-[#0f0f1a] dark:bg-none relative overflow-x-hidden">

      {/* ── Dark mode animated background ── */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-900/5 rounded-full blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
        />
      </div>

      {/* ── License gates ── */}
      {licenseStatus?.status === 'expired' && <ExpiredGate onActivated={refreshLicense} />}
      {licenseStatus?.status === 'trial'   && <TrialBanner daysLeft={licenseStatus.daysLeft} pdfCount={licenseStatus.pdfCount} pdfLimit={licenseStatus.pdfLimit} onActivated={refreshLicense} />}
      <UpdateToast />

      {/* ── Mobile Drawer ── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tabs={tabs}
        activeTab={activeTab}
        onTab={setActiveTab}
        hasData={hasData}
        generating={generating}
        onReport={handleGenerateReport}
        onExcelExport={handleExportXLSX}
        onCSVExport={exportCSV}
        onClear={handleClearAll}
        onImport={handleImportFile}
        onPDFFiles={handleFiles}
        darkMode={darkMode}
        onDarkMode={() => setDarkMode(d => !d)}
        user={user}
        onSignOut={signOut}
        filteredCount={filteredForReport?.length}
        totalCount={transactions.length}
        isSupabaseConfigured={isSupabaseConfigured}
      />

      {/* ── Header ── */}
      <header className="bg-white/90 dark:bg-white/5 backdrop-blur-md dark:backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-40 shadow-sm dark:shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 shrink-0">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                EasyResumen
              </h1>
              {licenseStatus?.status === 'active' ? (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white tracking-wide shadow-sm shadow-indigo-500/30">
                  PRO
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-400/20 tracking-wide">
                  100% local
                </span>
              )}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2">
            {hasData && (
              <>
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-sm shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-60"
                >
                  {generating ? <RefreshCw size={14} className="animate-spin" /> : <FileBarChart2 size={14} />}
                  {generating ? 'Generando…' : 'Informe PDF'}
                </button>
                <button
                  onClick={handleExportXLSX}
                  className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 border border-emerald-200 dark:border-emerald-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
                >
                  <FileSpreadsheet size={14} />
                  Excel{filteredForReport && filteredForReport.length < transactions.length ? ` (${filteredForReport.length})` : ''}
                  {filteredForReport && filteredForReport.length < transactions.length && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={exportCSV}
                  className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                >
                  <Download size={14} />
                  CSV{filteredForReport && filteredForReport.length < transactions.length ? ` (${filteredForReport.length})` : ''}
                  {filteredForReport && filteredForReport.length < transactions.length && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                  title="Compartir resumen"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
                <button
                  onClick={() => setShowCatManager(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                  title="Gestionar categorías"
                >
                  <Tag size={14} />
                  <span className="hidden sm:inline">Categorías</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-red-200 dark:border-red-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 font-medium transition-colors"
                >
                  <Trash2 size={14} />
                  Borrar
                </button>
              </>
            )}
            <label className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium transition-colors cursor-pointer">
              <Upload size={14} />
              Importar
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            </label>
            <button
              ref={addBtnRef}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
            >
              <Plus size={14} />
              Agregar
            </button>
            <button
              onClick={() => setDarkMode(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {isSupabaseConfigured && !window.electronAPI && user && (
              <button
                onClick={signOut}
                title={`Cerrar sesión (${user.email})`}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              ref={addBtnRef}
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900"
            >
              <Plus size={17} />
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 overflow-x-hidden">

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <UploadZone
              onFiles={handleFiles}
              compact={hasData}
              onRejected={(names) => setToast(`⚠️ Solo se aceptan PDF. Ignorados: ${names.join(', ')}`)}
            />
          </div>
          <button
            onClick={() => setShowBankGuide(true)}
            title="¿Cómo bajo el PDF de mi banco?"
            className={`shrink-0 flex items-center gap-2 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs font-medium ${hasData ? 'h-[52px]' : 'h-[52px] self-center'}`}
          >
            <HelpCircle size={15} />
            <span className="hidden sm:inline">¿Cómo bajo el PDF?</span>
          </button>
        </div>
        <OnboardingTooltip hasData={hasData} />

        {/* Processing indicator */}
        {(loading.length > 0 || ocrProgress) && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-4 py-3 flex items-center gap-3 text-indigo-700 dark:text-indigo-300 text-sm">
            <RefreshCw size={15} className="animate-spin shrink-0" />
            {ocrProgress ? (
              <span>
                OCR página {ocrProgress.page}/{ocrProgress.total} de{' '}
                <span className="font-medium">{ocrProgress.file}</span>
                {ocrProgress.pct != null && ` (${Math.round(ocrProgress.pct)}%)`}
              </span>
            ) : (
              <span>Procesando: <span className="font-medium">{loading.join(', ')}</span>…</span>
            )}
          </div>
        )}

        {hasData && (
          <>
            <StatsCards transactions={transactions} tabs={tabs} onTab={setActiveTab} />

            {/* Tabs — solo desktop */}
            <div className="hidden lg:flex gap-1 bg-slate-100/80 dark:bg-white/5 dark:border dark:border-white/10 rounded-2xl p-1 w-fit overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-white/10 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.countGreen > 0 && (
                    <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200">
                      {tab.countGreen}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div className="grid lg:grid-cols-2 gap-5">
                <CategoryChart ref={chartDonutRef} transactions={transactions} />
                <MonthComparison ref={chartBarRef} transactions={transactions} />
              </div>
            )}

            {/* Always mounted to preserve page/sort state when switching tabs */}
            <div className={activeTab !== 'movimientos' ? 'hidden' : ''}>
              <TransactionList transactions={transactions} onUpdate={setTransactions} onFilteredChange={setFilteredForReport} customCategories={customCategories} />
            </div>

            {activeTab === 'presupuesto' && (
              <BudgetPanel
                transactions={transactions}
                budgets={budgets}
                onBudgetsChange={handleBudgetsChange}
                customCategories={customCategories}
              />
            )}

            {activeTab === 'cuotas' && (
              <InstallmentsPanel transactions={transactions} />
            )}

            {activeTab === 'prestamos' && (
              <LoansPanel />
            )}

            {activeTab === 'balance' && (
              <BalancePanel transactions={transactions} />
            )}

            {activeTab === 'insights' && (
              <InsightsPanel
                key={findingsKey}
                findings={findings}
                transactions={transactions}
                onRefresh={() => setFindingsKey(k => k + 1)}
              />
            )}
          </>
        )}

        {!hasData && !loading.length && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:bg-white/5 dark:border dark:border-white/10 dark:bg-none flex items-center justify-center mx-auto mb-4">
              <ReceiptText size={28} className="text-indigo-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Cargá un PDF de resumen para comenzar</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Compatible con CABAL, VISA, Mastercard y más</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium transition-colors"
            >
              <Plus size={14} />
              O ingresá un movimiento manualmente
            </button>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddTransactionModal
          onAdd={handleAddTransaction}
          onClose={() => setShowAddModal(false)}
          triggerRef={addBtnRef}
        />
      )}

      {showBankGuide && <BankGuideModal onClose={() => setShowBankGuide(false)} />}

      {showCatManager && (
        <CategoryManagerModal
          customCategories={customCategories}
          onChange={handleCustomCategoriesChange}
          onClose={() => setShowCatManager(false)}
        />
      )}

      {toast && <Toast key={toast} msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
