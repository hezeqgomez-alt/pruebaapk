// Test harness: runs the real parser pipeline against statement PDFs in Node.
// Usage: node scripts/test-parser.mjs [--verbose] [pdf...]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const UPLOADS = '/root/.claude/uploads/acdae504-7300-5b03-b4c9-5f46a75fb18b'

// ── Load parser source with Vite-specific imports stripped, export internals ──
let src = readFileSync(path.join(ROOT, 'src/utils/pdfParser.js'), 'utf8')
src = src
  .replace(/^import \* as pdfjsLib from 'pdfjs-dist'$/m, '')
  .replace(/^import workerUrl from .*$/m, '')
  .replace(/^pdfjsLib\.GlobalWorkerOptions.*$/m, '')
  .replace(/^import \{ categorize \} from '\.\/categorizer'$/m,
           `import { categorize } from '${ROOT}/src/utils/categorizer.js'`)
// Cut everything from the OCR section onward (needs DOM/canvas) but keep main-entry helpers we re-implement here
src = src.slice(0, src.indexOf('// ─── OCR for scanned PDFs'))
src += `\nexport { groupIntoRows, parseRows, parseColumnar, sliceToConsumosSection, detectBank, detectCardBrand, detectYear, dedupe, cleanDesc, shouldSkipDesc, parseAmount, parseDate }\n`
const tmpMod = '/tmp/parser-under-test.mjs'
writeFileSync(tmpMod, src)
const P = await import(tmpMod)

// ── pdfjs text extraction (legacy build for Node) ──
const pdfjs = await import(path.join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs'))

async function extractPages(file) {
  const data = new Uint8Array(readFileSync(file))
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items)
  }
  await pdf.destroy()
  return pages
}

// ── Replicate parsePDF main flow (text-layer path) ──
function runParser(pages, filename) {
  const allText = pages.flat().map(i => i.str).join(' ')
  const bank = P.detectBank(allText)
  const docBrand = P.detectCardBrand(allText.slice(0, 2000)) || (() => {
    const found = ['American Express', 'Cabal', 'Maestro', 'Mastercard', 'Visa'].filter(b => {
      const re = b === 'American Express' ? /\bamerican\s+express\b|\bamex\b/ : new RegExp(`\\b${b}\\b`, 'i')
      return re.test(allText)
    })
    return found.length === 1 ? found[0] : null
  })()
  const refYear = P.detectYear(allText)
  const allPageRows = []
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const rows = P.groupIntoRows(pages[pageIdx])
    const yOffset = (pages.length - 1 - pageIdx) * 100000
    for (const row of rows) allPageRows.push({ ...row, y: row.y + yOffset })
  }
  allPageRows.sort((a, b) => b.y - a.y)
  const consumosRows = P.sliceToConsumosSection(allPageRows)
  const colTxs = P.parseColumnar(consumosRows, filename, refYear, bank, docBrand)
  const rowTxs = P.parseRows(consumosRows, filename, refYear, false, bank, docBrand)
  const winner = colTxs.length >= rowTxs.length ? 'columnar' : 'rows'
  const transactions = winner === 'columnar' ? colTxs : rowTxs
  return { bank, docBrand, refYear, transactions, winner, colCount: colTxs.length, rowCount: rowTxs.length }
}

// ── Run ──
const verbose = process.argv.includes('--verbose')
const args = process.argv.slice(2).filter(a => a !== '--verbose')
const files = args.length ? args : readdirSync(UPLOADS).filter(f => f.endsWith('.pdf')).map(f => path.join(UPLOADS, f))

const fmt = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

for (const file of files) {
  const name = path.basename(file)
  const t0 = performance.now()
  let pages
  try { pages = await extractPages(file) } catch (e) { console.log(`\n✗ ${name}: extract failed: ${e.message}`); continue }
  const tExtract = performance.now() - t0
  const t1 = performance.now()
  const r = runParser(pages, name)
  const tParse = performance.now() - t1

  const debits = r.transactions.filter(t => t.type === 'debit')
  const credits = r.transactions.filter(t => t.type === 'credit')
  const total = debits.reduce((s, t) => s + t.amount, 0)
  const byCat = {}
  for (const t of debits) byCat[t.category] = (byCat[t.category] || 0) + 1
  const otros = byCat.otros || 0

  console.log(`\n══ ${name}`)
  console.log(`   bank=${r.bank}  brand=${r.docBrand}  year=${r.refYear}  winner=${r.winner} (col=${r.colCount} row=${r.rowCount})`)
  console.log(`   pages=${pages.length}  extract=${tExtract.toFixed(0)}ms  parse=${tParse.toFixed(0)}ms`)
  console.log(`   tx=${r.transactions.length} (${debits.length} debit / ${credits.length} credit)  totalDebits=$${fmt(total)}  sinCategoria=${otros}/${debits.length}`)
  // Red flags
  const flags = []
  for (const t of r.transactions) {
    if (t.amount > 20_000_000) flags.push(`MONTO SOSPECHOSO: ${t.date} ${t.description} $${fmt(t.amount)}`)
    if (/\d{5,}/.test(t.description)) flags.push(`DESC CON CODIGO: ${t.date} "${t.description}" $${fmt(t.amount)}`)
    if (t.description.length < 4) flags.push(`DESC CORTA: ${t.date} "${t.description}" $${fmt(t.amount)}`)
    const d = new Date(t.date + 'T00:00:00')
    if (isNaN(d) || t.date.slice(5, 7) === '00') flags.push(`FECHA INVALIDA: ${t.date} ${t.description}`)
  }
  for (const f of [...new Set(flags)].slice(0, 10)) console.log(`   ⚠ ${f}`)
  if (verbose) {
    for (const t of r.transactions) {
      const inst = t.installment ? ` [${t.installment.current}/${t.installment.total}]` : ''
      const fx = t.originalCurrency ? ` (${t.originalCurrency} ${t.originalAmount})` : ''
      console.log(`   ${t.date} ${t.type === 'credit' ? 'CR' : '  '} $${fmt(t.amount).padStart(14)} ${t.category.padEnd(15)} ${t.description}${inst}${fx} | ${t.source}`)
    }
  }
}
