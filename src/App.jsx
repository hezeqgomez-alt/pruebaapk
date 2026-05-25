import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Trash2, Download, RefreshCw } from 'lucide-react'
import UploadZone from './components/UploadZone'
import StatsCards from './components/StatsCards'
import CategoryChart from './components/CategoryChart'
import MonthComparison from './components/MonthComparison'
import InsightsPanel from './components/InsightsPanel'
import TransactionList from './components/TransactionList'
import { parsePDF } from './utils/pdfParser'
import { detectUnnecessary } from './utils/categorizer'
import { loadData, saveData, clearData } from './utils/storage'

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg text-sm z-50">
      {msg}
    </div>
  )
}

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState([])
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

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
        if (result.transactions.length === 0) {
          setToast(`⚠️ No se encontraron movimientos en "${file.name}" (banco: ${result.bank})`)
        } else {
          setTransactions(prev => {
            const existingKeys = new Set(prev.map(t => t.date + t.amount + t.description.slice(0,15)))
            const newOnes = result.transactions.filter(t => !existingKeys.has(t.date + t.amount + t.description.slice(0,15)))
            setToast(`✅ ${newOnes.length} movimientos importados de ${result.bank} (${file.name})`)
            return [...prev, ...newOnes]
          })
        }
      } catch (e) {
        setToast(`❌ Error procesando "${file.name}": ${e.message}`)
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
      ['Fecha', 'Descripcion', 'Categoria', 'Importe', 'Origen'],
      ...transactions.map(t => [t.date, `"${t.description.replace(/"/g, "'")}"`, t.category, t.amount, `"${t.source}"`]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'gastos_tarjeta.csv'
    a.click()
    setToast('📥 CSV exportado')
  }

  const findings = detectUnnecessary(transactions)
  const hasData = transactions.length > 0

  const tabs = [
    { id: 'dashboard', label: 'Resumen' },
    { id: 'movimientos', label: `Movimientos (${transactions.length})` },
    { id: 'insights', label: `Alertas${findings.length > 0 ? ` (${findings.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <CreditCard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">GastoTracker</h1>
              <p className="text-xs text-slate-500">Analizador de resúmenes de tarjeta</p>
            </div>
          </div>
          {hasData && (
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Download size={14} /> Exportar CSV
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              >
                <Trash2 size={14} /> Borrar todo
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <UploadZone onFiles={handleFiles} />

        {loading.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-700 text-sm">
            <RefreshCw size={16} className="animate-spin shrink-0" />
            <span>Procesando: {loading.join(', ')}…</span>
          </div>
        )}

        {hasData && (
          <>
            <StatsCards transactions={transactions} />

            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <CategoryChart transactions={transactions} />
                <MonthComparison transactions={transactions} />
              </div>
            )}

            {activeTab === 'movimientos' && (
              <TransactionList
                transactions={transactions}
                onUpdate={setTransactions}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsPanel findings={findings} transactions={transactions} />
            )}
          </>
        )}

        {!hasData && (
          <p className="text-center text-slate-400 text-sm py-8">
            Cargá un PDF de resumen de tarjeta para comenzar
          </p>
        )}
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
