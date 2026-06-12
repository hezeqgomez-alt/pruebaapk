import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from './categorizer'

function safeDate(d) {
  try { return format(parseISO(d), 'dd/MM/yyyy') } catch { return d }
}

function fmtNum(n) { return Math.round(n * 100) / 100 }

// Prevent formula injection in spreadsheet cells
function sanitizeCell(v) {
  if (typeof v !== 'string') return v
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v
}

export function exportXLSX(transactions, { asBlob = false, cardNames = {} } = {}) {
  const wb = XLSX.utils.book_new()
  const dn = s => cardNames[s] || s

  const debits  = transactions.filter(t => t.type !== 'credit')
  const credits = transactions.filter(t => t.type === 'credit')
  const totalD  = debits.reduce((s, t) => s + t.amount, 0)
  const totalC  = credits.reduce((s, t) => s + t.amount, 0)

  // ── Sheet 1: Resumen ──────────────────────────────────────────────────────
  const resumen = [
    ['EasyResumen — Informe de gastos'],
    ['Generado:', format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })],
    [],
    ['Indicador', 'Valor'],
    ['Total gastos', fmtNum(totalD)],
    ['Total créditos / devoluciones', fmtNum(totalC)],
    ['Neto', fmtNum(totalD - totalC)],
    ['Cantidad de movimientos', debits.length + credits.length],
    ['Tarjetas cargadas', [...new Set(transactions.map(t => dn(t.source)))].join(', ')],
  ]
  const wsRes = XLSX.utils.aoa_to_sheet(resumen)
  wsRes['!cols'] = [{ wch: 35 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')

  // ── Sheet 2: Por categoría ────────────────────────────────────────────────
  const byCategory = {}
  const catCounts  = {}
  for (const t of debits) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
    catCounts[t.category]  = (catCounts[t.category]  || 0) + 1
  }
  const catRows = [['Categoría', 'Total ($)', '% del total', 'Movimientos']]
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, amt]) => {
      catRows.push([
        sanitizeCell(CATEGORIES[cat]?.label || cat),
        fmtNum(amt),
        totalD > 0 ? fmtNum((amt / totalD) * 100) : 0,
        catCounts[cat] || 0,
      ])
    })
  catRows.push(['TOTAL', fmtNum(totalD), 100, debits.length])
  const wsCat = XLSX.utils.aoa_to_sheet(catRows)
  wsCat['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por categoría')

  // ── Sheet 3: Por mes ──────────────────────────────────────────────────────
  const byMonth   = {}
  const moCounts  = {}
  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    byMonth[mo]  = (byMonth[mo]  || 0) + t.amount
    moCounts[mo] = (moCounts[mo] || 0) + 1
  }
  const moRows = [['Mes', 'Total ($)', 'Movimientos', 'Variación %']]
  const moSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  moSorted.forEach(([mo, amt], i) => {
    const prev = moSorted[i - 1]
    const variation = prev ? fmtNum(((amt - prev[1]) / prev[1]) * 100) : '—'
    moRows.push([
      format(parseISO(mo + '-01'), 'MMMM yyyy', { locale: es }),
      fmtNum(amt),
      moCounts[mo] || 0,
      variation,
    ])
  })
  const wsMo = XLSX.utils.aoa_to_sheet(moRows)
  wsMo['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsMo, 'Por mes')

  // ── Sheet 4: Movimientos ──────────────────────────────────────────────────
  const txHead = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe ($)', 'Moneda', 'Importe orig.', 'Cuota', 'Nota', 'Origen']
  const txRows = [txHead, ...[...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => [
      safeDate(t.date),
      sanitizeCell(t.description),
      sanitizeCell(CATEGORIES[t.category]?.label || t.category),
      t.type === 'credit' ? 'Crédito' : 'Débito',
      t.type === 'credit' ? fmtNum(t.amount) : fmtNum(-t.amount),
      t.originalCurrency || '',
      t.originalAmount ? fmtNum(t.originalAmount) : '',
      t.installment ? `${t.installment.current}/${t.installment.total}` : '',
      sanitizeCell(t.note || ''),
      sanitizeCell(dn(t.source)),
    ])]
  const wsTx = XLSX.utils.aoa_to_sheet(txRows)
  wsTx['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsTx, 'Movimientos')

  // ── Sheet 5: Cuotas activas ───────────────────────────────────────────────
  // Composite key matches InstallmentsPanel.buildGroups to avoid collapsing
  // two identical purchases into one row.
  const instBuckets = new Map()
  for (const t of transactions.filter(t => t.installment && t.type !== 'credit')) {
    const key = [
      t.description.toLowerCase().trim().slice(0, 35),
      t.source,
      t.installment.total,
      Math.round(t.amount),
    ].join('|')
    if (!instBuckets.has(key)) instBuckets.set(key, [])
    instBuckets.get(key).push(t)
  }
  // Slot-based split for truly identical purchases (same composite key)
  const instGroups = []
  for (const txs of instBuckets.values()) {
    const total = txs[0].installment.total
    if (txs.length <= total) {
      instGroups.push(txs)
    } else {
      const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
      const slots = []
      for (const t of sorted) {
        const idx = slots.findIndex(s => !s.some(st => st.installment.current === t.installment.current))
        if (idx >= 0) slots[idx].push(t)
        else slots.push([t])
      }
      instGroups.push(...slots)
    }
  }
  const instRows = [['Descripción', 'Cuota', 'Total cuotas', 'Importe/cuota ($)', 'Total ($)', 'Pagado ($)', 'Restante ($)']]
  for (const txs of instGroups) {
    const t = txs.reduce((a, b) => (b.installment.current > a.installment.current ? b : a))
    const perCuota = t.amount
    const total = t.installment.total
    const current = t.installment.current
    instRows.push([
      sanitizeCell(t.description),
      `${current}/${total}`,
      total,
      fmtNum(perCuota),
      fmtNum(perCuota * total),
      fmtNum(perCuota * current),
      fmtNum(perCuota * (total - current)),
    ])
  }
  if (instRows.length > 1) {
    const wsInst = XLSX.utils.aoa_to_sheet(instRows)
    wsInst['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsInst, 'Cuotas activas')
  }

  const fileName = `easyresumen_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  if (asBlob) {
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return {
      blob: new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      fileName,
    }
  }
  XLSX.writeFile(wb, fileName)
  return fileName
}
