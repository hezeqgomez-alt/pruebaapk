import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { categorize } from './categorizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ─── Text extraction ────────────────────────────────────────────────────────

async function extractPages(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items)
  }
  return pages
}

// Normalize unicode minus signs / dashes to ASCII hyphen
function norm(str) {
  return str.replace(/[−‒–—―]/g, '-')
}

// Group text items into rows by their Y coordinate (within tolerance)
function groupIntoRows(items, yTol = 3) {
  const rows = []
  for (const item of items) {
    const text = norm(item.str).trim()
    if (!text) continue
    const y = Math.round(item.transform[5])
    const x = item.transform[4]
    let row = rows.find(r => Math.abs(r.y - y) <= yTol)
    if (!row) { row = { y, items: [] }; rows.push(row) }
    row.items.push({ x, text })
  }
  return rows
    .sort((a, b) => b.y - a.y)       // top to bottom (PDF Y axis is inverted)
    .map(r => ({
      y: r.y,
      text: r.items.sort((a, b) => a.x - b.x).map(i => i.text).join(' '),
      cols: r.items.sort((a, b) => a.x - b.x),
    }))
}

// ─── Amount parsing ─────────────────────────────────────────────────────────

function parseAmount(str) {
  if (!str) return null
  let s = norm(str).replace(/\s/g, '')
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')')) || s.endsWith('-')
  s = s.replace(/^[-()]|[()]$|-$/g, '')

  // Remove currency symbols and non-numeric prefix
  s = s.replace(/^[A-Z$€£¥]{1,3}\.?/, '')

  // Argentine: 1.234.567,89
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  // Argentine no-thousands: 1234,89
  } else if (/^\d+(,\d{1,2})$/.test(s)) {
    s = s.replace(',', '.')
  // US: 1,234,567.89
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    s = s.replace(/,/g, '')
  } else {
    // Fallback: strip everything except digits, comma, dot
    s = s.replace(/[^0-9.,]/g, '')
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.')
      } else {
        s = s.replace(/,/g, '')
      }
    } else if (s.includes(',')) {
      const parts = s.split(',')
      s = parts.length === 2 && parts[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
    }
  }

  const val = parseFloat(s)
  return isNaN(val) || val <= 0 ? null : (neg ? -val : val)
}

// ─── Date parsing ────────────────────────────────────────────────────────────

const MONTHS_ES = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12, enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 }

