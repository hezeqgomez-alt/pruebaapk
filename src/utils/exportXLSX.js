import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from './categorizer'

function safeDate(d) {
  try { return format(parseISO(d), 'dd/MM/yyyy') } catch { return d }
}

function fmtNum(n) { return Math.round(n * 100) / 100 }

export function exportXLSX(transactions) {
  const wb = XLSX.utils.book_new()

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
    ['Tarjetas cargadas', [...new Set(transactions.map(t => t.source))].join(', ')],
  ]
  const wsRes = XLSX.utils.aoa_to_sheet(resumen)
  wsRes['!cols'] = [{ wch: 35 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')

  // ── Sheet 2: Por categoría ────────────────────────────────────────────────
  const byCategory = {}
  for (const t of debits) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  const catRows = [['Categoría', 'Total ($)', '% del total', 'Movimientos']]
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, amt]) => {
      catRows.push([
        CATEGORIES[cat]?.label || cat,
        fmtNum(amt),
        fmtNum((amt / totalD) * 100),
        debits.filter(t => t.category === cat).length,
      ])
    })
  catRows.push(['TOTAL', fmtNum(totalD), 100, debits.length])
  const wsCat = XLSX.utils.aoa_to_sheet(catRows)
  wsCat['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por categoría')

  // ── Sheet 3: Por mes ──────────────────────────────────────────────────────
  const byMonth = {}
  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    byMonth[mo] = (byMonth[mo] || 0) + t.amount
  }
  const moRows = [['Mes', 'Total ($)', 'Movimientos', 'Variación %']]
  const moSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  moSorted.forEach(([mo, amt], i) => {
    const prev = moSorted[i - 1]
    const variation = prev ? fmtNum(((amt - prev[1]) / prev[1]) * 100) : '—'
    moRows.push([
      format(parseISO(mo + '-01'), 'MMMM yyyy', { locale: es }),
      fmtNum(amt),
      debits.filter(t => t.date.startsWith(mo)).length,
      variation,
    ])
  })
  const wsMo = XLSX.utils.aoa_to_sheet(moRows)
  wsMo['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsMo, 'Por mes')

  // ── Sheet 4: Movimientos ──────────────────────────────────────────────────
  const txHead = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe ($)', 'Cuota', 'Nota', 'Origen']
  const txRows = [txHead, ...[...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => [
      safeDate(t.date),
      t.description,
      CATEGORIES[t.category]?.label || t.category,
      t.type === 'credit' ? 'Crédito' : 'Débito',
      t.type === 'credit' ? fmtNum(t.amount) : fmtNum(-t.amount),
      t.installment ? `${t.installment.current}/${t.installment.total}` : '',
      t.note || '',
      t.source,
    ])]
  const wsTx = XLSX.utils.aoa_to_sheet(txRows)
  wsTx['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsTx, 'Movimientos')

  // ── Sheet 5: Cuotas activas ───────────────────────────────────────────────
  const instMap = {}
  for (const t of transactions.filter(t => t.installment)) {
    const key = t.description.slice(0, 30)
    if (!instMap[key]) instMap[key] = []
    instMap[key].push(t)
  }
  const instRows = [['Descripción', 'Cuota', 'Total cuotas', 'Importe/cuota ($)', 'Total ($)', 'Pagado ($)', 'Restante ($)']]
  for (const [, txs] of Object.entries(instMap)) {
    const t = txs.reduce((a, b) => (b.installment.current > a.installment.current ? b : a))
    const perCuota = t.amount
    const total = t.installment.total
    const current = t.installment.current
    instRows.push([
      t.description,
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
  XLSX.writeFile(wb, fileName)
  return fileName
}
