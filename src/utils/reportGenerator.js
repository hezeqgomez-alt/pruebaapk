import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from './categorizer'

// Palette — indigo/violet brand
const INDIGO   = [79, 70, 229]
const VIOLET   = [124, 58, 237]
const INDIGO_L = [238, 242, 255]  // indigo-100
const DARK     = [15, 23, 42]     // slate-900
const GRAY     = [100, 116, 139]  // slate-500
const MID      = [71, 85, 105]    // slate-600
const GREEN    = [5, 150, 105]
const RED      = [220, 38, 38]
const WHITE    = [255, 255, 255]
const LIGHT    = [248, 250, 252]  // slate-50

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

// jsPDF doesn't support emoji — use plain text label only
function catLabel(cat) {
  return CATEGORIES[cat]?.label || cat
}

function addPageChrome(doc, pageNum, totalPages) {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  // Top stripe — gradient simulation with two overlapping rects
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, pw * 0.6, 11, 'F')
  doc.setFillColor(...VIOLET)
  doc.rect(pw * 0.4, 0, pw * 0.6, 11, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('EasyResumen', 10, 7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Analizador de resúmenes de tarjeta', 38, 7.5)
  doc.text(`Pág. ${pageNum} / ${totalPages}`, pw - 10, 7.5, { align: 'right' })

  // Bottom footer
  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text('EasyResumen · procesamiento 100% local, sin internet ni IA · easyresumen.app', pw / 2, ph - 5, { align: 'center' })

  doc.setTextColor(...DARK)
}

function sectionTitle(doc, text, y, accent = INDIGO) {
  const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(...accent)
  doc.rect(14, y - 4, 3, 6, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text(text, 20, y)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(20, y + 1.5, pw - 14, y + 1.5)
  doc.setTextColor(...DARK)
  return y + 9
}

function kpiCard(doc, x, y, w, h, label, value, sub, accentRgb) {
  // Card background
  doc.setFillColor(...LIGHT)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F')
  // Top accent bar
  doc.setFillColor(...accentRgb)
  doc.roundedRect(x, y, w, 3, 2.5, 2.5, 'F')
  doc.rect(x, y + 1, w, 2, 'F')  // fill bottom corners of top bar

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(label.toUpperCase(), x + w / 2, y + 9, { align: 'center' })

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accentRgb)
  doc.text(String(value), x + w / 2, y + 17, { align: 'center' })

  if (sub) {
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(String(sub), x + w / 2, y + 23, { align: 'center' })
  }
  doc.setTextColor(...DARK)
}

export async function generateReport({ transactions, chartDonutRef, chartBarRef }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()

  const debits  = transactions.filter(t => t.type !== 'credit')
  const credits = transactions.filter(t => t.type === 'credit')
  const totalDebits  = debits.reduce((s, t) => s + t.amount, 0)
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0)
  const net = totalDebits - totalCredits

  // By category
  const byCategory = {}
  for (const t of debits) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  const catSorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a)

  // By month
  const byMonth = {}
  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    byMonth[mo] = (byMonth[mo] || 0) + t.amount
  }
  const monthSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))

  // Top merchants
  const byMerchant = {}
  for (const t of debits) byMerchant[t.description] = (byMerchant[t.description] || 0) + t.amount
  const topMerchants = Object.entries(byMerchant).sort(([, a], [, b]) => b - a).slice(0, 10)

  const sources = [...new Set(transactions.map(t => t.source))]

  // ──────────────────────────────────────────────────────────────
  // PAGE 1 — Cover + executive summary
  // ──────────────────────────────────────────────────────────────
  // Page numbers are added retroactively after all content is rendered
  addPageChrome(doc, 1, '…')

  // Hero band
  doc.setFillColor(...INDIGO)
  doc.rect(0, 13, pw * 0.55, 46, 'F')
  doc.setFillColor(...VIOLET)
  doc.rect(pw * 0.45, 13, pw * 0.55, 46, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Informe de Gastos', 14, 31)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Resumen consolidado de tarjetas', 14, 39)
  doc.setFontSize(8)
  doc.setTextColor(199, 210, 254)  // indigo-200
  doc.text(`Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, 14, 47)
  doc.setTextColor(...DARK)

  // KPI cards
  const cardW = (pw - 28 - 6) / 4
  const kpis = [
    { label: 'Total gastos',     value: fmt(totalDebits),  sub: `${debits.length} movimientos`, color: INDIGO },
    { label: 'Créditos / devol.', value: fmt(totalCredits), sub: credits.length > 0 ? `${credits.length} créditos` : '—', color: [...GREEN] },
    { label: 'Neto',             value: fmt(net),           sub: null, color: net > totalDebits * 0.9 ? [...RED] : [...MID] },
    { label: 'Tarjetas',         value: sources.length,     sub: sources.slice(0, 2).join(', '), color: VIOLET },
  ]
  kpis.forEach((c, i) => {
    kpiCard(doc, 14 + i * (cardW + 2), 65, cardW, 27, c.label, c.value, c.sub, c.color)
  })

  // Sources list
  let y = 101
  y = sectionTitle(doc, 'Resúmenes incluidos', y)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  sources.forEach((src, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const lx = 14 + col * (pw / 2 - 14)
    doc.setTextColor(...INDIGO)
    doc.text('•', lx, y + row * 6)
    doc.setTextColor(...MID)
    doc.text(src, lx + 4, y + row * 6)
  })
  y += Math.ceil(sources.length / 2) * 6 + 4
  doc.setTextColor(...DARK)

  // Period
  if (monthSorted.length > 0) {
    const first = format(parseISO(monthSorted[0][0] + '-01'), 'MMMM yyyy', { locale: es })
    const last  = format(parseISO(monthSorted[monthSorted.length - 1][0] + '-01'), 'MMMM yyyy', { locale: es })
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    const period = first !== last ? `${first} → ${last}` : first
    doc.text(`Período analizado: ${period}`, 14, y)
    y += 9
    doc.setTextColor(...DARK)
  }

  // Category table
  y = sectionTitle(doc, 'Gastos por categoría', y)
  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Importe', '% del total', 'Mov.']],
    body: catSorted.map(([cat, amt]) => [
      catLabel(cat),
      fmt(amt),
      `${((amt / totalDebits) * 100).toFixed(1)}%`,
      debits.filter(t => t.category === cat).length,
    ]),
    foot: [['Total gastos', fmt(totalDebits), '100%', debits.length]],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, font: 'helvetica' },
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: INDIGO_L, textColor: DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const cat = catSorted[data.row.index]?.[0]
        if (cat) data.cell.styles.textColor = hexToRgb(CATEGORIES[cat]?.color || '#94a3b8')
      }
    },
  })

  // ──────────────────────────────────────────────────────────────
  // PAGE 2 — Charts
  // ──────────────────────────────────────────────────────────────
  doc.addPage()
  addPageChrome(doc, 2, '…')

  y = 18
  y = sectionTitle(doc, 'Distribución por categoría', y)

  if (chartDonutRef?.current) {
    try {
      const imgData = chartDonutRef.current.toBase64Image('image/png', 1)
      const chartSize = 78
      doc.addImage(imgData, 'PNG', pw / 2 - chartSize / 2, y, chartSize, chartSize)
      y += chartSize + 5
    } catch { y += 4 }
  }

  // Legend grid
  const cols = 2
  const colW = (pw - 28) / cols
  catSorted.slice(0, 12).forEach(([cat, amt], i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const lx = 14 + col * colW
    const ly = y + row * 7
    const rgb = hexToRgb(CATEGORIES[cat]?.color || '#94a3b8')
    doc.setFillColor(...rgb)
    doc.roundedRect(lx, ly - 3, 3, 3, 0.5, 0.5, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(
      `${catLabel(cat)}: ${fmt(amt)} (${((amt / totalDebits) * 100).toFixed(1)}%)`,
      lx + 5, ly
    )
  })
  y += Math.ceil(Math.min(catSorted.length, 12) / cols) * 7 + 8

  y = sectionTitle(doc, 'Comparativo mes a mes', y)

  if (chartBarRef?.current) {
    try {
      const imgData = chartBarRef.current.toBase64Image('image/png', 1)
      const imgH = 55
      doc.addImage(imgData, 'PNG', 14, y, pw - 28, imgH)
      y += imgH + 6
    } catch { y += 4 }
  }

  autoTable(doc, {
    startY: y,
    head: [['Mes', 'Total gastos', 'Movimientos', 'Variación']],
    body: monthSorted.map(([mo, amt], i) => {
      const prev = monthSorted[i - 1]
      const variation = prev ? ((amt - prev[1]) / prev[1] * 100).toFixed(1) + '%' : '—'
      return [
        format(parseISO(mo + '-01'), 'MMMM yyyy', { locale: es }),
        fmt(amt),
        debits.filter(t => t.date.startsWith(mo)).length,
        variation,
      ]
    }),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = data.cell.raw
        if (typeof raw === 'string' && raw !== '—') {
          const val = parseFloat(raw)
          if (!isNaN(val)) data.cell.styles.textColor = val > 10 ? RED : val < -10 ? GREEN : GRAY
        }
      }
    },
  })

  // ──────────────────────────────────────────────────────────────
  // PAGE 3 — Top merchants + transaction list
  // ──────────────────────────────────────────────────────────────
  doc.addPage()
  addPageChrome(doc, 3, '…')

  y = 18
  y = sectionTitle(doc, 'Top 10 comercios', y)
  autoTable(doc, {
    startY: y,
    head: [['#', 'Comercio / descripción', 'Total', 'Operaciones']],
    body: topMerchants.map(([desc, amt], i) => [
      i + 1,
      desc.length > 48 ? desc.slice(0, 48) + '…' : desc,
      fmt(amt),
      debits.filter(t => t.description === desc).length,
    ]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 22 },
    },
  })

  y = doc.lastAutoTable.finalY + 10
  y = sectionTitle(doc, 'Listado completo de movimientos', y)

  const txRows = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => [
      format(parseISO(t.date), 'dd/MM/yy'),
      t.description.length > 40 ? t.description.slice(0, 40) + '…' : t.description,
      catLabel(t.category),
      t.type === 'credit' ? `+${fmt(t.amount)}` : fmt(t.amount),
    ])

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Descripción', 'Categoría', 'Importe']],
    body: txRows,
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'ellipsize' },
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38 },
      3: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = data.cell.raw
        if (typeof raw === 'string' && raw.startsWith('+')) data.cell.styles.textColor = [...GREEN]
      }
    },
  })

  // Retroactively update page numbers now that we know the real total
  const totalPages = doc.internal.pages.length - 1
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    addPageChrome(doc, p, totalPages)
  }

  // Fix footer URL while we're at it
  const ph = doc.internal.pageSize.getHeight()
  const pw2 = doc.internal.pageSize.getWidth()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...LIGHT)
    doc.rect(0, ph - 10, pw2, 10, 'F')
    doc.setFontSize(6)
    doc.setTextColor(...GRAY)
    doc.text('EasyResumen · procesamiento 100% local · www.easyresumen.com.ar', pw2 / 2, ph - 5, { align: 'center' })
  }

  const fileName = `easyresumen_informe_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
  return fileName
}
