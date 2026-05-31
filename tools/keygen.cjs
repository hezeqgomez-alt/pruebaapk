#!/usr/bin/env node
/**
 * EasyResumen — License Key Generator
 * Usage:
 *   node tools/keygen.cjs 1          → key for license #1
 *   node tools/keygen.cjs 1 10       → keys for #1 through #10
 *   node tools/keygen.cjs validate EASY-00001-ABCDE-FGHIJ-KLMNO
 *
 * NEVER share or publish this file. Keep it in the private repo only.
 */
const { generateKey, validateKey } = require('../electron/license.cjs')

const [,, cmd, end] = process.argv

if (cmd === 'validate') {
  const key = end
  console.log(validateKey(key) ? `✅ Valid: ${key}` : `❌ Invalid: ${key}`)
  process.exit(0)
}

const from = parseInt(cmd)
const to   = end ? parseInt(end) : from

if (isNaN(from) || isNaN(to) || from < 1) {
  console.log('Usage:')
  console.log('  node tools/keygen.cjs <id>            Generate single key')
  console.log('  node tools/keygen.cjs <from> <to>     Generate range of keys')
  console.log('  node tools/keygen.cjs validate <key>  Validate a key')
  process.exit(1)
}

for (let id = from; id <= to; id++) {
  console.log(`#${String(id).padStart(5, '0')}  ${generateKey(id)}`)
}
