import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ReceiptText, Trash2, Download, RefreshCw, FileBarChart2, X,
  CheckCircle, AlertTriangle, Info, Moon, Sun, Plus, FileSpreadsheet, Upload, LogOut, Menu, HelpCircle, Share2, Tag, ChevronDown, CreditCard,
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
import CardManagerModal from './components/CardManagerModal'
import TourGuide from './components/TourGuide'
import { TrialBanner, ExpiredGate, UpdateToast } from './components/LicenseGate'
import SubscribeModal from './components/SubscribeModal'
import AuthGate from './components/AuthGate'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { parsePDF } from './utils/pdfParser'
import { detectUnnecessary, CATEGORIZER_VERSION, recategorizeAll } from './utils/categorizer'
import { loadData, saveData, clearData, clearAllUserData, loadBudgets, saveBudgets, loadDarkMode, saveDarkMode, loadCustomCategories, saveCustomCategories, loadCardNames, saveCardNames, loadCategorizerVersion, saveCategorizerVersion } from './utils/storage'
import { cloudLoad, cloudSave } from './utils/cloudStorage'
import { generateReport } from './utils/reportGenerator'
import { exportXLSX } from './utils/exportXLSX'
import { importFromXLSX, importFromCSV } from './utils/importFile'
import ErrorBoundary from './components/ErrorBoundary'
import { initAnalytics, trackEvent } from './utils/analytics'

function translatePdfError(msg) {
  if (!msg) return 'Error desconocido'
  const m = msg.toLowerCase()
  if (m.includes('empty') && m.includes('zero bytes')) {
    return 'El archivo está vacío (0 bytes). Si lo seleccionaste desde Google Drive u otra nube, descargalo primero al dispositivo e intentá de nuevo.'
  }
  if (m.includes('invalid pdf structure') || m.includes('missing pdf')) {
    return 'El archivo no es un PDF válido o está dañado.'
  }
  if (m.includes('password')) {
    return 'El PDF está protegido con contraseña. Quitá la contraseña antes de subirlo.'
  }
  if (m.includes('no such file') || m.includes('not found')) {
    return 'No se encontró el archivo.'
  }
  return msg
}

function Toast({ msg, onDone }) {
  const isError   = msg.startsWith('❌')
  const isWarning = msg.startsWith('⚠️')
  const isSuccess = msg.startsWith('✅') || msg.startsWith('📄') || msg.startsWith('📥') || msg.startsWith('🗑️')

  const base = 'flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm max-w-sm border backdrop-blur-sm pointer-events-auto'
  const style = isError
    ? `${base} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-700 dark:text-red-100`
    : isWarning
    ? `${base} bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/80 dark:border-amber-700 dark:text-amber-100`
    : `${base} bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100`

  const Icon = isError ? AlertTriangle : isWarning ? AlertTriangle : isSuccess ? CheckCircle : Info
  const iconColor = isError ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-indigo-500'

  // Errors stay until the user dismisses them; the rest auto-dismiss
  useEffect(() => {
    if (isError) return
    const t = setTimeout(onDone, isWarning ? 6000 : 3800)
    return () => clearTimeout(t)
  }, [onDone, isError, isWarning])

  return (
    <div className={style} role="alert" aria-live="assertive">
      <Icon size={16} className={`${iconColor} shrink-0 mt-0.5`} aria-hidden="true" />
      <span className="flex-1 leading-snug">{msg.replace(/^(?:✅|❌|⚠️|📄|📥|🗑️|ℹ️)\s*/, '')}</span>
      <button onClick={onDone} className="opacity-40 hover:opacity-70 transition-opacity ml-1" aria-label="Cerrar notificación">
        <X size={14} />
      </button>
    </div>
  )
}

