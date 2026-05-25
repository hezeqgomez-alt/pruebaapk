import { useState, useEffect, useCallback, useRef } from 'react'
import { ReceiptText, Trash2, Download, RefreshCw, FileBarChart2, X, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import UploadZone from './components/UploadZone'
import StatsCards from './components/StatsCards'
import CategoryChart from './components/CategoryChart'
import MonthComparison from './components/MonthComparison'
import InsightsPanel from './components/InsightsPanel'
import TransactionList from './components/TransactionList'
import { parsePDF } from './utils/pdfParser'
import { detectUnnecessary } from './utils/categorizer'
import { loadData, saveData, clearData } from './utils/storage'
import { generateReport } from './utils/reportGenerator'

function Toast({ msg, onDone }) {
  const isError   = msg.startsWith('❌')
  const isWarning = msg.startsWith('⚠️')
  const isSuccess = msg.startsWith('✅') || msg.startsWith('📄') || msg.startsWith('📥') || msg.startsWith('🗑️')

  const base = 'fixed bottom-6 right-6 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm z-50 max-w-sm border backdrop-blur-sm'
  const style = isError
    ? `${base} bg-red-50 border-red-200 text-red-800`
    : isWarning
    ? `${base} bg-amber-50 border-amber-200 text-amber-800`
    : `${base} bg-white border-slate-200 text-slate-800`

  const Icon = isError ? AlertTriangle : isWarning ? AlertTriangle : isSuccess ? CheckCircle : Info
  const iconColor = isError ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-indigo-500'

  useEffect(() => {
    const t = setTimeout(onDone, 3800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={style}>
      <Icon size={16} className={`${iconColor} shrink-0 mt-0.5`} />
      <span className="flex-1 leading-snug">{msg.replace(/^[✅❌⚠️📄📥🗑️ℹ️]\s*/, '')}</span>
      <button onClick={onDone} className="opacity-40 hover:opacity-70 transition-opacity ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState([])
  const [toast, setToast]               = useState(null)
  const [activeTab, setActiveTab]       = useState('dashboard')
  const [generating, setGenerating]     = useState(false)

  const chartDonutRef = useRef(null)
  const chartBarRef   = useRef(null)

  useEffect(() => {
    const saved = loadData()
    if (saved.transactions?.length > 0) setTransactions(saved.transactions)
  }, [])

  useEffect(() => {
    saveData({ transactions })
  }, [transactions])

  const handleFiles = useCallback(async (files) => {
    for (const file of files) {
      setLoading(l => [...l, file.name])
      try {
        const result = await parsePDF(file)
        if (result.scanned) {
          setToast(`⚠️ "${file.name}" es un PDF escaneado (imagen). No se puede extraer texto sin OCR.`)
        } else if (result.transactions.length === 0) {
          setToast(`⚠️ Sin movimientos en "${file.name}" (banco: ${result.bank})`)
        } else {
          setTransactions(prev => {
            const existingKeys = new Set(prev.map(t => t.date + t.amount + t.description.slice(0, 15)))
            const newOnes = result.transactions.filter(
              t => !existingKeys.has(t.date + t.amount + t.description.slice(0, 15))
            )
            const debCnt = newOnes.filter(t => t.type !== 'credit').length
            const creCnt = newOnes.filter(t => t.type === 'credit').length
            const detail = creCnt > 0 ? ` · ${debCnt} débitos + ${creCnt} créditos` : ''
            setToast(`✅ ${newOnes.length} movimientos de ${result.bank}${detail}`)
            return [...prev, ...newOnes]
          })
        }
      } catch (e) {
        console.error('parsePDF error:', e)
        setToast(`❌ Error en "${file.name}": ${e?.message || String(e)}`)
      }
      setLoading(l => l.filter(n => n !== file.name))
    }
  }, [])

  const handleClearAll = () => {
    if (confirm('¿Borrar todos los movimientos cargados?')) {
      setTransactions([])
      clearData()
      setToast('🗑️ Datos eliminados')
    }
  }

  const exportCSV = () => {
    const rows = [
      ['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Importe', 'Origen'],
      ...transactions.map(t => [
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
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'easyresumen_gastos.csv'
    a.click()
    setToast('📥 CSV exportado')
  }

  const handleGenerateReport = async () => {
    if (generating) return
    setActiveTab('dashboard')
    setGenerating(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const fileName = await generateReport({ transactions, chartDonutRef, chartBarRef })
      setToast(`📄 Informe guardado: ${fileName}`)
    } catch (e) {
      setToast(`❌ Error generando informe: ${e.message}`)
    }
    setGenerating(false)
  }

  const findings = detectUnnecessary(transactions)
  const hasData  = transactions.length > 0

  const tabs = [
    { id: 'dashboard',   label: 'Resumen' },
    { id: 'movimientos', label: 'Movimientos', count: transactions.length },
    { id: 'insights',    label: 'Alertas', count: findings.length || null },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">

      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <ReceiptText size={18} className="text-white" />
            </div>
            <div className="leading-none">
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                EasyResumen
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">100% local · sin IA</p>
            </div>
          </div>

          {/* Actions */}
          {hasData && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-sm shadow-indigo-200 transition-all disabled:opacity-60"
              >
                {generating
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <FileBarChart2 size={14} />}
                <span className="hidden sm:inline">{generating ? 'Generando…' : 'Informe PDF'}</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-medium transition-colors"
              >
                <Download size={14} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-red-200 rounded-xl hover:bg-red-50 text-red-500 font-medium transition-colors"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Borrar</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <UploadZone onFiles={handleFiles} compact={hasData} />

        {loading.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-indigo-700 text-sm">
            <RefreshCw size={15} className="animate-spin shrink-0" />
            <span>Procesando: <span className="font-medium">{loading.join(', ')}</span>…</span>
          </div>
        )}

        {hasData && (
          <>
            <StatsCards transactions={transactions} />

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100/80 rounded-2xl p-1 w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab.count}
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

            {activeTab === 'movimientos' && (
              <TransactionList transactions={transactions} onUpdate={setTransactions} />
            )}

            {activeTab === 'insights' && (
              <InsightsPanel findings={findings} transactions={transactions} />
            )}
          </>
        )}

        {!hasData && !loading.length && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
              <ReceiptText size={28} className="text-indigo-400" />
            </div>
            <p className="text-slate-500 font-medium">Cargá un PDF de resumen para comenzar</p>
            <p className="text-slate-400 text-sm mt-1">Compatible con CABAL, VISA, Mastercard y más</p>
          </div>
        )}
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
