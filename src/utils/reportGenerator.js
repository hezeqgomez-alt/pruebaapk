import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CATEGORIES } from './categorizer'

const BLUE = [30, 64, 175]
const LIGHT = [241, 245, 249]
const DARK = [30, 41, 59]
const GRAY = [100, 116, 139]
const GREEN = [5, 150, 105]
const RED = [220, 38, 38]

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function addPageHeader(doc, pageNum, totalPages) {
  const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pw, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('GastoTracker — Informe de Resúmenes de Tarjeta', 10, 8)
  doc.text(`Página ${pageNum} / ${totalPages}`, pw - 10, 8, { align: 'right' })
  doc.setTextColor(...DARK)
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(text, 14, y)
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.5)
  doc.line(14, y + 1.5, doc.internal.pageSize.getWidth() - 14, y + 1.5)
  doc.setTextColor(...DARK)
  return y + 8
}

export async function generateReport({ transactions, chartDonutRef, chartBarRef }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  const debits  = transactions.filter(t => t.type !== 'credit')
  const credits = transactions.filter(t => t.type === 'credit')
  const totalDebits  = debits.reduce((s, t) => s + t.amount, 0)
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0)
  const net = totalDebits - totalCredits

  // ── By category ──
  const byCategory = {}
  for (const t of debits) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  const catSorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a)

  // ── By month ──
  const byMonth = {}
  for (const t of debits) {
    const mo = t.date.slice(0, 7)
    byMonth[mo] = (byMonth[mo] || 0) + t.amount
  }
  const monthSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))

  // ── Top merchants ──
  const byMerchant = {}
  for (const t of debits) byMerchant[t.description] = (byMerchant[t.description] || 0) + t.amount
  const topMerchants = Object.entries(byMerchant).sort(([, a], [, b]) => b - a).slice(0, 10)

  // ── Sources ──
  const sources = [...new Set(transactions.map(t => t.source))]

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — Portada + resumen ejecutivo
  // ─────────────────────────────────────────────────────────────────────────
  addPageHeader(doc, 1, 3)

  // Portada
  doc.setFillColor(...BLUE)
  doc.rect(0, 14, pw, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Informe de Gastos', pw / 2, 30, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Resumen general de todas las tarjetas', pw / 2, 39, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, pw / 2, 47, { align: 'center' })
  doc.setTextColor(...DARK)

  // KPI cards row
  const cards = [
    { label: 'Total gastos',     value: fmt(totalDebits),  color: BLUE },
    { label: 'Créditos / devol.', value: fmt(totalCredits), color: [...GREEN] },
    { label: 'Neto',             value: fmt(net),           color: net > totalDebits * 0.9 ? [...RED] : [...DARK] },
    { label: 'Movimientos',      value: debits.length + credits.length, color: DARK },
  ]
  const cardW = (pw - 28) / 4
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 2)
    const y = 60
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(c.label.toUpperCase(), x + cardW / 2, y + 6, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...c.color)
    doc.text(String(c.value), x + cardW / 2, y + 15, { align: 'center' })
  })
  doc.setTextColor(...DARK)

  // Resúmenes cargados
  let y = 92
  y = sectionTitle(doc, 'Resúmenes incluidos', y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  sources.forEach((src, i) => {
    doc.text(`• ${src}`, 18, y + i * 5)
  })
  y += sources.length * 5 + 6

  // Período
  if (monthSorted.length > 0) {
    const first = format(parseISO(monthSorted[0][0] + '-01'), 'MMMM yyyy', { locale: es })
    const last  = format(parseISO(monthSorted[monthSorted.length - 1][0] + '-01'), 'MMMM yyyy', { locale: es })
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text(`Período analizado: ${first}${first !== last ? ' → ' + last : ''}`, 14, y)
    doc.setTextColor(...DARK)
    y += 8
  }

  // Category table
  y = sectionTitle(doc, 'Gastos por categoría', y)
  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Importe', '% del total', 'Mov.']],
    body: catSorted.map(([cat, amt]) => [
      `${CATEGORIES[cat]?.icon || ''} ${CATEGORIES[cat]?.label || cat}`,
      fmt(amt),
      `${((amt / totalDebits) * 100).toFixed(1)}%`,
      debits.filter(t => t.category === cat).length,
    ]),
    foot: [['Total gastos', fmt(totalDebits), '100%', debits.length]],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const cat = catSorted[data.row.index]?.[0]
        if (cat && data.column.index === 0) {
          const rgb = hexToRgb(CATEGORIES[cat]?.color || '#94a3b8')
          data.cell.styles.textColor = rgb
        }
      }
    },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 — Gráficos
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage()
  addPageHeader(doc, 2, 3)

  y = 18
  y = sectionTitle(doc, 'Distribución por categoría', y)

  // Donut chart image
  if (chartDonutRef?.current) {
    try {
      const imgData = chartDonutRef.current.toBase64Image('image/png', 1)
      const chartSize = 75
      doc.addImage(imgData, 'PNG', pw / 2 - chartSize / 2, y, chartSize, chartSize)
      y += chartSize + 6
    } catch {
      y += 4
    }
  }

  // Category legend (color blocks)
  const cols = 2
  const colW2 = (pw - 28) / cols
  catSorted.slice(0, 10).forEach(([cat, amt], i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const lx = 14 + col * colW2
    const ly = y + row * 7
    const rgb = hexToRgb(CATEGORIES[cat]?.color || '#94a3b8')
    doc.setFillColor(...rgb)
    doc.roundedRect(lx, ly - 3, 3, 3, 0.5, 0.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(`${CATEGORIES[cat]?.label || cat}: ${fmt(amt)} (${((amt / totalDebits) * 100).toFixed(1)}%)`, lx + 5, ly)
  })
  y += Math.ceil(Math.min(catSorted.length, 10) / cols) * 7 + 8

  // Bar chart
  y = sectionTitle(doc, 'Comparativo mes a mes', y)
  if (chartBarRef?.current) {
    try {
      const imgData = chartBarRef.current.toBase64Image('image/png', 1)
      const imgH = 55
      doc.addImage(imgData, 'PNG', 14, y, pw - 28, imgH)
      y += imgH + 6
    } catch {
      y += 4
    }
  }

  // Monthly table
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
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 3 — Top comercios + listado de transacciones
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage()
  addPageHeader(doc, 3, 3)

  y = 18
  y = sectionTitle(doc, 'Top 10 comercios', y)
  autoTable(doc, {
    startY: y,
    head: [['#', 'Comercio', 'Total', 'Operaciones']],
    body: topMerchants.map(([desc, amt], i) => [
      i + 1,
      desc.length > 45 ? desc.slice(0, 45) + '…' : desc,
      fmt(amt),
      debits.filter(t => t.description === desc).length,
    ]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'right' }, 3: { halign: 'center' } },
  })

  y = doc.lastAutoTable.finalY + 10
  y = sectionTitle(doc, 'Listado de movimientos', y)

  const txRows = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => [
      format(parseISO(t.date), 'dd/MM/yy'),
      t.description.length > 40 ? t.description.slice(0, 40) + '…' : t.description,
      `${CATEGORIES[t.category]?.icon || ''} ${CATEGORIES[t.category]?.label || t.category}`,
      t.type === 'credit' ? `+${fmt(t.amount)}` : fmt(t.amount),
    ])

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Descripción', 'Categoría', 'Importe']],
    body: txRows,
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 36 },
      3: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = data.cell.raw
        if (typeof raw === 'string' && raw.startsWith('+')) {
          data.cell.styles.textColor = [...GREEN]
        }
      }
    },
  })

  // Footer
  const finalY = doc.lastAutoTable.finalY + 6
  if (finalY < ph - 12) {
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('GastoTracker — procesamiento 100% local, sin internet ni IA.', pw / 2, ph - 8, { align: 'center' })
  }

  const fileName = `informe_gastos_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
  return fileName
}
