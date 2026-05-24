import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { categorize } from './categorizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = []
    let lastY = null
    let currentLine = ''
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
        if (currentLine.trim()) lines.push(currentLine.trim())
        currentLine = item.str
      } else {
        currentLine += (currentLine ? ' ' : '') + item.str
      }
      lastY = item.transform[5]
    }
    if (currentLine.trim()) lines.push(currentLine.trim())
    pages.push(lines)
  }
  return pages
}

// Detect amount from a string: handles formats like $1.234,56 or 1234.56 or (1.234,56)
function parseAmount(str) {
  if (!str) return null
  // Remove currency symbols
  let s = str.replace(/[$ ]/g, '')
  // Negative: parentheses
  const negative = s.startsWith('(') && s.endsWith(')')
  if (negative) s = s.slice(1, -1)
  // Argentine format: 1.234,56
  if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(,\d{3})*(\.\d{2})?$/.test(s)) {
    // US format: 1,234.56
    s = s.replace(/,/g, '')
  } else {
    s = s.replace(/[^0-9.]/g, '')
  }
  const val = parseFloat(s)
  if (isNaN(val)) return null
  return negative ? -val : val
}

// Try to detect a date in various formats
function parseDate(str) {
  if (!str) return null
  // dd/mm/yyyy or dd-mm-yyyy
  let m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${year}-${month}-${day}`
  }
  // dd MMM yyyy (Spanish month names)
  const months = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' }
  m = str.toLowerCase().match(/\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[\w]*\s*(\d{2,4})?\b/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = months[m[2]]
    const year = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : new Date().getFullYear().toString()
    return `${year}-${month}-${day}`
  }
  return null
}

// Generic parser: scan all lines looking for date + description + amount patterns
function genericParse(pages, filename) {
  const transactions = []
  const amountPattern = /\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g

  for (const lines of pages) {
    for (const line of lines) {
      const date = parseDate(line)
      if (!date) continue

      const amounts = []
      let m
      amountPattern.lastIndex = 0
      while ((m = amountPattern.exec(line)) !== null) {
        const val = parseAmount(m[0])
        if (val !== null && val > 0) amounts.push({ val, index: m.index })
      }
      if (amounts.length === 0) continue

      // Take the last amount as the charge amount
      const amountStr = amounts[amounts.length - 1]

      // Description: everything between the date and the first amount
      let desc = line
        .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
        .replace(/\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (!desc || desc.length < 3) continue

      transactions.push({
        id: crypto.randomUUID(),
        date,
        description: desc,
        amount: amountStr.val,
        category: categorize(desc),
        source: filename,
        raw: line,
      })
    }
  }
  return transactions
}

// GALICIA parser
function parseGalicia(pages, filename) {
  return genericParse(pages, filename)
}

// BBVA parser
function parseBBVA(pages, filename) {
  return genericParse(pages, filename)
}

// ICBC parser
function parseICBC(pages, filename) {
  return genericParse(pages, filename)
}

function detectBank(text) {
  const t = text.toLowerCase()
  if (t.includes('galicia')) return 'Galicia'
  if (t.includes('bbva')) return 'BBVA'
  if (t.includes('icbc')) return 'ICBC'
  if (t.includes('santander')) return 'Santander'
  if (t.includes('hsbc')) return 'HSBC'
  if (t.includes('itau') || t.includes('itaú')) return 'Itaú'
  if (t.includes('ciudad')) return 'Banco Ciudad'
  if (t.includes('nacion') || t.includes('bna')) return 'Banco Nación'
  if (t.includes('patagonia')) return 'Banco Patagonia'
  if (t.includes('macro')) return 'Banco Macro'
  if (t.includes('naranja')) return 'Naranja X'
  if (t.includes('mercado pago')) return 'Mercado Pago'
  if (t.includes('american express') || t.includes('amex')) return 'Amex'
  return 'Desconocido'
}

export async function parsePDF(file) {
  const pages = await extractTextFromPDF(file)
  const allText = pages.flat().join('\n')
  const bank = detectBank(allText)

  let transactions = []
  if (bank === 'Galicia') transactions = parseGalicia(pages, file.name)
  else if (bank === 'BBVA') transactions = parseBBVA(pages, file.name)
  else if (bank === 'ICBC') transactions = parseICBC(pages, file.name)
  else transactions = genericParse(pages, file.name)

  return { bank, transactions, pageCount: pages.length }
}
