/**
 * Offline license validation using HMAC-SHA256.
 * Each key encodes a license ID (first group) + 15-char HMAC check.
 * Format: EASY-[5-hex ID]-[5]-[5]-[5]
 *
 * IMPORTANT: keep this file in a private repository — the SECRET must never
 * be published. If the repo is ever made public, rotate the secret and
 * invalidate previous keys by updating the SECRET below.
 */
const crypto = require('crypto')
const fs     = require('fs')
const path   = require('path')

const SECRET     = 'ER2025-easyresumen-7f3a8e2bc4d14f6a9e5c2b8d-private'
const TRIAL_DAYS = 30
const PDF_LIMIT  = 3
const FILE       = 'license.json'

function generateKey(licenseId) {
  const idHex = licenseId.toString(16).toUpperCase().padStart(5, '0')
  const hmac  = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  const check = hmac.digest('hex').toUpperCase().slice(0, 15)
  return `EASY-${idHex}-${check.slice(0,5)}-${check.slice(5,10)}-${check.slice(10,15)}`
}

function validateKey(key) {
  const clean = (key || '').replace(/[\s-]/g, '').toUpperCase()
  // Reassemble into expected dash format for matching
  if (clean.length !== 24) return false
  const m = (clean.slice(0,4) + '-' + clean.slice(4,9) + '-' + clean.slice(9,14) + '-' + clean.slice(14,19) + '-' + clean.slice(19,24))
    .match(/^EASY-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})$/)
  if (!m) return false
  const licenseId = parseInt(m[1], 16)
  if (licenseId < 1 || licenseId > 999999) return false
  const inputCheck = m[2] + m[3] + m[4]
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  const expected = hmac.digest('hex').toUpperCase().slice(0, 15)
  return inputCheck === expected
}

function readData(userDataPath) {
  try { return JSON.parse(fs.readFileSync(path.join(userDataPath, FILE), 'utf8')) }
  catch { return null }
}

function writeData(userDataPath, data) {
  fs.writeFileSync(path.join(userDataPath, FILE), JSON.stringify(data, null, 2))
}

function getStatus(userDataPath) {
  let data = readData(userDataPath)
  const today = new Date().toISOString().slice(0, 10)

  if (!data) {
    data = { firstLaunch: today, key: null, pdfCount: 0 }
    writeData(userDataPath, data)
  }

  if (data.key && validateKey(data.key)) {
    return { status: 'activated', key: data.key }
  }

  const elapsed   = Math.floor((Date.now() - new Date(data.firstLaunch)) / 86400000)
  const daysLeft  = Math.max(0, TRIAL_DAYS - elapsed)
  const pdfCount  = data.pdfCount || 0
  return daysLeft > 0
    ? { status: 'trial', daysLeft, pdfCount, pdfLimit: PDF_LIMIT }
    : { status: 'expired', daysLeft: 0, pdfCount, pdfLimit: PDF_LIMIT }
}

// Called before parsing each PDF. Returns { allowed, pdfCount, pdfLimit }.
// Increments counter only when within limit; activated users always get allowed=true.
function trackPDF(userDataPath) {
  const data = readData(userDataPath) || {}
  if (data.key && validateKey(data.key)) return { allowed: true }
  const count = data.pdfCount || 0
  if (count >= PDF_LIMIT) return { allowed: false, pdfCount: count, pdfLimit: PDF_LIMIT }
  data.pdfCount = count + 1
  writeData(userDataPath, data)
  return { allowed: true, pdfCount: data.pdfCount, pdfLimit: PDF_LIMIT }
}

function activate(userDataPath, key) {
  if (!validateKey(key)) {
    return { success: false, error: 'Clave inválida. Verificá que la ingresaste correctamente.' }
  }
  const data = readData(userDataPath) || {}
  data.key = key.replace(/[\s]/g, '').toUpperCase()
  data.activatedAt = new Date().toISOString().slice(0, 10)
  writeData(userDataPath, data)
  return { success: true }
}

module.exports = { generateKey, validateKey, getStatus, activate, trackPDF }
