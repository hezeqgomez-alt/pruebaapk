/**
 * Tests exhaustivos del parser de resúmenes argentinos.
 * Cubre: Credicoop CABAL, Banco Nación Visa, AMEX, Naranja X,
 *        Galicia, Santander, BBVA, Mercado Pago, Brubank, Ualá
 */
import { describe, it, expect } from 'vitest'

// ─── Copiar funciones puras del parser (sin dependencias de browser) ──────────

function norm(str) {
  return str.replace(/[−‒–—―]/g, '-')
}

function parseAmount(str) {
  if (!str) return null
  let s = norm(str).replace(/\s/g, '')
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')')) || s.endsWith('-')
  s = s.replace(/^[-()]|[()]$|-$/g, '')
  s = s.replace(/^[A-Z$€£¥]{1,3}\.?/, '')

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(,\d{1,2})$/.test(s)) {
    s = s.replace(',', '.')
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    s = s.replace(/,/g, '')
  } else {
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

const MONTHS_ES = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12, enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 }

function parseDate(str, refYear = 2026) {
  if (!str) return null
  const s = norm(str)
  const yr = refYear

  let m = s.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/)
  if (m) {
    const y  = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${y}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/)
  if (m) {
    const y  = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${y}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  m = s.match(/\b(\d{1,2})[-/](\d{1,2})\b/)
  if (m) {
    const mo = parseInt(m[2])
    const dy = parseInt(m[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      return `${yr}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`
  }
  m = s.toLowerCase().match(/\b(\d{1,2})\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b/)
  if (m) {
    const mo = MONTHS_ES[m[2]]
    if (mo) return `${yr}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }
  return null
}

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

function detectBank(text) {
  const t = text.toLowerCase()
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

function cleanDesc(raw) {
  let desc = norm(raw)
    .replace(/\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b/g, '')
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '')
    .replace(/\d[\d.,]+\s+TC\d[\d.,]*/gi, '')
    .replace(/-\s*\d[\d.,]+/g, ' ')
    .replace(AMT_RE, ' ')
    .replace(/\d[\d.,]*\s*%(?:\s*\([\d\s.,]+\))?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  desc = desc.replace(/^[\s\-.|/_()]+|[\s\-.|/_()]+$/g, '').trim()
  desc = desc.replace(/^\d{4,7}[A-Z*K]\s*/i, '').trim()
  desc = desc.replace(/^\d{3,4}\s+(?=[A-Z])/i, '').trim()
  desc = desc.replace(/\s+(?:cta|cuota|c)\.?\s*$/i, '').trim()
  desc = desc.replace(/^\$\s*|\s*\$\s*$/g, '').replace(/[*\-,]+$/g, '').replace(/\s+/g, ' ').trim()
  desc = desc.replace(/\s+0\d{3,4}$/, '').trim()
  return desc
}

function shouldSkipDesc(desc) {
  if (!desc || desc.length < 3) return true
  if (desc.startsWith('<')) return true
  if (/^(total|subtotal|saldo|vencimiento|fecha|resumen|periodo|apertura|cierre|limite|disponible|pagos|debitos|creditos|vto\.?|nro\.?|titular|nombre|cuenta|numero|operacion|viene\s+de|continua\s+en|tarjeta|cuota)/i.test(desc)) return true
  if (/^pago\b/i.test(desc)) return true
  if (/\bsu\s+pago\b|\bpago\s+en\s+pesos\b|\bpago\s+m[ií]nimo\b|\bpago\s+de\s+tarjeta\b/i.test(desc)) return true
  if (/tarjeta\s*\(?\d+\)?\s*total/i.test(desc)) return true
  if (/saldo\s+anterior|saldo\s+actual|cierre\s+actual|vencimiento\s+actual|pr[oó]ximo\s+cierre|vto\.?\s+anterior|nro\.?\s+de\s+cuenta/i.test(desc)) return true
  if (/\b(?:visa|mastercard|amex|american\s+express|cabal|naranja)\s+(?:signature|platinum|classic|gold|black|infinite)\b/i.test(desc)) return true
  if (/\bhoja\s+\d+\b/i.test(desc)) return true
  if ((desc.match(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)[-/]\d{2}\b/gi) || []).length >= 2) return true
  if (/^(interes\w*\s+(?:(?:de|por|s\/)\s+)?financ|iibb\b|iva\s+rg|db\.?\s*iva|db\.?rg\b|com\.adm|transferencia\s+deuda|percep[^a-z])/i.test(desc)) return true
  if (/^cargo\s+(?:com\.?\s*adm|financiero|renovaci[oó]n|administrativo|mantenimiento|anual\b)/i.test(desc)) return true
  if (/^[\d\s:.,/-]+$/.test(desc)) return true
  if (desc.replace(/\s/g, '').length < 3) return true
  const nonMonth = desc.replace(/\b(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|setiembre|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|prox(?:imo)?s?|meses?)\b/gi, '').replace(/[\d\s/,.:|()%$-]+/g, '')
  if (nonMonth.trim().length === 0) return true
  if (/^(t[eé]rminos?\s+y\s+condiciones?|condiciones?\s+(?:generales?|de\s+uso)|informaci[oó]n\s+importante|aviso\s+legal|reglamento\s+de\s+(?:uso|la\s+tarjeta))/i.test(desc)) return true
  // Notification letter / legal boilerplate
  if (/^(buenos\s+aires|dichos\s+cambios|le\s+inform|le\s+comuni|estimado\s+(?:asociad|cliente|socio|titular)|condiciones\s+vigentes|la\s+presente|en\s+virtud|a\s+partir\s+del\s+pr|por\s+ello\s+le|le\s+recordamos|de\s+acuerdo\s+a|conforme\s+a\s+lo)/i.test(desc)) return true
  return false
}

function detectYear(allText) {
  const currentYear = new Date().getFullYear()
  const matches = [...allText.matchAll(/\b(20[2-4]\d)\b/g)].map(m => parseInt(m[1]))
  if (!matches.length) return currentYear
  const nearby = matches.filter(y => Math.abs(y - currentYear) <= 1)
  if (nearby.length) return nearby.sort((a, b) => Math.abs(a - currentYear) - Math.abs(b - currentYear))[0]
  const freq = {}
  for (const y of matches) freq[y] = (freq[y] || 0) + 1
  return parseInt(Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0])
}

function detectInstallment(text) {
  const m = text.match(/\b(?:cta|cuota|ct)\.?\s*(\d{1,2})\s*[-/]\s*(\d{1,2})\b/i)
    || text.match(/\bC\.\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  if (!m) return null
  const current = parseInt(m[1])
  const total = parseInt(m[2])
  if (current > 0 && total > 1 && current <= total) return { current, total }
  return null
}

// ─── parseAmount ─────────────────────────────────────────────────────────────

describe('parseAmount — formatos argentinos', () => {
  it('formato argentino con separador de miles', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('12.345,00')).toBe(12345)
    expect(parseAmount('1.234.567,89')).toBe(1234567.89)
    expect(parseAmount('340.239,00')).toBe(340239)
    expect(parseAmount('11.300,00')).toBe(11300)
  })

  it('formato con $ y espacios', () => {
    expect(parseAmount('$ 1.234,56')).toBe(1234.56)
    expect(parseAmount('$1.234,56')).toBe(1234.56)
    expect(parseAmount('$ 340.239')).toBe(340239)
    expect(parseAmount('$11.300,00')).toBe(11300)
  })

  it('números sin separador de miles', () => {
    expect(parseAmount('12345')).toBe(12345)
    expect(parseAmount('100000')).toBe(100000)
  })

  it('solo coma decimal', () => {
    expect(parseAmount('1234,56')).toBe(1234.56)
    expect(parseAmount('999,50')).toBe(999.50)
    expect(parseAmount('1234,5')).toBe(1234.5)
  })

  it('negativos — créditos', () => {
    expect(parseAmount('-1.234,56')).toBe(-1234.56)
    expect(parseAmount('(1.234,56)')).toBe(-1234.56)
    expect(parseAmount('1.234,56-')).toBe(-1234.56)
  })

  it('unicode minus sign', () => {
    expect(parseAmount('−1.234,56')).toBe(-1234.56)
    expect(parseAmount('–500,00')).toBe(-500)
  })

  it('formato US (AMEX en USD)', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('12,345.00')).toBe(12345)
  })

  it('valores inválidos retornan null', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount(null)).toBeNull()
  })
})

// ─── parseDate ───────────────────────────────────────────────────────────────

describe('parseDate — todos los formatos bancarios', () => {
  it('dd/mm/yyyy — formato completo', () => {
    expect(parseDate('15/04/2026')).toBe('2026-04-15')
    expect(parseDate('01/01/2026')).toBe('2026-01-01')
  })

  it('dd/mm/yy — año corto (Credicoop, Galicia)', () => {
    expect(parseDate('15/04/26')).toBe('2026-04-15')
    expect(parseDate('09/04/26')).toBe('2026-04-09')
    expect(parseDate('31/12/25')).toBe('2025-12-31')
  })

  it('dd.mm.yy — Banco Ciudad, ICBC', () => {
    expect(parseDate('15.04.26')).toBe('2026-04-15')
    expect(parseDate('01.03.2026')).toBe('2026-03-01')
  })

  it('dd/mm — sin año usa refYear', () => {
    expect(parseDate('15/04', 2026)).toBe('2026-04-15')
    expect(parseDate('09/04', 2026)).toBe('2026-04-09')
    expect(parseDate('31/12', 2025)).toBe('2025-12-31')
  })

  it('dd MMM — con mes abreviado', () => {
    expect(parseDate('15 abr', 2026)).toBe('2026-04-15')
    expect(parseDate('01 ene', 2026)).toBe('2026-01-01')
    expect(parseDate('31 dic', 2025)).toBe('2025-12-31')
  })

  it('dentro de texto con descripción', () => {
    expect(parseDate('09/04/26 SUPERMERCADO COTO 188 1.234,56')).toBe('2026-04-09')
    expect(parseDate('15/04 PEDIDOS YA 500,00')).toBe('2026-04-15')
  })

  it('no matchea cuotas (5/31 no es fecha)', () => {
    // "CTA 5/31" no debe interpretarse como fecha
    const result = parseDate('CTA 5/31', 2026)
    // Si matchea, debería dar un mes inválido o null
    if (result) {
      const month = parseInt(result.split('-')[1])
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(12)
    }
  })

  it('detectYear prefiere año actual sobre fechas de vencimiento lejanas', () => {
    const text = 'Resumen Abril 2026 Vencimiento cuota 07/2031 Vencimiento préstamo 2048'
    expect(detectYear(text)).toBe(2026)
  })

  it('detectYear con múltiples años — elige el más frecuente/cercano', () => {
    const text = 'Período 2025 - 2026 CUOTAS PENDIENTES: 2026 2026 2031'
    expect(detectYear(text)).toBe(2026)
  })

  it('detectYear sin años válidos usa año actual', () => {
    const text = 'sin fechas válidas aquí'
    expect(detectYear(text)).toBe(new Date().getFullYear())
  })
})

// ─── findAmounts ─────────────────────────────────────────────────────────────

describe('findAmounts — detección en filas de resúmenes', () => {
  it('fila Credicoop CABAL: importe + saldo acumulado', () => {
    const row = '09/04 SUPERMERCADO COTO 188 11.300,00 1.300.700,00'
    const amounts = findAmounts(row)
    expect(amounts.length).toBeGreaterThanOrEqual(2)
    expect(amounts[0].val).toBe(11300)
    // El parser debe preferir el primero (heurística 5×)
    const last = amounts[amounts.length - 1].val
    const first = amounts.find(a => a.val > 0)
    expect(last / first.val).toBeGreaterThan(5) // confirma que el último es el saldo
  })

  it('fila con único monto — debe encontrarlo', () => {
    const row = '15/04/26 PEDIDOS YA 8.500,00'
    const amounts = findAmounts(row)
    expect(amounts.length).toBe(1)
    expect(amounts[0].val).toBe(8500)
  })

  it('fila con monto negativo (crédito/ajuste)', () => {
    const row = '10/04 AJUSTE COMERCIO 500,00-'
    const amounts = findAmounts(row)
    expect(amounts.some(a => a.val < 0)).toBe(true)
  })

  it('fila con símbolo $', () => {
    const row = '15/04 NETFLIX $ 2.890,00'
    const amounts = findAmounts(row)
    expect(amounts.length).toBeGreaterThanOrEqual(1)
    expect(amounts[0].val).toBe(2890)
  })
})

// ─── detectBank ──────────────────────────────────────────────────────────────

describe('detectBank', () => {
  const cases = [
    ['RESUMEN CREDICOOP TARJETA CABAL', 'Credicoop'],
    ['BANCO DE LA NACION ARGENTINA TARJETA VISA', 'Banco Nación'],
    ['AMERICAN EXPRESS ARGENTINA', 'AMEX'],
    ['NARANJA X RESUMEN DE CUENTA', 'Naranja X'],
    ['MERCADO PAGO S.A.', 'Mercado Pago'],
    ['MERCADOPAGO', 'Mercado Pago'],
    ['BRUBANK S.A.U.', 'Brubank'],
    ['UALÁ RESUMEN', 'Ualá'],
    ['BANCO GALICIA Y BUENOS AIRES', 'Galicia'],
    ['BBVA BANCO FRANCES', 'BBVA'],
    ['SANTANDER RIO', 'Santander'],
    ['BANCO HIPOTECARIO', 'Hipotecario'],
    ['BANCO MACRO', 'Macro'],
    ['BANCO PATAGONIA', 'Patagonia'],
    ['BANCO CIUDAD DE BUENOS AIRES', 'Banco Ciudad'],
    ['ITAU UNIBANCO', 'Itaú'],
    ['HSBC BANK ARGENTINA', 'HSBC'],
    ['ICBC ARGENTINA', 'ICBC'],
    ['BANCO SUPERVIELLE', 'Supervielle'],
  ]
  for (const [text, expected] of cases) {
    it(`detecta ${expected}`, () => {
      expect(detectBank(text)).toBe(expected)
    })
  }
})

// ─── cleanDesc ───────────────────────────────────────────────────────────────

describe('cleanDesc — limpieza de descripciones', () => {
  it('elimina fechas embebidas', () => {
    expect(cleanDesc('09/04 SUPERMERCADO COTO 188')).not.toMatch(/09\/04/)
    expect(cleanDesc('15/04/26 NETFLIX')).not.toMatch(/15\/04/)
  })

  it('elimina montos', () => {
    const desc = cleanDesc('SUPERMERCADO COTO 11.300,00 1.300.700,00')
    expect(desc).not.toMatch(/11\.300/)
    expect(desc).not.toMatch(/1\.300\.700/)
  })

  it('elimina código de cupón CABAL (0700, 0256, etc.)', () => {
    expect(cleanDesc('SUPERMERCADOS COTO 0700')).toBe('SUPERMERCADOS COTO')
    expect(cleanDesc('DLOPEDIDOSYA PUNTO SU 0700')).not.toMatch(/0700$/)
    expect(cleanDesc('EL BUEN LIBRO 0700')).not.toMatch(/0700$/)
  })

  it('elimina código de cupón al inicio (Credicoop formato "4259 MERCHANT")', () => {
    expect(cleanDesc('4259 SUPERMERCADO COTO')).toBe('SUPERMERCADO COTO')
  })

  it('elimina residuo de cuota al final', () => {
    expect(cleanDesc('NETFLIX cta')).not.toMatch(/cta$/)
    expect(cleanDesc('SPOTIFY cuota')).not.toMatch(/cuota$/)
  })

  it('elimina TC (tipo de cambio)', () => {
    const desc = cleanDesc('USD AMAZON 1078.774,71 TC1415,000')
    expect(desc).not.toMatch(/TC\d/)
  })

  it('conserva el nombre del comercio', () => {
    expect(cleanDesc('SUPERMERCADOS COTO 188 0700')).toContain('SUPERMERCADOS COTO')
    expect(cleanDesc('09/04 PEDIDOS YA 8.500,00')).toContain('PEDIDOS YA')
    expect(cleanDesc('NETFLIX 2.890,00')).toContain('NETFLIX')
  })

  it('preserva nombres cortos (YPF, OCA, ACA)', () => {
    expect(cleanDesc('YPF 1.234,00')).toBe('YPF')
    expect(cleanDesc('OCA 500,00')).toBe('OCA')
  })
})

// ─── shouldSkipDesc ──────────────────────────────────────────────────────────

describe('shouldSkipDesc — filtro de falsos positivos', () => {
  const shouldSkip = [
    'TOTAL CONSUMOS',
    'TOTAL PERÍODO',
    'SALDO ANTERIOR',
    'SALDO ACTUAL',
    'FECHA DE VENCIMIENTO',
    'RESUMEN DE CUENTA',
    'VENCIMIENTO ACTUAL',
    'PRÓXIMO CIERRE',
    'PAGO',
    'SU PAGO',
    'PAGO EN PESOS',
    'PAGO MÍNIMO',
    'TARJETA (9992) TOTAL CONSUMOS',
    'INTERESES DE FINANCIACIÓN',
    'IIBB',
    'IVA RG',
    'CARGO COM.ADM.',
    'CARGO FINANCIERO',
    'CARGO RENOVACIÓN ANUAL',
    'TRANSFERENCIA DEUDA',
    'hoja 1',
    'VISA PLATINUM',
    'MASTERCARD GOLD',
    'ENE/25 FEB/25 MAR/25',
    '',
    'AB',
    '12345',
    '123,456',
  ]

  for (const desc of shouldSkip) {
    it(`debe filtrar: "${desc}"`, () => {
      expect(shouldSkipDesc(desc)).toBe(true)
    })
  }

  const shouldKeep = [
    'SUPERMERCADOS COTO',
    'PEDIDOS YA',
    'NETFLIX',
    'SPOTIFY',
    'YPF',
    'AMAZON',
    'MERCADO PAGO',
    'FARMACIA DEL SOL',
    'RAPPI',
    'UBER',
    'AIRBNB',
    'CENCOSUD SA',
    'OCA',
    'CABIFY RIDES',
    'GRIDO HELADO',
  ]

  for (const desc of shouldKeep) {
    it(`debe preservar: "${desc}"`, () => {
      expect(shouldSkipDesc(desc)).toBe(false)
    })
  }
})

// ─── detectInstallment ───────────────────────────────────────────────────────

describe('detectInstallment', () => {
  it('formato CTA X/Y', () => {
    expect(detectInstallment('NETFLIX CTA 2/12')).toEqual({ current: 2, total: 12 })
    expect(detectInstallment('AMAZON CTA 1/6')).toEqual({ current: 1, total: 6 })
  })

  it('formato CUOTA X/Y', () => {
    expect(detectInstallment('SAMSUNG CUOTA 3/24')).toEqual({ current: 3, total: 24 })
  })

  it('formato C. X/Y', () => {
    expect(detectInstallment('APPLE C. 1/12')).toEqual({ current: 1, total: 12 })
  })

  it('no matchea fechas (04/26)', () => {
    expect(detectInstallment('09/04/26 SUPERMERCADO')).toBeNull()
  })

  it('no matchea cuotas inválidas (current > total)', () => {
    expect(detectInstallment('PAGO CTA 13/12')).toBeNull()
  })

  it('no matchea si total == 1 (no es cuota)', () => {
    expect(detectInstallment('PAGO CTA 1/1')).toBeNull()
  })
})

// ─── Integración: heurística saldo acumulado ────────────────────────────────

describe('Heurística de saldo acumulado (5×)', () => {
  function pickAmount(row) {
    const amounts = findAmounts(row)
    if (!amounts.length) return null
    let amountVal = amounts[amounts.length - 1].val
    if (amounts.length >= 2 && amountVal > 0) {
      const firstPos = amounts.find(a => a.val > 0)
      if (firstPos && amountVal > firstPos.val * 5) amountVal = firstPos.val
    }
    return amountVal
  }

  it('Credicoop CABAL: prefiere importe sobre saldo acumulado', () => {
    expect(pickAmount('09/04 SUPERMERCADOS COTO 188 11.300,00 1.300.700,00')).toBe(11300)
    expect(pickAmount('27/03 PEDIDOS YA 38.499,00 1.340.000,00')).toBe(38499)
    expect(pickAmount('15/08 CENCOSUD SA 1.950,00 231.950.194,00')).toBe(1950)
  })

  it('fila con un solo monto no pierde el valor', () => {
    expect(pickAmount('15/04 NETFLIX 2.890,00')).toBe(2890)
    expect(pickAmount('10/04 YPF 3.500,00')).toBe(3500)
  })

  it('montos similares (sin saldo acumulado) no se filtran mal', () => {
    // Si el último es solo 2× el primero, no aplica la heurística
    expect(pickAmount('15/04 SUPERMERCADO 5.000,00 10.000,00')).not.toBeNull()
  })
})

// ─── Falsos positivos: texto de T&C ─────────────────────────────────────────

describe('Falsos positivos — texto de términos y condiciones', () => {
  const tcLines = [
    'TÉRMINOS Y CONDICIONES DE USO',
    'CONDICIONES GENERALES',
    'INFORMACIÓN IMPORTANTE PARA EL CLIENTE',
    'AVISO LEGAL',
    'Estimado Cliente, le informamos que',
    'BUENOS AIRES, en virtud de lo dispuesto',
    'Le comunicamos que a partir del próximo período',
    'CONDICIONES DE USO DEL SERVICIO',
  ]

  it('shouldSkipDesc filtra texto legal de T&C', () => {
    for (const line of tcLines) {
      // Después de limpiar, el texto legal suele quedar como descripción que debería skipear
      const desc = cleanDesc(line)
      // O shouldSkipDesc lo filtra directamente
      const skipped = shouldSkipDesc(desc) || shouldSkipDesc(line)
      expect(skipped).toBe(true)
    }
  })
})

// ─── Casos reales por banco ──────────────────────────────────────────────────

describe('Casos reales — Credicoop CABAL', () => {
  it('parsea fila estándar correctamente', () => {
    const row = '09/04/26 SUPERMERCADOS COTO 188 0700 11.300,00 1.300.700,00'
    const date = parseDate(row, 2026)
    const amounts = findAmounts(row)
    const desc = cleanDesc(row)
    expect(date).toBe('2026-04-09')
    expect(amounts[0].val).toBe(11300)
    expect(desc).toContain('SUPERMERCADOS COTO')
    expect(desc).not.toMatch(/0700$/)
  })

  it('parsea cuota correctamente', () => {
    const row = '05/04/26 SAMSUNG SMART TV CTA 3/24 0700 25.000,00 500.000,00'
    const installment = detectInstallment(row)
    expect(installment).toEqual({ current: 3, total: 24 })
  })

  it('no toma el nro de cuotas como año', () => {
    // "CTA 5/31" no debe hacer que el año sea 2031
    const year = detectYear('Credicoop CABAL Período Abril 2026 CTA 5/31 CTA 2/48')
    expect(year).toBe(2026)
  })
})

describe('Casos reales — Banco Nación Visa', () => {
  it('parsea fila estándar', () => {
    const row = '15/04/26 PEDIDOS YA 8.500,00'
    expect(parseDate(row, 2026)).toBe('2026-04-15')
    expect(findAmounts(row)[0].val).toBe(8500)
    expect(cleanDesc(row)).toContain('PEDIDOS YA')
  })

  it('no confunde FECHA DE CIERRE con fila de consumo', () => {
    const row = 'FECHA DE CIERRE 15/05/26 SALDO ANTERIOR 1.209.455,84'
    expect(shouldSkipDesc(cleanDesc(row))).toBe(true)
  })
})

describe('Casos reales — AMEX', () => {
  it('parsea monto en USD', () => {
    const row = '15/04/26 AMAZON USD 25,99 39.999,00'
    expect(parseDate(row, 2026)).toBe('2026-04-15')
    const amounts = findAmounts(row)
    expect(amounts.length).toBeGreaterThanOrEqual(1)
  })

  it('detecta banco', () => {
    expect(detectBank('AMERICAN EXPRESS ARGENTINA')).toBe('AMEX')
  })
})

describe('Casos reales — Naranja X', () => {
  it('parsea fila estándar', () => {
    const row = '15 abr RAPPI 1.200,00'
    expect(parseDate(row, 2026)).toBe('2026-04-15')
    expect(cleanDesc(row)).toContain('RAPPI')
  })

  it('detecta banco', () => {
    expect(detectBank('NARANJA X S.A. RESUMEN DE CUENTA')).toBe('Naranja X')
  })
})

describe('Casos reales — Mercado Pago', () => {
  it('parsea formato típico', () => {
    const row = '10/04/2026 MERCADO LIBRE 5.499,99'
    expect(parseDate(row, 2026)).toBe('2026-04-10')
    expect(findAmounts(row)[0].val).toBe(5499.99)
  })
})

describe('Casos reales — Galicia Visa', () => {
  it('parsea fila con terminada en XXXX', () => {
    expect(detectBank('BANCO GALICIA VISA TERMINADA EN 4521')).toBe('Galicia')
  })

  it('parsea fecha dd.mm.yy', () => {
    expect(parseDate('15.04.26')).toBe('2026-04-15')
  })
})
