import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { categorize } from './categorizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl


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
  let m = s.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/)
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
  m = s.match(/\b(\d{1,2})[-/](\d{1,2})\b/)
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
  const m = text.match(/\b(?:cta|cuota|ct)\.?\s*(\d{1,2})\s*[-/]\s*(\d{1,2})\b/i)
    || text.match(/\bC\.\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  if (!m) return null
  const current = parseInt(m[1])
  const total = parseInt(m[2])
  if (current > 0 && total > 1 && current <= total) return { current, total }
  return null
}

// ─── Foreign currency detection ─────────────────────────────────────────────

const FX_RE = /\b(U\$[DS]|USD|EUR|GBP|BRL|CLP|UYU)\s+([\d.,]+)/i
const FX_NORM = { 'U$D': 'USD', 'U$S': 'USD' }

function detectForeignCurrency(text) {
  const m = norm(text).match(FX_RE)
  if (!m) return null
  const currency = FX_NORM[m[1].toUpperCase()] || m[1].toUpperCase()
  const originalAmount = parseAmount(m[2])
  if (!originalAmount || originalAmount <= 0) return null
  return { originalCurrency: currency, originalAmount }
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
  // Most specific / branded names first to avoid false positives on generic words
  if (t.includes('american express'))  return 'AMEX'
  if (t.includes('naranja x'))         return 'Naranja X'
  if (t.includes('naranja'))           return 'Naranja X'
  if (t.includes('mercado pago') || t.includes('mercadopago')) return 'Mercado Pago'
  if (t.includes('brubank'))           return 'Brubank'
  if (t.includes('ualá') || t.includes('uala')) return 'Ualá'
  if (t.includes('credicoop'))         return 'Credicoop'
  if (t.includes('hipotecario'))       return 'Hipotecario'
  if (t.includes('supervielle'))       return 'Supervielle'
  if (t.includes('patagonia'))         return 'Patagonia'
  if (t.includes('cabal'))             return 'CABAL'
  if (t.includes('amex'))              return 'AMEX'
  if (t.includes('galicia'))           return 'Galicia'
  if (t.includes('bbva'))              return 'BBVA'
  if (t.includes('santander'))         return 'Santander'
  if (t.includes('hsbc'))              return 'HSBC'
  if (t.includes('icbc'))              return 'ICBC'
  if (t.includes('macro'))             return 'Macro'
  if (t.includes('itaú') || t.includes('itau')) return 'Itaú'
  if (t.includes('nacion') || t.includes('nación') || t.includes('bna')) return 'Banco Nación'
  if (t.includes('ciudad'))            return 'Banco Ciudad'
  if (t.includes('mastercard'))        return 'Mastercard'
  if (t.includes('visa'))              return 'Visa'
  return 'Desconocido'
}

// ─── Detect year from PDF text ────────────────────────────────────────────

function detectYear(allText) {
  const m = allText.match(/\b(20[2-4]\d)\b/)
  return m ? parseInt(m[1]) : new Date().getFullYear()
}

// ─── Shared description cleaner ──────────────────────────────────────────────

