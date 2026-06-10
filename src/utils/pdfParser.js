import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { categorize } from './categorizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const randomUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? () => crypto.randomUUID()
  : () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })


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

  // Argentine: 1.234.567,89 (dots = thousands, comma = decimal)
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  // Argentine no-thousands: 1234,89 or 1234,8
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
    || text.match(/\b(?:cuota|cta)\.?\s*(\d{1,2})\s+de\s+(\d{1,2})\b/i)
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
const AMT_RE = /(?:^|\s)(-?\(?\$\s*\d[\d.,]*|\(?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?-?\)?|-?\(?\d+,\d{1,2}-?\)?|-?\(?\d{5,}-?\)?)(?=\s|$)/g

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
  if (t.includes('american express'))  return 'AMEX'
  if (t.includes('naranja x'))         return 'Naranja X'
  if (t.includes('naranja'))           return 'Naranja X'
  if (t.includes('mercado pago') || t.includes('mercadopago')) return 'Mercado Pago'
  if (t.includes('brubank'))           return 'Brubank'
  if (t.includes('ualá') || t.includes('uala')) return 'Ualá'
  if (t.includes('credicoop'))         return 'Credicoop'
  // Credicoop statements where the bank name is a graphic: detect by structural fields
  // unique to Credicoop (CART. = cartera code, LIQ. = liquidación sequence)
  if (t.includes('cart.') && t.includes('liq.') && t.includes('resumen nro')) return 'Credicoop'
  if (t.includes('hipotecario'))       return 'Hipotecario'
  if (t.includes('supervielle'))       return 'Supervielle'
  if (t.includes('patagonia'))         return 'Patagonia'
  if (t.includes('galicia'))           return 'Galicia'
  if (t.includes('bbva'))              return 'BBVA'
  if (t.includes('santander'))         return 'Santander'
  if (t.includes('hsbc'))              return 'HSBC'
  if (t.includes('icbc'))              return 'ICBC'
  if (t.includes('macro'))             return 'Macro'
  if (t.includes('itaú') || t.includes('itau')) return 'Itaú'
  if (t.includes('nacion') || t.includes('nación') || t.includes('bna')) return 'Banco Nación'
  if (t.includes('ciudad'))            return 'Banco Ciudad'
  return null
}

// Detects the card network/brand from any text block.
// Order matters: check more specific/Argentine-specific networks first so
// a CABAL statement that also mentions VISA/MASTERCARD in adjacent sections
// is not incorrectly labelled as Mastercard.
function detectCardBrand(text) {
  const t = text.toLowerCase()
  if (/\bamerican\s+express\b|\bamex\b/.test(t)) return 'American Express'
  if (/\bcabal\b/.test(t))                       return 'Cabal'
  if (/\bmaestro\b/.test(t))                     return 'Maestro'
  if (/\bmastercard\b/.test(t))                  return 'Mastercard'
  if (/\bvisa\b/.test(t))                        return 'Visa'
  return null
}

// ─── Detect year from PDF text ────────────────────────────────────────────

