// Script de prueba del parser — ejecutar con: node test-parser.mjs <archivo.pdf>
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import path from 'path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const file = process.argv[2]
if (!file) { console.error('Uso: node test-parser.mjs <archivo.pdf>'); process.exit(1) }

const MONTHS_ES = { ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12,enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12 }

function parseAmount(str) {
  if (!str) return null
  let s = str.replace(/\s/g,'')
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'))
  s = s.replace(/^[-()]|[()]$/g,'').replace(/^[A-Z$€£¥]{1,3}\.?/,'')
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g,'').replace(',','.')
  else if (/^\d+(,\d{1,2})$/.test(s)) s = s.replace(',','.')
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g,'')
  else {
    s = s.replace(/[^0-9.,]/g,'')
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',','.')
      else s = s.replace(/,/g,'')
    } else if (s.includes(',')) {
      const parts = s.split(',')
      s = parts.length===2 && parts[1].length<=2 ? s.replace(',','.') : s.replace(/,/g,'')
    }
  }
  const val = parseFloat(s)
  return isNaN(val)||val<=0 ? null : (neg?-val:val)
}

function parseDate(str, yr) {
  if (!str) return null
  let m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/)
  if (m) { const y=m[3].length===2?2000+parseInt(m[3]):parseInt(m[3]); return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` }
  m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
  if (m) return `${yr}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  m = str.toLowerCase().match(/\b(\d{1,2})\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b/)
  if (m) { const mo=MONTHS_ES[m[2]]; if(mo) return `${yr}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}` }
  return null
}

function groupIntoRows(items, yTol=3) {
  const rows = []
  for (const item of items) {
    if (!item.str.trim()) continue
    const y = Math.round(item.transform[5])
    const x = item.transform[4]
    let row = rows.find(r => Math.abs(r.y-y)<=yTol)
    if (!row) { row={y,items:[]}; rows.push(row) }
    row.items.push({x,text:item.str.trim()})
  }
  return rows.sort((a,b)=>b.y-a.y).map(r=>({y:r.y,text:r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '),cols:r.items.sort((a,b)=>a.x-b.x)}))
}

const AMT_RE = /(?:^|\s)(-?\(?\$\s*\d[\d.,]*|\(?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\)?|-?\(?\d+,\d{2}\)?|-?\(?\d{5,}\)?)(?=\s|$)/g
function findAmounts(text) {
  const results=[]; let m; AMT_RE.lastIndex=0
  while((m=AMT_RE.exec(text))!==null){const val=parseAmount(m[1]);if(val!==null&&val!==0)results.push({raw:m[1].trim(),val,index:m.index})}
  return results
}

async function main() {
  const data = new Uint8Array(readFileSync(file))
  const pdf = await pdfjsLib.getDocument({data}).promise
  console.log(`\n📄 PDF: ${path.basename(file)} — ${pdf.numPages} páginas\n`)

  let allTx = []
  for (let p=1; p<=pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const rows = groupIntoRows(content.items)

    const yr = new Date().getFullYear()
    let pageTx = 0

    console.log(`\n── Página ${p} (${rows.length} filas) ──`)
    for (let i=0; i<Math.min(rows.length,5); i++) {
      console.log(`  [${rows[i].y}] ${rows[i].text.slice(0,100)}`)
    }

    for (let i=0; i<rows.length; i++) {
      const row = rows[i]
      const date = parseDate(row.text, yr)
      if (!date) continue
      let amounts = findAmounts(row.text)
      if (amounts.length===0 && i+1<rows.length) amounts = findAmounts(rows[i+1].text)
      if (amounts.length===0) continue
      const amount = amounts[amounts.length-1].val
      let desc = row.text.replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g,'').replace(AMT_RE,' ').replace(/\s+/g,' ').trim()
      desc = desc.replace(/^[\s\-\.\|\/]+|[\s\-\.\|\/]+$/g,'').trim()
      if (!desc||desc.length<3) continue
      desc = desc.replace(/^\$\s*|\s*\$\s*$/g, '').replace(/\s+/g, ' ').trim()
      if (!desc || desc.length < 3) continue
      if (/^(total|subtotal|saldo|pago|vencimiento|fecha|cuota|resumen|periodo|nro\.?|tarjeta|titular|nombre|cuenta|numero|operacion)/i.test(desc)) continue
      allTx.push({date,desc,amount:Math.abs(amount)})
      pageTx++
    }
    console.log(`  → ${pageTx} transacciones encontradas en esta página`)
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`TOTAL: ${allTx.length} transacciones\n`)
  allTx.slice(0,20).forEach(t => {
    console.log(`  ${t.date}  $${t.amount.toFixed(2).padStart(12)}  ${t.desc.slice(0,50)}`)
  })
  if (allTx.length>20) console.log(`  ... y ${allTx.length-20} más`)
}

main().catch(console.error)