export default function App() {
  const [transactions, setTransactions]           = useState(() => {
    const saved = loadData()
    let txs = saved.transactions?.length > 0 ? saved.transactions : []
    if (txs.length > 0 && loadCategorizerVersion() < CATEGORIZER_VERSION) {
      txs = recategorizeAll(txs)
      saveCategorizerVersion(CATEGORIZER_VERSION)
    }
    return txs
  })
  const [loading, setLoading]                     = useState([])
  const [toasts, setToasts]                       = useState([]) // [{ id, msg }]
  const toastIdRef                                = useRef(0)
  const setToast = useCallback((msg) => {
    if (!msg) return
    const id = ++toastIdRef.current
    setToasts(ts => [...ts.slice(-3), { id, msg }]) // máx. 4 visibles
  }, [])
  const dismissToast = useCallback((id) => setToasts(ts => ts.filter(t => t.id !== id)), [])
  const [activeTab, setActiveTab]                 = useState('dashboard')
  const [generating, setGenerating]               = useState(false)
  const [sharing, setSharing]                     = useState(false)
  const [budgets, setBudgets]                     = useState(() => loadBudgets())
  const [darkMode, setDarkMode]                   = useState(() => loadDarkMode())
  const [customCategories, setCustomCategories]   = useState(() => loadCustomCategories())
  const [cardNames, setCardNames]                 = useState(() => loadCardNames())
  const [showAddModal, setShowAddModal]           = useState(false)
  const [showBankGuide, setShowBankGuide]         = useState(false)
  const [showCatManager, setShowCatManager]       = useState(false)
  const [showCardManager, setShowCardManager]     = useState(false)
  const openCardManager = useCallback(() => setShowCardManager(true), [])
  const [tourStep, setTourStep] = useState(null) // null = inactive, 0-4 = active step
  const prevTxLenRef = useRef(transactions.length)

  const handleTourNext = useCallback(() => {
    setTourStep(prev => {
      const TOUR_TABS = ['dashboard', 'dashboard', 'movimientos', 'insights', 'insights']
      const next = prev + 1
      if (next >= TOUR_TABS.length) {
        localStorage.setItem('er_tour_done', '1')
        return null
      }
      const nextTab = TOUR_TABS[next]
      if (nextTab) setActiveTab(nextTab)
      return next
    })
  }, [])

  const handleTourSkip = useCallback(() => {
    localStorage.setItem('er_tour_done', '1')
    setTourStep(null)
  }, [])

  const [ocrProgress, setOcrProgress]             = useState(null)
  const [filteredForReport, setFilteredForReport] = useState(null)
  const [drawerOpen, setDrawerOpen]               = useState(false)
  const { user, trialStatus, trackPDF: webTrackPDF, refreshTrial, signOut: authSignOut, passwordRecovery } = useAuth()

  // Clear all local data before signing out so it doesn't bleed into the next user's session
  const signOut = useCallback(async () => {
    setTransactions([])
    setBudgets({})
    setCustomCategories({})
    cloudLoadedRef.current = false
    prevUserIdRef.current = null
    clearAllUserData()
    await authSignOut()
  }, [authSignOut])

  // In Electron: use electronAPI license. On web: use auth context.
  const [electronLicense, setElectronLicense] = useState(null)
  const licenseStatus = window.electronAPI ? electronLicense : trialStatus

  // Post-login subscription invite: web only, users WITHOUT an active plan,
  // at most once every 7 days (dismissal timestamp in localStorage).
  const [showSubPromo, setShowSubPromo] = useState(false)
  useEffect(() => {
    if (window.electronAPI || !user || !trialStatus) return
    if (trialStatus.status === 'active') return
    const lastSeen = Number(localStorage.getItem('er_sub_promo_seen_at') || 0)
    if (Date.now() - lastSeen < 7 * 86_400_000) return
    setShowSubPromo(true)
  }, [user, trialStatus])
  const dismissSubPromo = () => {
    localStorage.setItem('er_sub_promo_seen_at', String(Date.now()))
    setShowSubPromo(false)
  }

  const chartDonutRef   = useRef(null)
  const chartBarRef     = useRef(null)
  const addBtnRef       = useRef(null)
  const cloudLoadedRef      = useRef(false) // 'ok' | false — gates debounced save until first cloud load succeeds
  const cloudSaveFailCount  = useRef(0)     // consecutive save failures (shown as subtle header icon, not toast)
  const prevUserIdRef       = useRef(null)  // tracks last logged-in user ID to detect account switches
  const reportPickerRef     = useRef(null)
  const [showReportPicker, setShowReportPicker] = useState(false)

  const sources = useMemo(() => [...new Set(transactions.map(t => t.source))].sort(), [transactions])

  // Init analytics once on mount
  useEffect(() => { initAnalytics() }, [])

  // Close report picker on outside click
  useEffect(() => {
    if (!showReportPicker) return
    function handle(e) { if (reportPickerRef.current && !reportPickerRef.current.contains(e.target)) setShowReportPicker(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showReportPicker])

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

  // Start guided tour after first PDF upload (only once per browser)
  // ?tour param forces it on for screenshots / demos
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('tour')) {
      setTimeout(() => { setActiveTab('dashboard'); setTourStep(0) }, 400)
      return
    }
    const prev = prevTxLenRef.current
    prevTxLenRef.current = transactions.length
    if (prev === 0 && transactions.length > 0 && !localStorage.getItem('er_tour_done')) {
      setTimeout(() => {
        setActiveTab('dashboard')
        setTourStep(0)
      }, 800)
    }
  }, [transactions.length])

  // Load from cloud when user logs in (web only)
  useEffect(() => {
    if (window.electronAPI || !user?.id) return
    // If a different user is logging in on the same device, wipe the previous user's
    // local data first so it can't bleed into the new session or get pushed to their cloud.
    if (prevUserIdRef.current && prevUserIdRef.current !== user.id) {
      setTransactions([])
      setBudgets({})
      setCustomCategories({})
      clearAllUserData()
    }
    prevUserIdRef.current = user.id
    // Reset gate so a save from the previous session can't fire before this load completes
    cloudLoadedRef.current = false
    let cancelled = false
    const txKey = t => t.id || `${t.date}|${t.amount}|${t.description}|${t.source}`
    cloudLoad(user.id).then(cloud => {
      if (cancelled) return
      const localBudg = loadBudgets()
      const localCats = loadCustomCategories()

      if (cloud?.transactions?.length > 0) {
        // Merge against live state (not a stale localStorage snapshot) to avoid losing in-flight edits
        setTransactions(prev => {
          const base = prev.length > 0 ? prev : (loadData().transactions ?? [])
          const cloudValid = cloud.transactions.filter(t => t && t.date && t.amount > 0)
          // Count-based merge: keep all cloud copies, then add local copies that exceed the cloud count.
          // A Set-based approach would lose legitimate duplicate transactions (same merchant/date/amount).
          const cloudCounts = new Map()
          for (const t of cloudValid) {
            const k = txKey(t)
            cloudCounts.set(k, (cloudCounts.get(k) ?? 0) + 1)
          }
          const localSeen = new Map()
          const localOnly = base.filter(t => {
            const k = txKey(t)
            const n = (localSeen.get(k) ?? 0) + 1
            localSeen.set(k, n)
            return n > (cloudCounts.get(k) ?? 0)
          })
          const merged = recategorizeAll([...cloudValid, ...localOnly])
          if (localOnly.length > 0) {
            cloudSave(user.id, { transactions: merged, budgets: localBudg, customCategories: localCats }).catch(console.warn)
          }
          saveCategorizerVersion(CATEGORIZER_VERSION)
          return merged
        })
        setToast(`📥 Movimientos cargados desde la nube`)
      } else {
        // First login with local data — push to cloud so it's not lost
        const localTxs = loadData().transactions ?? []
        if (localTxs.length > 0) {
          cloudSave(user.id, { transactions: localTxs, budgets: localBudg, customCategories: localCats }).catch(console.warn)
        }
      }

      if (cloud?.budgets && Object.keys(cloud.budgets).length > 0) setBudgets(cloud.budgets)
      if (cloud?.custom_categories && Object.keys(cloud.custom_categories).length > 0) {
        setCustomCategories(cloud.custom_categories)
      }
    }).then(() => {
      if (!cancelled) cloudLoadedRef.current = 'ok'
    }).catch(e => {
      console.warn('cloud load error:', e)
      // Don't set cloudLoadedRef so the save effect won't run after a failed load
    })
    return () => { cancelled = true }
  }, [user?.id])

  // Save to localStorage always; sync to cloud (debounced 2s) when logged in
  useEffect(() => {
    saveData({ transactions })
  }, [transactions])

  useEffect(() => {
    if (window.electronAPI || !user?.id || cloudLoadedRef.current !== 'ok') return
    const id = user.id
    const data = { transactions, budgets, customCategories }
    const t = setTimeout(async () => {
      try {
        await cloudSave(id, data)
        cloudSaveFailCount.current = 0 // reset on success
      } catch (e) {
        cloudSaveFailCount.current += 1
        console.warn('cloud auto-save failed:', e?.message ?? e)
        // Silent fail — data is always safe in localStorage.
        // A persistent failure indicator could be added to the header (non-blocking).
      }
    }, 2000)
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

  const handleCardNamesChange = useCallback((names) => {
    setCardNames(names)
    saveCardNames(names)
  }, [])

  const handleDeleteSource = useCallback((source) => {
    setTransactions(prev => {
      const next = prev.filter(t => t.source !== source)
      if (user?.id && !window.electronAPI) {
        cloudSave(user.id, { transactions: next, budgets, customCategories }).catch(console.warn)
      }
      return next
    })
    // Limpiar el alias de esa tarjeta
    setCardNames(prev => {
      if (!prev[source]) return prev
      const next = { ...prev }; delete next[source]; saveCardNames(next); return next
    })
    setToast(`🗑️ Tarjeta "${cardNames[source] || source}" eliminada`)
  }, [user, budgets, customCategories, cardNames, setToast])

  const handleDeleteFile = useCallback((fileName) => {
    setTransactions(prev => {
      const next = prev.filter(t => t.fileName !== fileName)
      if (user?.id && !window.electronAPI) {
        cloudSave(user.id, { transactions: next, budgets, customCategories }).catch(console.warn)
      }
      return next
    })
    setToast(`🗑️ Resumen "${fileName}" eliminado`)
  }, [user, budgets, customCategories, setToast])

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
        const check = await webTrackPDF()
        if (!check.allowed && check.expired) {
          setToast(`❌ Tu período de prueba expiró. Suscribite para continuar.`)
          continue
        }
      }

      // Detect cloud-picked files that haven't fully downloaded yet (common on Android)
      if (file.size === 0) {
        setToast(`❌ "${file.name}" está vacío (0 bytes). Si lo seleccionaste desde Google Drive u otra nube, descargalo primero al dispositivo e intentá de nuevo.`)
        continue
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
            trackEvent('pdf_uploaded', { bank: result.bank, transactions: newOnes.length, ocr: !!result.ocr })
            return [...prev, ...newOnes]
          })
        }
      } catch (e) {
        setOcrProgress(null)
        console.error('parsePDF error:', e)
        const rawMsg = e?.message || String(e)
        const friendlyMsg = translatePdfError(rawMsg)
        setToast(`❌ Error en "${file.name}": ${friendlyMsg}`)
      }
      setLoading(l => l.filter(n => n !== file.name))
    }
  }, [user, webTrackPDF])

  const handleClearAll = () => {
    if (confirm('¿Borrar todos los movimientos cargados?')) {
      setTransactions([])
      clearData()
      if (user?.id && !window.electronAPI) {
        cloudSave(user.id, { transactions: [], budgets, customCategories }).catch(console.warn)
      }
      setToast('🗑️ Datos eliminados')
    }
  }

  const exportCSV = () => {
    const sanitizeCell = v => {
      const s = String(v ?? '')
      // Prefix formula-starting chars to prevent CSV injection in Excel/Sheets
      return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    }
    const csvCell = v => `"${sanitizeCell(v).replace(/"/g, '""')}"`
    const data = filteredForReport ?? transactions
    const rows = [
      ['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Importe', 'Origen'],
      ...data.map(t => [
        csvCell(t.date),
        csvCell(t.description),
        csvCell(t.category),
        csvCell(t.type || 'debit'),
        t.type === 'credit' ? t.amount : -t.amount,
        csvCell(cardNames[t.source] || t.source),
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
    if (sharing) return
    setSharing(true)
    const txs = filteredForReport ?? transactions
    const total = txs.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0)
    const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    const months = [...new Set(txs.map(t => t.date.slice(0, 7)))].sort()
    const period = months.length === 1 ? months[0] : `${months[0]} al ${months[months.length - 1]}`
    const text = `📊 *Resumen EasyResumen* — ${period}\n💳 Total gastos: ${fmt(total)}\n📦 ${txs.length} movimientos\n\nGenerado en www.easyresumen.com.ar`

    if (navigator.share) {
      // Try Web Share API level 2 — share PDF + Excel files
      try {
        setToast('⏳ Generando archivos...')
        setActiveTab('dashboard')
        // Wait two animation frames so charts have time to mount and paint
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        const [pdfResult, xlsxResult] = await Promise.all([
          generateReport({ transactions: txs, chartDonutRef, chartBarRef, asBlob: true, cardNames }),
          Promise.resolve(exportXLSX(txs, { asBlob: true, cardNames })),
        ])
        const files = [
          new File([pdfResult.blob], pdfResult.fileName, { type: 'application/pdf' }),
          new File([xlsxResult.blob], xlsxResult.fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        ]
        if (navigator.canShare?.({ files })) {
          await navigator.share({ title: 'Mi resumen — EasyResumen', text, files })
          setToast('✅ Archivos compartidos')
          setSharing(false)
          return
        }
      } catch (err) {
        if (err.name === 'AbortError') { setSharing(false); return }
        // File share not supported — fall through to text-only
      }
      // Fallback: share text only (desktop browsers / no file support)
      try {
        await navigator.share({ title: 'Mi resumen — EasyResumen', text })
      } catch (err) {
        if (err.name === 'AbortError') { setSharing(false); return }
        navigator.clipboard?.writeText(text)
        setToast('✅ Resumen copiado al portapapeles')
      }
    } else {
      navigator.clipboard.writeText(text)
      setToast('✅ Resumen copiado al portapapeles')
    }
    setSharing(false)
  }, [sharing, transactions, filteredForReport, chartDonutRef, chartBarRef, cardNames])

  const handleExportXLSX = () => {
    try {
      const data = filteredForReport ?? transactions
      exportXLSX(data, { cardNames })
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

  const handleGenerateReport = async (source = null) => {
    if (generating) return
    setShowReportPicker(false)
    setActiveTab('dashboard')
    setGenerating(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const reportTxs = source
        ? transactions.filter(t => t.source === source)
        : (filteredForReport ?? transactions)
      const fileName = await generateReport({ transactions: reportTxs, chartDonutRef, chartBarRef, cardNames })
      const label = source ? `"${source}"` : 'Informe'
      setToast(`📄 ${label} guardado: ${fileName}`)
    } catch (e) {
      setToast(`❌ Error generando informe: ${e.message}`)
    }
    setGenerating(false)
  }

  const handleAddTransaction = (tx) => {
    setTransactions(prev => [...prev, tx])
    setToast('✅ Movimiento agregado')
  }

  const findings = useMemo(() => detectUnnecessary(transactions), [transactions])
  const hasData  = transactions.length > 0

  const tabs = useMemo(() => {
    const hasInstallments = transactions.some(t => t.installment)
    const txCount = (filteredForReport && filteredForReport.length < transactions.length)
      ? filteredForReport.length : transactions.length
    return [
      { id: 'dashboard',   label: 'Resumen' },
      { id: 'movimientos', label: 'Movimientos', count: txCount },
      { id: 'presupuesto', label: 'Presupuesto' },
      ...(hasInstallments ? [{ id: 'cuotas', label: 'Cuotas' }] : []),
      { id: 'prestamos',   label: 'Préstamos' },
      { id: 'balance',     label: 'Balance' },
      { id: 'insights',    label: 'Alertas',
        count: (() => {
          const base = findings.filter(f => f.type !== 'lastInstallment').length
          const byCategory = {}
          for (const t of transactions) {
            if (t.type === 'credit') continue
            byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
          }
          const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
          const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]
          const hasConcentration = topCat && total > 0 && topCat[1] / total > 0.35
          return base + (hasConcentration ? 1 : 0)
        })(),
        countGreen: findings.filter(f => f.type === 'lastInstallment').length },
    ]
  }, [transactions, filteredForReport, findings])

  const refreshLicense = () => {
    if (window.electronAPI) {
      window.electronAPI.getLicenseStatus().then(setElectronLicense)
    } else {
      refreshTrial()
    }
  }

  // Web auth gate: show login/register when Supabase is configured and user is not logged in
  // user===undefined means still loading; null means no session
  if (isSupabaseConfigured && !window.electronAPI && (user === null || passwordRecovery)) {
    return <AuthGate />
  }

  // Trial expirado: early return — el dashboard no se monta detrás del gate,
  // así los datos no quedan accesibles quitando el overlay desde DevTools
  if (licenseStatus?.status === 'expired') {
    return (
      <ExpiredGate
        onActivated={refreshLicense}
        onExportCSV={hasData ? exportCSV : null}
        onSignOut={isSupabaseConfigured && !window.electronAPI && user ? signOut : null}
      />
    )
  }

  return (
    <div className="min-h-screen dark:bg-[#0f0f1a] dark:[background-image:none] relative overflow-x-hidden">

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
      {licenseStatus?.status === 'trial' && <TrialBanner daysLeft={licenseStatus.daysLeft} pdfCount={licenseStatus.pdfCount} onActivated={refreshLicense} />}
      {showSubPromo && <SubscribeModal user={user} onClose={dismissSubPromo} />}
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
        onReport={() => handleGenerateReport()}
        onReportSource={handleGenerateReport}
        sources={sources}
        cardNames={cardNames}
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
                <div ref={reportPickerRef} className="relative" data-tour="report-btn">
                  <button
                    onClick={() => sources.length > 1 ? setShowReportPicker(v => !v) : handleGenerateReport()}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-sm shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-60"
                  >
                    {generating ? <RefreshCw size={14} className="animate-spin" /> : <FileBarChart2 size={14} />}
                    {generating ? 'Generando…' : 'Informe PDF'}
                    {sources.length > 1 && !generating && (
                      <ChevronDown size={12} className={`transition-transform duration-200 ${showReportPicker ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {showReportPicker && sources.length > 1 && (
                    <div className="absolute top-full left-0 mt-1.5 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-hidden">
                      <button
                        onClick={() => handleGenerateReport()}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        <FileBarChart2 size={14} className="text-indigo-500 shrink-0" />
                        <span className="flex-1 text-left">Informe completo</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{transactions.length} mov.</span>
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-700">
                        {sources.map(src => {
                          const cnt = transactions.filter(t => t.source === src).length
                          return (
                            <button
                              key={src}
                              onClick={() => handleGenerateReport(src)}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                            >
                              <CreditCard size={13} className="text-slate-400 shrink-0" />
                              <span className="flex-1 text-left truncate">{cardNames[src] || src}</span>
                              <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{cnt}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportXLSX}
                  className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                >
                  <FileSpreadsheet size={14} />
                  Excel{filteredForReport && filteredForReport.length < transactions.length ? ` (${filteredForReport.length})` : ''}
                  {filteredForReport && filteredForReport.length < transactions.length && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400" />
                  )}
                </button>
                <button
                  onClick={exportCSV}
                  className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                >
                  <Download size={14} />
                  CSV{filteredForReport && filteredForReport.length < transactions.length ? ` (${filteredForReport.length})` : ''}
                  {filteredForReport && filteredForReport.length < transactions.length && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400" />
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
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 font-medium transition-colors"
                  aria-label="Borrar todos los movimientos"
                >
                  <Trash2 size={14} />
                  Borrar
                </button>
              </>
            )}
            <label className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer">
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
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {isSupabaseConfigured && !window.electronAPI && user && (
              <button
                onClick={signOut}
                aria-label={`Cerrar sesión (${user.email})`}
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
              aria-label="Agregar movimiento"
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

        {/* Processing indicator + skeleton */}
        {(loading.length > 0 || ocrProgress) && (
          <div className="space-y-3">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-4 py-3 flex items-center gap-3 text-indigo-700 dark:text-indigo-300 text-sm">
              <RefreshCw size={15} className="animate-spin shrink-0" />
              {ocrProgress ? (
                <div className="flex-1 min-w-0">
                  <span>
                    OCR página {ocrProgress.page}/{ocrProgress.total} de{' '}
                    <span className="font-medium">{ocrProgress.file}</span>
                  </span>
                  {ocrProgress.pct != null && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(ocrProgress.pct)}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span>Procesando: <span className="font-medium">{loading.join(', ')}</span>…</span>
              )}
            </div>
            {/* Skeleton rows while processing */}
            {!hasData && (
              <div className="space-y-2 animate-pulse">
                {[80, 60, 72, 50, 65].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded-full`} style={{ width: `${w}%` }} />
                      <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
                    </div>
                    <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasData && <StatsCards transactions={transactions} tabs={tabs} onTab={setActiveTab} cardNames={cardNames} onManage={openCardManager} />}

        {/* Tabs siempre visibles: Préstamos y Balance funcionan sin transacciones */}
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

        {activeTab === 'dashboard' && hasData && (
          <div className="grid lg:grid-cols-2 gap-5" data-tour="category-chart">
            <ErrorBoundary label="Error en gráfico de categorías">
              <CategoryChart ref={chartDonutRef} transactions={transactions} />
            </ErrorBoundary>
            <ErrorBoundary label="Error en comparación mensual">
              <MonthComparison ref={chartBarRef} transactions={transactions} />
            </ErrorBoundary>
          </div>
        )}

        {/* Always mounted to preserve page/sort state when switching tabs */}
        <div className={!hasData || activeTab !== 'movimientos' ? 'hidden' : ''}>
          <ErrorBoundary label="Error en la lista de movimientos">
            <TransactionList transactions={transactions} onUpdate={setTransactions} onFilteredChange={f => setFilteredForReport(f && f.length < transactions.length ? f : null)} customCategories={customCategories} cardNames={cardNames} />
          </ErrorBoundary>
        </div>

        {activeTab === 'presupuesto' && hasData && (
          <ErrorBoundary label="Error en presupuesto">
            <BudgetPanel
              transactions={transactions}
              budgets={budgets}
              onBudgetsChange={handleBudgetsChange}
              customCategories={customCategories}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'cuotas' && hasData && (
          <ErrorBoundary label="Error en cuotas">
            <InstallmentsPanel transactions={transactions} />
          </ErrorBoundary>
        )}

        {activeTab === 'prestamos' && (
          <ErrorBoundary label="Error en préstamos">
            <LoansPanel />
          </ErrorBoundary>
        )}

        {activeTab === 'balance' && (
          <ErrorBoundary label="Error en balance">
            <BalancePanel transactions={transactions} />
          </ErrorBoundary>
        )}

        {activeTab === 'insights' && hasData && (
          <div data-tour="insights-panel">
            <ErrorBoundary label="Error en insights">
              <InsightsPanel
                findings={findings}
                transactions={transactions}
              />
            </ErrorBoundary>
          </div>
        )}

        {!hasData && !loading.length && !['prestamos', 'balance'].includes(activeTab) && (
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

      {showCardManager && (
        <CardManagerModal
          transactions={transactions}
          cardNames={cardNames}
          onCardNamesChange={handleCardNamesChange}
          onDeleteSource={handleDeleteSource}
          onDeleteFile={handleDeleteFile}
          onClose={() => setShowCardManager(false)}
        />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <Toast key={t.id} msg={t.msg} onDone={() => dismissToast(t.id)} />
          ))}
        </div>
      )}

      {tourStep !== null && (
        <TourGuide
          step={tourStep}
          totalSteps={5}
          onNext={handleTourNext}
          onSkip={handleTourSkip}
          darkMode={darkMode}
        />
      )}
    </div>
  )
}