function detectYear(allText) {
  const currentYear = new Date().getFullYear()
  const matches = [...allText.matchAll(/\b(20[2-4]\d)\b/g)].map(m => parseInt(m[1]))
  if (!matches.length) return currentYear
  // Prefer years within ±1 of current year — avoids picking up loan maturity dates (2031, 2048, etc.)
  const nearby = matches.filter(y => Math.abs(y - currentYear) <= 1)
  if (nearby.length) return nearby.sort((a, b) => Math.abs(a - currentYear) - Math.abs(b - currentYear))[0]
  // Fallback: most frequent year in document
  const freq = {}
  for (const y of matches) freq[y] = (freq[y] || 0) + 1
  return parseInt(Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0])
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

  // Remove leading/trailing noise chars (including asterisks used as CABAL row markers)
  desc = desc.replace(/^[\s\-.|/_(*]+|[\s\-.|/_()]+$/g, '').trim()

  // Strip leading comprobante/voucher codes: 4-7 digits + letter (e.g. "645184*", "005067K", "1998C")
  desc = desc.replace(/^\d{4,7}[A-Z*K]\s*/i, '').trim()

  // Strip leading 3-4 digit voucher numbers (CABAL, Credicoop format: "4259 MERCHANT")
  desc = desc.replace(/^\d{3,4}\s+(?=[A-Z])/i, '').trim()

  // Remove trailing installment keyword remnants (e.g. "MERCHANT cta", "AYSA C.")
  desc = desc.replace(/\s+(?:cta|cuota|c)\.?\s*$/i, '').trim()

  // Strip stray currency symbols and remaining noise
  desc = desc.replace(/^\$\s*|\s*\$\s*$/g, '').replace(/[*\-,]+$/g, '').replace(/\s+/g, ' ').trim()

  // Strip trailing CABAL/Credicoop coupon codes (e.g. "MERCHANT 0700" → "MERCHANT")
  desc = desc.replace(/\s+0\d{3,4}$/, '').trim()

  // Strip long embedded reference codes attached directly to a word
  // (e.g. "SEGURCOOP0256467940000003" → "SEGURCOOP", "AUTOPISTA1234567890" → "AUTOPISTA")
  desc = desc.replace(/\b([A-Z]{3,})\d{8,}/g, '$1').trim()

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
  // Summary keywords anywhere in description (with/without accents)
  if (/saldo\s+anterior|saldo\s+actual|saldo\s+deudor|saldo\s+acreedor|cierre\s+actual|vencimiento\s+actual|pr[oó]ximo\s+cierre|vto\.?\s+anterior|nro\.?\s+de\s+cuenta/i.test(desc)) return true
  // CABAL / Credicoop account summary rows (e.g. "* RESUMEN DE SU CUENTA CORRIENTE")
  if (/\bresumen\s+de\s+su\s+cuenta\b/i.test(desc)) return true
  // Period totals and compensation rows (CABAL and others)
  if (/\btotal\s+(?:del?\s+per[ií]odo|factura|a\s+pagar|facturado|periodo)\b/i.test(desc)) return true
  if (/\ba\s+compensar\b|\ba\s+comp\b/i.test(desc)) return true
  if (/^compensar\b/i.test(desc)) return true
  // Page header rows (cardholder name + card type)
  if (/\b(?:visa|mastercard|amex|american\s+express|cabal|naranja)\s+(?:signature|platinum|classic|gold|black|infinite)\b/i.test(desc)) return true
  if (/\bhoja\s+\d+\b/i.test(desc)) return true
  // Address fragments
  if (/\bvilla\s+adelina\b/i.test(desc)) return true
  // Installment schedule rows: 2+ "Month/YY" or "Month-YY" tokens (e.g. "ENE/25 FEB/25")
  if ((desc.match(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)[-/]\d{2}\b/gi) || []).length >= 2) return true
  // Argentine CC fiscal/fee rows: taxes, commissions — not merchant purchases
  // Note: interest lines (interes* financ, cargo financiero) are intentionally NOT skipped
  // so they get captured as 'intereses' category transactions.
  if (/^(iibb\b|iva\s+rg|db\.?\s*iva|db\.?rg\b|com\.adm|transferencia\s+deuda|percep[^a-z])/i.test(desc)) return true
  // Bank administrative cargo rows (e.g. "CARGO COM.ADM", "CARGO RENOVACION ANUAL")
  if (/^cargo\s+(?:com\.?\s*adm|renovaci[oó]n|administrativo|mantenimiento|anual\b)/i.test(desc)) return true
  // OCR garbage: description is just digits, colons or very few letters after cleaning
  if (/^[\d\s:.,/-]+$/.test(desc)) return true
  // Extremely short residual (allow 3-letter merchants like YPF, OCA, ACA)
  if (desc.replace(/\s/g, '').length < 3) return true
  // Description contains only month names/abbreviations + digits/symbols → pure schedule row (e.g. "ENE/25")
  const nonMonth = desc.replace(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|prox(?:imo)?s?|meses?)\b/gi, '').replace(/[\d\s/,.:|()%$-]+/g, '')
  if (nonMonth.trim().length === 0) return true
  // CABAL / loyalty: points expiry rows and points summaries — not purchases
  if (/\bpuntos?\s+a\s+vencer\b|\bpuntos?\s+acumulados?\b|\bpuntos?\s+disponibles?\b|\bpuntos?\s+cabal\b|\bprog(?:rama)?\s+de\s+puntos\b/i.test(desc)) return true
  if (/^ptos\b/i.test(desc)) return true
  if (/^total\s+puntos\b/i.test(desc)) return true
  // Banco Nación SumaPuntos and puntaje rows (loyalty scoring, not purchases)
  if (/^sumapuntos\b/i.test(desc)) return true
  if (/^puntaje\b/i.test(desc)) return true
  // Aerolíneas Plus / millas rows (Credicoop, BNA and others)
  if (/\baerol[ií]neas\s+plus\b|\bmillas?\s+acumuladas?\b|\bmillas?\s+disponibles?\b|\bmillas?\s+totales?\b/i.test(desc)) return true
  if (/^millas?\b/i.test(desc)) return true
  if (/^programas?\s+de\s+beneficios?\b/i.test(desc)) return true
  // T&C / legal section headers — backup for when section slicer doesn't cut them
  if (/^(t[eé]rminos?\s+y\s+condiciones?|condiciones?\s+(?:generales?|de\s+uso)|informaci[oó]n\s+importante|aviso\s+legal|reglamento\s+de\s+(?:uso|la\s+tarjeta))/i.test(desc)) return true
  // Notification letter / legal boilerplate embedded in some PDFs
  if (/^(buenos\s+aires|dichos\s+cambios|le\s+inform|le\s+comuni|estimado\s+(?:asociad|cliente|socio|titular)|condiciones\s+vigentes|la\s+presente|en\s+virtud|a\s+partir\s+del\s+pr|por\s+ello\s+le|le\s+recordamos|de\s+acuerdo\s+a|conforme\s+a\s+lo)/i.test(desc)) return true
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