function cleanDesc(raw) {
  // Normalize unicode dashes to ASCII so all regex patterns work uniformly
  let desc = norm(raw)
    // Remove date formats
    .replace(/\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b/g, '')
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '')
    .replace(/\b\d{1,2}\s+(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+\d{2,4}\b/gi, '')
    // Remove exchange rate references (e.g. "1078.774,71 TC1415,000")
    .replace(/\d[\d.,]+\s+TC\d[\d.,]*/gi, '')
    // Remove amounts (including negative with leading minus)
    .replace(/-\s*\d[\d.,]+/g, ' ')
    .replace(AMT_RE, ' ')
    // Remove percentage-based charge references (e.g. "2,00%( 26416,26)", "30%")
    .replace(/\d[\d.,]*\s*%(?:\s*\([\d\s.,]+\))?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove leading/trailing noise chars (including underscores and parens)
  desc = desc.replace(/^[\s\-.|/_()]+|[\s\-.|/_()]+$/g, '').trim()

  // Strip leading comprobante/voucher codes: 4-7 digits + letter (e.g. "645184*", "005067K", "1998C")
  desc = desc.replace(/^\d{4,7}[A-Z*K]\s*/i, '').trim()

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
  // Known header/summary keywords at start of line
  // Note: 'tarjeta' and 'cuota' are included — in CC statements they never start a merchant name
  if (/^(total|subtotal|saldo|vencimiento|fecha|resumen|periodo|apertura|cierre|limite|disponible|pagos|debitos|creditos|vto\.?|nro\.?|titular|nombre|cuenta|numero|operacion|viene\s+de|continua\s+en|tarjeta|cuota)/i.test(desc)) return true
  // Payment lines: "pago" at start OR common payment phrases anywhere
  if (/^pago\b/i.test(desc)) return true
  if (/\bsu\s+pago\b|\bpago\s+en\s+pesos\b|\bpago\s+m[ií]nimo\b|\bpago\s+de\s+tarjeta\b/i.test(desc)) return true
  // "TARJETA (9992) TOTAL CONSUMOS..." subtotal rows
  if (/tarjeta\s*\(?\d+\)?\s*total/i.test(desc)) return true
  // Summary keywords anywhere in description
  if (/saldo\s+anterior|saldo\s+actual|cierre\s+actual|vencimiento\s+actual|proximo\s+cierre|vto\.?\s+anterior|nro\.?\s+de\s+cuenta/i.test(desc)) return true
  // Page header rows (cardholder name + card type)
  if (/\b(?:visa|mastercard|amex|american\s+express|cabal|naranja)\s+(?:signature|platinum|classic|gold|black|infinite)\b/i.test(desc)) return true
  if (/\bhoja\s+\d+\b/i.test(desc)) return true
  // Address fragments
  if (/\bvilla\s+adelina\b/i.test(desc)) return true
  // Installment schedule rows: 2+ "Month/YY" or "Month-YY" tokens (e.g. "ENE/25 FEB/25")
  if ((desc.match(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)[-/]\d{2}\b/gi) || []).length >= 2) return true
  // Argentine CC fiscal/fee rows: interest, taxes, commissions — not merchant purchases
  if (/^(interes\w*\s+(?:(?:de|por|s\/)\s+)?financ|iibb\b|iva\s+rg|db\.?\s*iva|db\.?rg\b|com\.adm|transferencia\s+deuda|percep[^a-z])/i.test(desc)) return true
  // Bank administrative cargo rows (e.g. "CARGO COM.ADM", "CARGO FINANCIERO", "CARGO RENOVACION ANUAL")
  if (/^cargo\s+(?:com\.?\s*adm|financiero|renovaci[oó]n|administrativo|mantenimiento|anual\b)/i.test(desc)) return true
  // OCR garbage: description is just digits, colons or very few letters after cleaning
  if (/^[\d\s:.,/-]+$/.test(desc)) return true
  // Extremely short residual (allow 3-letter merchants like YPF, OCA, ACA)
  if (desc.replace(/\s/g, '').length < 3) return true
  // Description contains only month names/abbreviations + digits/symbols → pure schedule row (e.g. "ENE/25")
  const nonMonth = desc.replace(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|prox(?:imo)?s?|meses?)\b/gi, '').replace(/[\d\s/,.:|()%$-]+/g, '')
  if (nonMonth.trim().length === 0) return true
  // Notification letter / legal boilerplate embedded in some PDFs
  if (/^(buenos\s+aires|dichos\s+cambios|le\s+inform|le\s+comuni|estimado\s+asociad|condiciones\s+vigentes|la\s+presente|en\s+virtud|a\s+partir\s+del\s+pr|por\s+ello\s+le)/i.test(desc)) return true
  return false
}

// ─── Card-section header detection ───────────────────────────────────────────
// Covers 7 patterns across all recognised Argentine banks.

function buildCardInfo(suffix, rawName) {
  const cleanSuffix = suffix
    ? (/^\d+$/.test(String(suffix))
        ? String(suffix).replace(/\D/g, '').slice(-4) || null
        : String(suffix).toUpperCase().slice(0, 4))
    : null
  let holder = null
  if (rawName) {
    const trimmed = rawName.trim().replace(/\s*[\d.,]+\s*$/, '').trim()
    if (trimmed.length >= 2) {
      let given
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/')
        const afterSlash = parts[parts.length - 1].trim()
        // If post-slash is empty or a single word it's likely a family surname prefix;
        // use the pre-slash portion which holds the actual given name(s).
        given = afterSlash.split(/\s+/).filter(Boolean).length <= 1
          ? parts.slice(0, -1).join('/').trim()
          : afterSlash
      } else {
        given = trimmed
      }
      holder = given.split(/\s+/).filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      if (holder.length < 2) holder = null
    }
  }
  return (cleanSuffix || holder) ? { suffix: cleanSuffix, holder } : null
}

