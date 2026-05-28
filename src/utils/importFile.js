import * as XLSX from 'xlsx'
import { CATEGORIES, categorize } from './categorizer'

// Reverse map: Spanish label → category key
const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(CATEGORIES).map(([k, v]) => [v.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), k])
)

function labelToCategory(label) {
  if (!label) return null
  const norm = String(label).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  return LABEL_TO_KEY[norm] || null
}

function parseDate(raw) {
  const s = String(raw || '').trim()
  // dd/MM/yyyy (from XLSX export)
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  // YYYY-MM-DD (from CSV export)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial date number
  if (/^\d+(\.\d+)?$/.test(s)) {
    try {
      const d = XLSX.SSF.parse_date_code(parseFloat(s))
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    } catch { /* ignore */ }
  }
  return null
}

function parseInstallment(raw) {
  if (!raw) return undefined
  const m = String(raw).match(/^(\d+)\/(\d+)$/)
  return m ? { current: parseInt(m[1]), total: parseInt(m[2]) } : undefined
}

// Normalize header name for flexible matching
function normHeader(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function buildIndex(headers) {
  const idx = {}
  headers.forEach((h, i) => { idx[normHeader(h)] = i })
  return idx
}

function getCell(row, idx, ...keys) {
  for (const k of keys) {
    const i = idx[k]
    if (i !== undefined) {
      const v = row[i]
      if (v !== undefined && v !== null && v !== '') return v
    }
  }
  return ''
}

function rowsToTransactions(headers, rows) {
  const idx = buildIndex(headers)
  const txs = []

  for (const row of rows) {
    if (!row || row.length === 0) continue

    const date = parseDate(getCell(row, idx, 'fecha'))
    if (!date) continue

    const description = String(getCell(row, idx, 'descripcion', 'descripcion') || '').trim()
    if (!description) continue

    const importeRaw = getCell(row, idx, 'importe', 'importe$')
    const importe = parseFloat(String(importeRaw).replace(/\s/g, '').replace(',', '.')) || 0
    const amount = Math.abs(importe)
    if (amount <= 0) continue

    // Type: prefer explicit column, fallback to sign of importe
    const tipoRaw = String(getCell(row, idx, 'tipo') || '').toLowerCase()
    let type
    if (tipoRaw.includes('cred')) type = 'credit'
    else if (tipoRaw.includes('deb')) type = 'debit'
    else type = importe > 0 ? 'credit' : 'debit'

    // Category: trust what's in the file (user may have edited), fallback to auto
    const catRaw = String(getCell(row, idx, 'categoria', 'categora') || '')
    const catKey = labelToCategory(catRaw)
    const category = CATEGORIES[catKey] ? catKey : categorize(description)

    const source = String(getCell(row, idx, 'origen') || 'Importado').trim() || 'Importado'
    const note = String(getCell(row, idx, 'nota') || '').trim() || undefined
    const installment = parseInstallment(getCell(row, idx, 'cuota'))

    const originalCurrency = String(getCell(row, idx, 'moneda') || '').trim().toUpperCase() || undefined
    const origRaw = getCell(row, idx, 'importeorig')
    const originalAmount = origRaw !== '' ? (parseFloat(String(origRaw).replace(',', '.')) || undefined) : undefined

    txs.push({
      date,
      description,
      amount,
      type,
      category,
      source,
      ...(note ? { note } : {}),
      ...(installment ? { installment } : {}),
      ...(originalCurrency ? { originalCurrency } : {}),
      ...(originalAmount ? { originalAmount } : {}),
    })
  }

  return txs
}

export async function importFromXLSX(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  // Prefer 'Movimientos' sheet, fallback to first sheet
  const sheetName =
    wb.SheetNames.find(n => normHeader(n).includes('movimiento')) ||
    wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (data.length < 2) return []
  const headers = data[0]
  const rows = data.slice(1).filter(r => r.some(c => c !== ''))
  return rowsToTransactions(headers, rows)
}

export function importFromCSV(text) {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  function parseLine(line) {
    const result = []
    let cur = ''
    let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return rowsToTransactions(headers, rows)
}