function buildSource(bank, docBrand, filename, card) {
  const bankLabel = (bank && bank !== 'Desconocido') ? bank : filename.replace(/\.[^.]+$/, '')
  const brand = card?.brand || docBrand
  const base = brand ? `${bankLabel} Tarjeta ${brand}` : bankLabel
  if (!card) return base
  if (card.suffix) {
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
  const sectionBrand = detectCardBrand(text)

  function wb(ci) {
    if (!ci) return null
    return sectionBrand ? { ...ci, brand: sectionBrand } : ci
  }

  // P1 · CABAL / Naranja X — "TARJETA (0085) TOTAL CONSUMOS DE GUIDO/MARIA CANDELA"
  m = text.match(/tarjeta\s*\((\d+)\)[^()]*de\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,50})/i)
  if (m) { const r = wb(buildCardInfo(m[1], m[2])); if (r) return r }

  // P1b · Credicoop Visa (no-parens) — "TARJETA 2554 Total Consumos de HERNAN E GOMEZ"
  // or "Tarjeta 3544 Total Consumos de HERNAN E GOMEZ"
  m = text.match(/tarjeta\s+(\d{4})\s+total\s+consumos\s+de\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,50})/i)
  if (m) { const r = wb(buildCardInfo(m[1], m[2])); if (r) return r }

  // P2 · Visa/MC adicional con número corto — "TARJETA ADICIONAL Nro. 4521 PEREZ JUAN"
  m = text.match(/tarjeta\s+adicional\s+(?:nro\.?\s*|n[°º]?\s*)?(?:[*X\s]{0,10})?(\d{4})\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40})/i)
  if (m) { const r = wb(buildCardInfo(m[1], m[2])); if (r) return r }

  // P3 · Visa/MC adicional con número enmascarado largo — "TARJETA ADICIONAL **** **** **** 4521 PEREZ"
  m = text.match(/tarjeta\s+adicional\s+(?:[\d*X\s]{6,18})?(\d{4})\s+([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40})/i)
  if (m) { const r = wb(buildCardInfo(m[1], m[2])); if (r) return r }

  // P2b · "TARJETA ADICIONAL CANDELA RODRIGUEZ" — sin número de tarjeta, requiere ≥2 palabras
  m = text.match(/tarjeta\s+adicional\s+([A-ZÁÉÍÓÚÑA-Z]{2,}(?:\s+[A-ZÁÉÍÓÚÑA-Z]{2,})+)/i)
  if (m) { const r = wb(buildCardInfo(null, m[1])); if (r) return r }

  // P4 · Galicia / HSBC / Santander — "TERMINADA EN 4521 - PEREZ JUAN" o sin nombre
  m = text.match(/terminada\s+en\s+(\d{4})(?:\s*[-–·:,]?\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{2,40}))?/i)
  if (m) { const r = wb(buildCardInfo(m[1], m[2] || null)); if (r) return r }

  // P5 · AMEX — "CUENTA ADICIONAL 3728-XXXXXX JUAN PEREZ"
  m = text.match(/cuenta\s+adicional\s+(?:[\dX*-]+\s+)?([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m) { const r = wb(buildCardInfo(null, m[1])); if (r) return r }

  // P6 · Genérico — "TITULAR ADICIONAL: PEREZ JUAN" / "NOMBRE DEL TITULAR: JUAN PEREZ"
  m = text.match(/(?:nombre\s+del\s+)?titular(?:\s+(?:adicional|principal))?\s*[:-]\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m && m[1].trim().split(/\s+/).filter(Boolean).length >= 2) { const r = wb(buildCardInfo(null, m[1])); if (r) return r }

  // P7 · Numeración ordinal — "ADICIONAL N° 2 - PEREZ JUAN" (Macro, Patagonia, ICBC)
  m = text.match(/\badicional\s+n[°º]?\.?\s*(\d{1,2})\s*[-–·]\s*([A-ZÁÉÍÓÚÑA-Z][A-ZÁÉÍÓÚÑA-Z/\s]{4,40})/i)
  if (m) { const r = wb(buildCardInfo(`A${m[1]}`, m[2])); if (r) return r }

  return null
}

// ─── Core row-based parser ───────────────────────────────────────────────────

function parseRows(rows, filename, refYear, ocrMode = false, bank = '', docBrand = null) {
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
          t.source = buildSource(bank, docBrand, filename, cardInfo)
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
    // The last amount may be a running balance (date | desc | importe | saldo).
    // When it's 5× larger than the first positive amount on the same row, prefer the first.
    // Guard: only apply when firstPos.raw is a formatted amount (has . or ,) — bare integers
    // like comprobante codes (449917, 008580) must not trigger this heuristic.
    if (amounts.length >= 2 && amountVal > 0) {
      const firstPos = amounts.find(a => a.val > 0)
      if (firstPos && amountVal > firstPos.val * 5 && /[.,]/.test(firstPos.raw)) amountVal = firstPos.val
    }
    const type = amountVal < 0 ? 'credit' : 'debit'

    const desc = cleanDesc(row.text)
    if (shouldSkipDesc(desc)) continue

    // Sanity cap: single transaction > 50M ARS is almost certainly a balance/total row
    if (Math.abs(amountVal) > 50_000_000) continue

    const installment = detectInstallment(row.text)
    const fx = detectForeignCurrency(row.text)

    const tx = {
      id: randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amountVal),
      type,
      installment,
      category: categorize(desc),
      source: buildSource(bank, docBrand, filename, currentCard),
      ...(currentCard?.holder ? { cardHolder: currentCard.holder } : {}),
      ...(fx || {}),
    }
    transactions.push(tx)
    if (!currentCard) pendingRetroactive.push(tx)
  }

  return transactions
}