function buildSource(bank, filename, card) {
  const base = (bank && bank !== 'Desconocido') ? bank : filename.replace(/\.[^.]+$/, '')
  if (!card) return base
  if (card.suffix) {
    // Ordinal markers (A1, A2…) from P7 pattern → human-readable "Adicional N"
    const display = /^A\d+$/.test(card.suffix)
      ? `Adicional ${card.suffix.slice(1)}`
      : `*${card.suffix}`
    return `${base} · ${display}`
  }
  if (card.holder) return `${base} · ${card.holder}`
  return base
}

// Returns true for account-holder section headers that have NO card number
// (e.g. "TARJETA TITULAR", "CONSUMOS TITULARES", "CUENTA TITULAR").
// When matched we reset currentCard so titular purchases aren't tagged as an additional.
function isTitularReset(text) {
  return /\b(?:tarjeta|cuenta|consumos?)\s+titular(?:es)?\b/i.test(text) &&
    !text.match(/\((\d+)\)/) &&          // no (nnnn) → not an additional
    !text.match(/terminada\s+en\s+\d{4}/) &&
    !text.match(/adicional/i)
}

function extractCardInfo(text) {
  let m

  // P1 · CABAL / Naranja X — "TARJETA (0085) TOTAL CONSUMOS DE GUIDO/MARIA CANDELA"
  m = text.match(/tarjeta\s*\((\d+)\)[^()]*de\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,50})/i)
  if (m) return buildCardInfo(m[1], m[2])

  // P2 · Visa/MC adicional con número corto — "TARJETA ADICIONAL Nro. 4521 PEREZ JUAN"
  m = text.match(/tarjeta\s+adicional\s+(?:nro\.?\s*|n[°º]?\s*)?(?:[*X\s]{0,10})?(\d{4})\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40})/i)
  if (m) return buildCardInfo(m[1], m[2])

  // P3 · Visa/MC adicional con número enmascarado largo — "TARJETA ADICIONAL **** **** **** 4521 PEREZ"
  m = text.match(/tarjeta\s+adicional\s+(?:[\d*X\s]{6,18})?(\d{4})\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40})/i)
  if (m) return buildCardInfo(m[1], m[2])

  // P2b · "TARJETA ADICIONAL CANDELA RODRIGUEZ" — sin número de tarjeta, requiere ≥2 palabras
  m = text.match(/tarjeta\s+adicional\s+([A-ZÁÉÍÓÚÑA-Z]{2,}(?:\s+[A-ZÁÉÍÓÚÑA-Z]{2,})+)/i)
  if (m) return buildCardInfo(null, m[1])

  // P4 · Galicia / HSBC / Santander — "TERMINADA EN 4521 - PEREZ JUAN" o sin nombre
  m = text.match(/terminada\s+en\s+(\d{4})(?:\s*[-–·:,]?\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40}))?/i)
  if (m) return buildCardInfo(m[1], m[2] || null)

  // P5 · AMEX — "CUENTA ADICIONAL 3728-XXXXXX JUAN PEREZ"
  m = text.match(/cuenta\s+adicional\s+(?:[\dX*-]+\s+)?([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m) return buildCardInfo(null, m[1])

  // P6 · Genérico — "TITULAR ADICIONAL: PEREZ JUAN" / "NOMBRE DEL TITULAR: JUAN PEREZ"
  // Requires ≥2 words after the colon: prevents single-surname captures like "TITULAR: GOMEZ"
  // which are account-holder header rows (name in LAST, FIRST format, comma stops capture at 1 word).
  m = text.match(/(?:nombre\s+del\s+)?titular(?:\s+(?:adicional|principal))?\s*[:-]\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m && m[1].trim().split(/\s+/).filter(Boolean).length >= 2) return buildCardInfo(null, m[1])

  // P7 · Numeración ordinal — "ADICIONAL N° 2 - PEREZ JUAN" (Macro, Patagonia, ICBC)
  m = text.match(/\badicional\s+n[°º]?\.?\s*(\d{1,2})\s*[-–·]\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m) return buildCardInfo(`A${m[1]}`, m[2])

  return null
}

// ─── Core row-based parser ───────────────────────────────────────────────────

function parseRows(rows, filename, refYear, ocrMode = false, bank = '') {
  const transactions = []
  let currentCard = null
  let pendingRetroactive = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Detect card section headers before date check (they have no parseable date)
    if (isTitularReset(row.text)) { currentCard = null; pendingRetroactive = []; continue }
    const cardInfo = extractCardInfo(row.text)
    if (cardInfo) {
      // CABAL-style: "TARJETA (nnnn) TOTAL CONSUMOS DE NAME" appears at END of each section.
      // Retroactively assign card info to preceding untagged transactions.
      const isEndOfSection = /\btotal\s+consumos\b/i.test(row.text)
      if (isEndOfSection && pendingRetroactive.length > 0) {
        for (const t of pendingRetroactive) {
          t.source = buildSource(bank, filename, cardInfo)
          if (cardInfo.holder) t.cardHolder = cardInfo.holder
          else delete t.cardHolder
          t.category = categorize(t.description)
        }
        pendingRetroactive = []
        currentCard = null
      } else if (!isEndOfSection) {
        currentCard = cardInfo
        pendingRetroactive = []
      }
      continue
    }

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
    // OCR mode: the last amount may be a running balance, not the transaction amount.
    // When it's 5× larger than the first positive amount on the row, prefer the first.
    if (ocrMode && amounts.length >= 2) {
      const firstPos = amounts.find(a => a.val > 0)
      if (firstPos && amountVal > firstPos.val * 5) amountVal = firstPos.val
    }
    const type = amountVal < 0 ? 'credit' : 'debit'

    const desc = cleanDesc(row.text)
    if (shouldSkipDesc(desc)) continue

    const installment = detectInstallment(row.text)
    const fx = detectForeignCurrency(row.text)

    const tx = {
      id: crypto.randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amountVal),
      type,
      installment,
      category: categorize(desc),
      source: buildSource(bank, filename, currentCard),
      ...(currentCard?.holder ? { cardHolder: currentCard.holder } : {}),
      ...(fx || {}),
    }
    transactions.push(tx)
    if (!currentCard) pendingRetroactive.push(tx)
  }

  return transactions
}