function parseDate(str, refYear) {
  if (!str) return null
  const s = norm(str)
  const yr = refYear || new Date().getFullYear()

  // dd/mm/yyyy or dd-mm-yyyy
  let m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/)
  if (m) {
    const y  = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${y}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  // dd.mm.yy or dd.mm.yyyy (Banco Ciudad, ICBC, etc.)
  m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/)
  if (m) {
    const y  = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${y}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  // dd/mm (sin año)
  m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
  if (m) {
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${yr}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  // dd ENE, dd ENERO, etc.
  m = s.toLowerCase().match(/\b(\d{1,2})\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b/)
  if (m) {
    const mo = MONTHS_ES[m[2]]
    if (mo) return `${yr}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }
  return null
}

// ─── Installment detection ───────────────────────────────────────────────────

function detectInstallment(text) {
  // Require explicit keyword prefix: CTA, CUOTA, C. — avoid false positives on dates
  const m = text.match(/\b(?:cta|cuota|ct)\.?\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})\b/i)
    || text.match(/\bC\.\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  if (!m) return null
  const current = parseInt(m[1])
  const total = parseInt(m[2])
  if (current > 0 && total > 1 && current <= total) return { current, total }
  return null
}

// ─── Amount detection in a line ──────────────────────────────────────────────

// Monto válido: separador de miles (1.234), coma decimal (1234,56),
// signo $ delante, 5+ dígitos, o trailing dash para créditos (553.343,47-).
const AMT_RE = /(?:^|\s)(-?\(?\$\s*\d[\d.,]*|\(?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?-?\)?|-?\(?\d+,\d{2}-?\)?|-?\(?\d{5,}-?\)?)(?=\s|$)/g

function findAmounts(text) {
  const results = []
  let m
  AMT_RE.lastIndex = 0
  while ((m = AMT_RE.exec(text)) !== null) {
    const val = parseAmount(m[1])
    if (val !== null && val !== 0) results.push({ raw: m[1].trim(), val, index: m.index })
  }
  return results
}

// ─── Bank detection ──────────────────────────────────────────────────────────

function detectBank(text) {
  const t = text.toLowerCase()
  if (t.includes('galicia'))          return 'Galicia'
  if (t.includes('bbva'))             return 'BBVA'
  if (t.includes('santander'))        return 'Santander'
  if (t.includes('macro'))            return 'Macro'
  if (t.includes('icbc'))             return 'ICBC'
  if (t.includes('supervielle'))      return 'Supervielle'
  if (t.includes('hsbc'))             return 'HSBC'
  if (t.includes('itau') || t.includes('itaú')) return 'Itaú'
  if (t.includes('ciudad'))           return 'Banco Ciudad'
  if (t.includes('nacion') || t.includes('bna')) return 'Banco Nación'
  if (t.includes('patagonia'))        return 'Patagonia'
  if (t.includes('hipotecario'))      return 'Hipotecario'
  if (t.includes('credicoop'))        return 'Credicoop'
  if (t.includes('naranja'))          return 'Naranja X'
  if (t.includes('mercado pago') || t.includes('mercadopago')) return 'Mercado Pago'
  if (t.includes('american express') || t.includes('amex')) return 'Amex'
  if (t.includes('brubank'))          return 'Brubank'
  if (t.includes('uala') || t.includes('ualá')) return 'Ualá'
  if (t.includes('cabal'))            return 'Cabal'
  return 'Desconocido'
}

// ─── Detect year from PDF text ────────────────────────────────────────────

function detectYear(allText) {
  const m = allText.match(/\b(202\d)\b/)
  return m ? parseInt(m[1]) : new Date().getFullYear()
}

// ─── Shared description cleaner ──────────────────────────────────────────────

function cleanDesc(raw) {
  let desc = raw
    // Remove date formats
    .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, '')
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '')
    .replace(/\b\d{1,2}\s+(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+\d{2,4}\b/gi, '')
    // Remove exchange rate references (e.g. "1078.774,71 TC1415,000")
    .replace(/\d[\d.,]+\s+TC\d[\d.,]*/gi, '')
    // Remove amounts
    .replace(AMT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove leading/trailing noise chars (including underscores and parens)
  desc = desc.replace(/^[\s\-\.\|\/\_\(\)]+|[\s\-\.\|\/\_\(\)]+$/g, '').trim()

  // Strip leading comprobante/voucher codes: 5-7 digits + letter (e.g. "645184*", "005067K")
  desc = desc.replace(/^\d{5,7}[A-Z*K]\s*/i, '').trim()

  // Strip leading 3-4 digit voucher numbers (CABAL, Credicoop format: "4259 MERCHANT")
  desc = desc.replace(/^\d{3,4}\s+(?=[A-Z])/i, '').trim()

  // Remove trailing installment keyword remnants (e.g. "MERCHANT cta", "AYSA C.")
  desc = desc.replace(/\s+(?:cta|cuota|c)\.?\s*$/i, '').trim()

  // Strip stray currency symbols and remaining noise
  desc = desc.replace(/^\$\s*|\s*\$\s*$/g, '').replace(/[*\-,]+$/g, '').replace(/\s+/g, ' ').trim()

  return desc
}

function shouldSkipDesc(desc) {
  if (!desc || desc.length < 3) return true
  // Barcode / binary noise rows
  if (desc.startsWith('<')) return true
  // Known header/summary keywords at start
  if (/^(total|subtotal|saldo|pago|vencimiento|fecha|cuota|resumen|periodo|apertura|cierre|limite|disponible|pagos|debitos|creditos|vto\.?|nro\.?|tarjeta|titular|nombre|cuenta|numero|operacion|viene\s+de|continua\s+en)/i.test(desc)) return true
  // "TARJETA (9992) TOTAL CONSUMOS..." subtotal rows
  if (/tarjeta\s*\(?\d+\)?\s*total/i.test(desc)) return true
  // Summary keywords anywhere in description
  if (/saldo\s+anterior|saldo\s+actual|cierre\s+actual|vencimiento\s+actual|pago\s+m[ií]nimo|proximo\s+cierre|vto\.?\s+anterior|nro\.?\s+de\s+cuenta/i.test(desc)) return true
  // Account holder address fragments (Credicoop/Banco Ciudad header rows)
  if (/\bvilla\s+adelina\b/i.test(desc)) return true
  // Installment schedule rows: 3+ "Month/YY" or "Month-YY" tokens
  if ((desc.match(/\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)[\/\-]\d{2}\b/gi) || []).length >= 3) return true
  return false
}

// ─── Core row-based parser ───────────────────────────────────────────────────

function parseRows(rows, filename, refYear) {
  const transactions = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const date = parseDate(row.text, refYear)
    if (!date) continue

    // Find amounts in this row
    let amounts = findAmounts(row.text)

    // If no amount on this row, check next row
    if (amounts.length === 0 && i + 1 < rows.length) {
      amounts = findAmounts(rows[i + 1].text)
    }

    if (amounts.length === 0) continue

    // Rightmost (last) amount = cargo/débito.
    // Exception: for credit rows (all-negative), pick the most-negative value —
    // dual-currency statements (VISA/CABAL) place the smaller USD credit last.
    let amountVal = amounts[amounts.length - 1].val
    if (amountVal < 0 && amounts.length > 1 && amounts.every(a => a.val < 0)) {
      amountVal = amounts.reduce((min, a) => a.val < min.val ? a : min).val
    }
    const type = amountVal < 0 ? 'credit' : 'debit'

    const desc = cleanDesc(row.text)
    if (shouldSkipDesc(desc)) continue

    const installment = detectInstallment(row.text)

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amountVal),
      type,
      installment,
      category: categorize(desc),
      source: filename,
      raw: row.text,
    })
  }

  return transactions
}

// ─── Column-aware parser (for PDFs with clearly separated columns) ───────────

function parseColumnar(rows, filename, refYear) {
  const transactions = []

  for (let i = 0; i < rows.length; i++) {
    const { cols, text } = rows[i]
    if (cols.length < 2) continue

    // First column: try to find a date
    const dateCol = cols.find(c => parseDate(c.text, refYear))
    if (!dateCol) continue

    const date = parseDate(dateCol.text, refYear)

    // Last column: try to find an amount
    const amtCol = [...cols].reverse().find(c => parseAmount(c.text) !== null)
    if (!amtCol) continue
    if (amtCol === dateCol) continue

    const amount = parseAmount(amtCol.text)
    if (amount === null) continue

    // Description: columns between date and amount
    const descCols = cols.filter(c => c.x > dateCol.x && c.x < amtCol.x)
    let rawDesc = descCols.map(c => c.text).join(' ').trim()

    // Fallback: full row minus date and amount tokens
    if (!rawDesc) {
      rawDesc = text
        .replace(dateCol.text, '').replace(amtCol.text, '')
        .replace(/\s+/g, ' ').trim()
    }

    const desc = cleanDesc(rawDesc)
    if (shouldSkipDesc(desc)) continue

    const installment = detectInstallment(text)
    transactions.push({
      id: crypto.randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
      installment,
      category: categorize(desc),
      source: filename,
      raw: text,
    })
  }

  return transactions
}

// ─── Deduplicate ─────────────────────────────────────────────────────────────

function dedupe(txs) {
  const seen = new Set()
  return txs.filter(t => {
    const key = `${t.date}|${t.amount}|${t.description.slice(0,20)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function parsePDF(file) {
  const pages = await extractPages(file)
  const allText = pages.flat().map(i => i.str).join(' ')

  // Detect if PDF is image-only (no extractable text)
  const textItems = pages.flat().filter(i => i.str.trim()).length
  if (textItems < 10) {
    return { bank: 'Desconocido', transactions: [], pageCount: pages.length, rawText: '', scanned: true }
  }

  const bank = detectBank(allText)
  const refYear = detectYear(allText)

  let transactions = []

  for (const items of pages) {
    const rows = groupIntoRows(items)

    // Try columnar first (more precise)
    const colTxs = parseColumnar(rows, file.name, refYear)
    // Then row-based as fallback
    const rowTxs = parseRows(rows, file.name, refYear)

    // Use whichever found more transactions
    transactions.push(...(colTxs.length >= rowTxs.length ? colTxs : rowTxs))
  }

  transactions = dedupe(transactions)

  return { bank, transactions, pageCount: pages.length, rawText: allText.slice(0, 2000) }
}