// ─── Column-aware parser (for PDFs with clearly separated columns) ───────────

function parseColumnar(rows, filename, refYear, bank = '', docBrand = null) {
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
          t.source = buildSource(bank, docBrand, filename, cardInfo)
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

    // Last column: try to find an amount — avoid running balance column
    const amtCols = [...cols].reverse().filter(c => parseAmount(c.text) !== null)
    if (!amtCols.length) continue
    let amtCol = amtCols[0]

    // If the rightmost amount is >5x the next one, it's the running balance — prefer the next.
    // Guard: only apply when amtCols[1] is formatted (has . or ,) — bare integer comprobante
    // codes must not falsely trigger the balance heuristic.
    if (amtCols.length >= 2) {
      const lastAmt = parseAmount(amtCols[0].text)
      const prevAmt = parseAmount(amtCols[1].text)
      if (lastAmt > 0 && prevAmt > 0 && lastAmt > prevAmt * 5 && /[.,]/.test(amtCols[1].text)) amtCol = amtCols[1]
    }

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

    // Sanity cap: single transaction > 50M ARS is almost certainly a balance/total row
    if (Math.abs(amount) > 50_000_000) continue

    const installment = detectInstallment(text)
    const fx = detectForeignCurrency(text)
    const tx = {
      id: randomUUID(),
      date,
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
      installment,
      category: categorize(desc),
      source: buildSource(bank, docBrand, filename, currentCard),
      ...(currentCard?.holder ? { cardHolder: currentCard.holder } : {}),
      ...(fx || {}),
    }
    transactions.push(tx)
    if (!currentCard) pendingRetroactive.push(tx)
  }

  return transactions
}