// ─── Column-aware parser (for PDFs with clearly separated columns) ───────────

function parseColumnar(rows, filename, refYear, bank = '') {
  const transactions = []
  let currentCard = null
  let pendingRetroactive = []

  for (let i = 0; i < rows.length; i++) {
    const { cols, text } = rows[i]

    // Detect card section headers
    if (isTitularReset(text)) { currentCard = null; pendingRetroactive = []; continue }
    const cardInfo = extractCardInfo(text)
    if (cardInfo) {
      const isEndOfSection = /\btotal\s+consumos\b/i.test(text)
      if (isEndOfSection && pendingRetroactive.length > 0) {
        for (const t of pendingRetroactive) {
          t.source = buildSource(bank, filename, cardInfo)
          if (cardInfo.holder) t.cardHolder = cardInfo.holder
          else delete t.cardHolder
          t.category = categorize(t.description)
        }
        pendingRetroactive = []
        currentCard = null
      } else if (!isEndOfSection) {
        currentCard = cardInfo
        pendingRetroactive = []
      }
      continue
    }

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
    const fx = detectForeignCurrency(text)
    const tx = {
      id: crypto.randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
      installment,
      category: categorize(desc),
      source: buildSource(bank, filename, currentCard),
      ...(currentCard?.holder ? { cardHolder: currentCard.holder } : {}),
      ...(fx || {}),
    }
    transactions.push(tx)
    if (!currentCard) pendingRetroactive.push(tx)
  }

  return transactions
}

// ─── Deduplicate ─────────────────────────────────────────────────────────────

function dedupe(txs) {
  const seen = new Set()
  return txs.filter(t => {
    const key = `${t.date}|${t.amount}|${t.description.slice(0,20)}|${t.source}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Main entry ──────────────────────────────────────────────────────────────

// ─── OCR for scanned PDFs ───────────────────────────────────────────────────

async function renderPageToCanvas(pdfPage, scale = 2.0) {
  const viewport = pdfPage.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width  = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await pdfPage.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

async function ocrPages(arrayBuffer, numPages, onProgress) {
  const { createWorker } = await import('tesseract.js')
  // Use local assets (public/) so OCR works offline in Electron
  const base = window.location.origin
  // Point corePath to the exact file to skip SIMD detection (avoids DotProductSSE crash)
  let currentPage = 0
  const worker = await createWorker('spa', 1, {
    workerPath: `${base}/tesseract/worker.min.js`,
    langPath:   `${base}/lang`,
    corePath:   `${base}/tesseract-core/tesseract-core-lstm.wasm.js`,
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress?.({ stage: 'ocr', progress: m.progress, page: currentPage, total: numPages, pct: ((currentPage - 1 + m.progress) / numPages) * 100 })
      }
    },
  })

  // Re-open with pdfjs to render pages
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= numPages; i++) {
    currentPage = i
    onProgress?.({ stage: 'ocr', page: i, total: numPages, pct: ((i - 1) / numPages) * 100 })
    try {
      const page = await pdf.getPage(i)
      const canvas = await renderPageToCanvas(page)
      const { data: { text } } = await worker.recognize(canvas)
      fullText += text + '\n'
    } catch { /* skip unrenderable page */ }
  }

  await worker.terminate()
  return fullText
}

// Convert raw OCR text lines into pseudo text items for groupIntoRows
function ocrTextToItems(text) {
  return text.split('\n').map((line, i) => ({
    str: line,
    transform: [1, 0, 0, 1, 10, 1000 - i * 14],
  }))
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function parsePDF(file, { onProgress } = {}) {
  let pages
  let arrayBuffer

  try {
    arrayBuffer = await file.arrayBuffer()
    pages = []
    // slice(0) copies the buffer — pdfjs transfers/detaches the original, we keep a copy for OCR
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items)
      } catch {
        pages.push([])  // push empty page on error, continue
      }
    }
  } catch (e) {
    throw new Error(`No se pudo leer el PDF: ${e.message}`, { cause: e })
  }

  const allText = pages.flat().map(i => i.str).join(' ')
  const textItems = pages.flat().filter(i => i.str.trim()).length

  // Scanned / image-only PDF → try OCR
  if (textItems < 10) {
    if (!onProgress) {
      return { bank: 'Desconocido', transactions: [], pageCount: pages.length, rawText: '', scanned: true }
    }
    try {
      onProgress({ stage: 'ocr', progress: 0, page: 0, total: pages.length })
      const ocrText = await ocrPages(arrayBuffer, pages.length, onProgress)
      onProgress({ stage: 'done', progress: 1 })

      if (!ocrText.trim()) {
        return { bank: 'Desconocido', transactions: [], pageCount: pages.length, rawText: '', scanned: true, ocrFailed: true }
      }

      // Parse OCR text as a single synthetic page
      const ocrItems = ocrTextToItems(ocrText)
      const bank = detectBank(ocrText)
      const refYear = detectYear(ocrText)
      const rows = groupIntoRows(ocrItems)
      const colTxs = parseColumnar(rows, file.name, refYear, bank)
      const rowTxs = parseRows(rows, file.name, refYear, true, bank)
      let transactions = dedupe(colTxs.length >= rowTxs.length ? colTxs : rowTxs)
      return { bank, transactions, pageCount: pages.length, rawText: ocrText.slice(0, 2000), scanned: true, ocr: true }
    } catch (e) {
      return { bank: 'Desconocido', transactions: [], pageCount: pages.length, rawText: '', scanned: true, ocrFailed: true, ocrError: e.message }
    }
  }

  const bank = detectBank(allText)
  const refYear = detectYear(allText)

  let pageErrors = 0

  // Single-pass: combine all pages with Y offset to preserve cross-page card attribution
  // (CABAL puts "TOTAL CONSUMOS" at end of card sections, which may span page boundaries)
  const allPageRows = []
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    try {
      const rows = groupIntoRows(pages[pageIdx])
      // Higher offset for earlier pages keeps top-to-bottom, page-by-page document order
      const yOffset = (pages.length - 1 - pageIdx) * 100000
      for (const row of rows) {
        allPageRows.push({ ...row, y: row.y + yOffset })
      }
    } catch {
      pageErrors++
    }
  }
  allPageRows.sort((a, b) => b.y - a.y)

  const colTxs = parseColumnar(allPageRows, file.name, refYear, bank)
  const rowTxs = parseRows(allPageRows, file.name, refYear, false, bank)
  const transactions = colTxs.length >= rowTxs.length ? colTxs : rowTxs

  return {
    bank,
    transactions,
    pageCount: pages.length,
    rawText: allText.slice(0, 2000),
    pageErrors: pageErrors > 0 ? pageErrors : undefined,
  }
}