// ─── Section slicer: only parse the consumos block ───────────────────────────
// Cuts off T&C / legal boilerplate at the end.
// Start detection uses only explicit section-title markers to avoid false
// matches on summary rows like "FECHA DE CIERRE ... SALDO ANTERIOR".

// Explicit section-title markers (not column headers, which are too generic)
const CONSUMOS_START_RE = /\b(consumos?\s+del?\s+per[ií]odo|detalle\s+de\s+(?:consumos?|movimientos?)|movimientos?\s+del?\s+per[ií]odo|resumen\s+de\s+(?:consumos?|movimientos?)|actividad\s+de\s+(?:la\s+)?(?:cuenta|tarjeta)|operaciones?\s+realizadas?)\b/i

// Column-header: requires "fecha" + a description/merchant keyword (not saldo/importe alone)
const CONSUMOS_HEADER_RE = /\bfecha\b.{0,80}\b(?:descripci[oó]n|concepto|establecimiento|comercio|detalle|movimiento)\b/i

// Reliable end-of-section markers — these ONLY appear as major section headings,
// never mid-statement. "Información importante" and "nota importante" are excluded
// because many banks embed them as mid-statement footnotes.
const CONSUMOS_END_RELIABLE = /\b(t[eé]rminos?\s+y\s+condiciones?|condiciones?\s+(?:generales?|de\s+uso|del?\s+servicio)|aviso\s+legal|reglamento\s+de\s+(?:uso|la\s+tarjeta)|comunicaci[oó]n\s+"?[ab]"?\s*\d{3,4})\b/i

// Additional end markers used only in OCR mode (where T&C is serialised inline)
const CONSUMOS_END_OCR = /\b(t[eé]rminos?\s+y\s+condiciones?|condiciones?\s+(?:generales?|de\s+uso|del?\s+servicio)|informaci[oó]n\s+importante|aviso\s+legal|nota\s+importante|consideraciones?\s+generales?|comunicaci[oó]n\s+"?[ab]"?\s*\d{3,4}|reglamento\s+de\s+(?:uso|la\s+tarjeta)|est[ií]mado\s+(?:cliente|asociado)|ley\s+(?:n[°º]\s*)?\d{4,5})\b/i

function sliceToConsumosSection(rows, { ocrMode = false } = {}) {
  let startIdx = 0
  let endIdx = rows.length

  // In OCR mode try to detect start as well (T&C can precede transactions in linearised text)
  if (ocrMode) {
    for (let i = 0; i < rows.length; i++) {
      if (CONSUMOS_START_RE.test(rows[i].text) || CONSUMOS_HEADER_RE.test(rows[i].text)) {
        startIdx = i
        break
      }
    }
  }

  const endRE = ocrMode ? CONSUMOS_END_OCR : CONSUMOS_END_RELIABLE

  // Find end after start
  for (let i = startIdx; i < rows.length; i++) {
    if (endRE.test(rows[i].text)) {
      endIdx = i
      break
    }
  }

  const sliced = rows.slice(startIdx, endIdx)

  // Safety: if the slice is suspiciously small vs the full set, the start marker
  // matched something wrong. Fall back to just trimming the T&C tail.
  if (startIdx > 0 && sliced.length < Math.max(5, rows.length * 0.15)) {
    return rows.slice(0, endIdx)
  }

  return sliced
}

// ─── Deduplicate ─────────────────────────────────────────────────────────────

function dedupe(txs) {
  // Two-pass dedup: first count total occurrences per key, then keep at most
  // ceil(total/2) copies. This collapses OCR triple/quadruple reads (artifacts)
  // while preserving genuine duplicate transactions (same merchant, same day).
  // A genuine pair (total=2) is kept in full; an OCR double (total=2) passes through
  // too — that's an acceptable tradeoff since OCR triple-reads are essentially impossible.
  const totals = new Map()
  for (const t of txs) {
    const key = `${t.date}|${t.amount}|${t.description.slice(0,20)}|${t.source}|${t.installment ? `${t.installment.current}/${t.installment.total}` : ''}`
    totals.set(key, (totals.get(key) || 0) + 1)
  }
  const counts = new Map()
  return txs.filter(t => {
    const key = `${t.date}|${t.amount}|${t.description.slice(0,20)}|${t.source}|${t.installment ? `${t.installment.current}/${t.installment.total}` : ''}`
    const n = (counts.get(key) || 0) + 1
    counts.set(key, n)
    return n <= Math.ceil((totals.get(key) || 1) / 2)
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

// Worker singleton: se inicializa una vez y se reutiliza entre PDFs
let _ocrWorker = null
let _ocrWorkerReady = false
let _ocrWorkerIdleTimer = null

async function getOcrWorker(base, onProgress, numPages) {
  const { createWorker } = await import('tesseract.js')
  if (_ocrWorker && _ocrWorkerReady) {
    // Actualizar el logger para este nuevo lote de páginas
    return _ocrWorker
  }
  _ocrWorkerReady = false
  _ocrWorker = await createWorker('spa', 1, {
    workerPath: `${base}/tesseract/worker.min.js`,
    langPath:   `${base}/lang`,
    corePath:   `${base}/tesseract-core/tesseract-core-lstm.wasm.js`,
    logger: () => {},
  })
  _ocrWorkerReady = true
  return _ocrWorker
}

async function ocrPages(arrayBuffer, numPages, onProgress) {
  const base = window.location.origin
  const worker = await getOcrWorker(base)

  // Re-open con pdfjs para renderizar páginas
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= numPages; i++) {
    onProgress?.({ stage: 'ocr', page: i, total: numPages, pct: ((i - 1) / numPages) * 100 })
    try {
      const page = await pdf.getPage(i)
      const canvas = await renderPageToCanvas(page)
      const { data: { text } } = await worker.recognize(canvas)
      fullText += text + '\n'
      // Release canvas memory immediately after OCR
      canvas.width = 0
      canvas.height = 0
      onProgress?.({ stage: 'ocr', page: i, total: numPages, pct: (i / numPages) * 100 })
    } catch { /* skip unrenderable page */ }
  }

  await pdf.destroy()

  // Schedule worker termination after 5 minutes of inactivity
  if (_ocrWorkerIdleTimer) clearTimeout(_ocrWorkerIdleTimer)
  _ocrWorkerIdleTimer = setTimeout(async () => {
    if (_ocrWorker) {
      await _ocrWorker.terminate().catch(() => {})
      _ocrWorker = null
      _ocrWorkerReady = false
      _ocrWorkerIdleTimer = null
    }
  }, 5 * 60 * 1000)

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

  // Detect whether the extracted text contains actual transaction data.
  // PDFs with < 50 text items that don't have a date+amount pattern are
  // considered scanned even if pdfjs found some metadata text items.
  const hasDatePattern   = /\b\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?\b/.test(allText)
  const hasAmountPattern = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3},\d{2}/.test(allText)
  const hasTransactionText = hasDatePattern && hasAmountPattern
  const needsOCR = textItems < 10 || (textItems < 80 && !hasTransactionText)

  // Helper: run OCR and parse result
  async function runOCR() {
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

      const ocrItems = ocrTextToItems(ocrText)
      const bank = detectBank(ocrText)
      const docBrand = detectCardBrand(ocrText.slice(0, 2000)) || (() => {
        const found = ['American Express', 'Cabal', 'Maestro', 'Mastercard', 'Visa'].filter(b => {
          const re = b === 'American Express' ? /\bamerican\s+express\b|\bamex\b/ : new RegExp(`\\b${b}\\b`, 'i')
          return re.test(ocrText)
        })
        return found.length === 1 ? found[0] : null
      })()
      const refYear = detectYear(ocrText)
      const rows = sliceToConsumosSection(groupIntoRows(ocrItems), { ocrMode: true })
      const colTxs = parseColumnar(rows, file.name, refYear, bank, docBrand)
      const rowTxs = parseRows(rows, file.name, refYear, true, bank, docBrand)
      const transactions = dedupe(colTxs.length >= rowTxs.length ? colTxs : rowTxs)
      return { bank, transactions, pageCount: pages.length, rawText: ocrText.slice(0, 2000), scanned: true, ocr: true }
    } catch (e) {
      return { bank: 'Desconocido', transactions: [], pageCount: pages.length, rawText: '', scanned: true, ocrFailed: true, ocrError: e.message }
    }
  }

  if (needsOCR) return runOCR()

  const bank = detectBank(allText)
  // Prefer first-page header for brand detection — avoids picking up brand names
  // from adjacent card sections or merchant descriptions later in the document.
  // Fall back to full text only when a single unambiguous brand is present.
  const docBrand = detectCardBrand(allText.slice(0, 2000)) || (() => {
    const found = ['American Express', 'Cabal', 'Maestro', 'Mastercard', 'Visa'].filter(b => {
      const re = b === 'American Express' ? /\bamerican\s+express\b|\bamex\b/ : new RegExp(`\\b${b}\\b`, 'i')
      return re.test(allText)
    })
    return found.length === 1 ? found[0] : null
  })()
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

  const consumosRows = sliceToConsumosSection(allPageRows)
  const colTxs = parseColumnar(consumosRows, file.name, refYear, bank, docBrand)
  const rowTxs = parseRows(consumosRows, file.name, refYear, false, bank, docBrand)
  const transactions = colTxs.length >= rowTxs.length ? colTxs : rowTxs

  // Fallback: if text parsing found nothing on a small PDF, try OCR.
  // Covers PDFs that pdfjs partially extracts (metadata only) but are
  // actually scanned images for their transaction content.
  if (transactions.length === 0 && pages.length <= 20 && onProgress) {
    return runOCR()
  }

  return {
    bank,
    transactions,
    pageCount: pages.length,
    rawText: allText.slice(0, 2000),
    pageErrors: pageErrors > 0 ? pageErrors : undefined,
  }
}
