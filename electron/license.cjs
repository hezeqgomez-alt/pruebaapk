/**
 * License management — online validation via Supabase with offline fallback.
 *
 * Flow:
 *   1. On activate: call /api/license/activate with key + deviceHash
 *   2. On status check: if activated key stored locally, verify online (72h grace if offline)
 *   3. Trial: 30 days from firstLaunch, max 3 PDFs
 *
 * IMPORTANT: keep this file in a private repository.
 */
const crypto = require('crypto')
const fs     = require('fs')
const path   = require('path')
const os     = require('os')

const SECRET      = 'ER2025-easyresumen-7f3a8e2bc4d14f6a9e5c2b8d-private'
const TRIAL_DAYS  = 30
const PDF_LIMIT   = 3
const FILE        = 'license.json'
const GRACE_MS    = 72 * 60 * 60 * 1000   // 72h offline grace period
const API_BASE    = process.env.LICENSE_API_URL || 'https://easyresumen.vercel.app'

// ─── HMAC key validation (offline) ───────────────────────────────────────────

function validateKey(key) {
  const clean = (key || '').replace(/[\s-]/g, '').toUpperCase()
  if (clean.length !== 24) return false
  const fmt = `${clean.slice(0,4)}-${clean.slice(4,9)}-${clean.slice(9,14)}-${clean.slice(14,19)}-${clean.slice(19,24)}`
  const m = fmt.match(/^EASY-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})$/)
  if (!m) return false
  const licenseId = parseInt(m[1], 16)
  if (licenseId < 1 || licenseId > 999999) return false
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  return (m[2] + m[3] + m[4]) === hmac.digest('hex').toUpperCase().slice(0, 15)
}

function generateKey(licenseId) {
  const idHex = licenseId.toString(16).toUpperCase().padStart(5, '0')
  const hmac  = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  const check = hmac.digest('hex').toUpperCase().slice(0, 15)
  return `EASY-${idHex}-${check.slice(0,5)}-${check.slice(5,10)}-${check.slice(10,15)}`
}

// ─── Device fingerprint ───────────────────────────────────────────────────────

function deviceHash() {
  const raw = `${os.hostname()}|${os.platform()}|${os.arch()}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

// ─── Local storage ────────────────────────────────────────────────────────────

function readData(userDataPath) {
  try { return JSON.parse(fs.readFileSync(path.join(userDataPath, FILE), 'utf8')) }
  catch { return null }
}

function writeData(userDataPath, data) {
  fs.writeFileSync(path.join(userDataPath, FILE), JSON.stringify(data, null, 2))
}

// ─── Online API calls ─────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }))
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(8000),
  })
  return res.json()
}

// ─── Status ───────────────────────────────────────────────────────────────────

async function getStatus(userDataPath) {
  let data = readData(userDataPath)
  const today = new Date().toISOString().slice(0, 10)

  if (!data) {
    data = { firstLaunch: today, key: null, pdfCount: 0 }
    writeData(userDataPath, data)
  }

  // Has a stored key?
  if (data.key && validateKey(data.key)) {
    // Try online verification; fall back to offline within grace period
    try {
      const result = await apiPost('/api/license/activate', {
        key: data.key, deviceHash: deviceHash(),
      })
      if (result.ok || result.alreadyActivated) {
        data.lastOnlineCheck = Date.now()
        writeData(userDataPath, data)
        return { status: 'activated', key: data.key }
      }
      // Key rejected by server (revoked / too many devices)
      return { status: 'expired', daysLeft: 0, pdfCount: data.pdfCount || 0, pdfLimit: PDF_LIMIT, serverError: result.error }
    } catch {
      // Offline: allow if within grace period
      const lastCheck = data.lastOnlineCheck || 0
      if (Date.now() - lastCheck < GRACE_MS) {
        return { status: 'activated', key: data.key, offline: true }
      }
      // Grace expired — treat as expired until back online
      return { status: 'expired', daysLeft: 0, pdfCount: data.pdfCount || 0, pdfLimit: PDF_LIMIT, offline: true }
    }
  }

  // Trial
  const elapsed  = Math.floor((Date.now() - new Date(data.firstLaunch)) / 86400000)
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsed)
  const pdfCount = data.pdfCount || 0
  return daysLeft > 0
    ? { status: 'trial', daysLeft, pdfCount, pdfLimit: PDF_LIMIT }
    : { status: 'expired', daysLeft: 0, pdfCount, pdfLimit: PDF_LIMIT }
}

// ─── Activate ─────────────────────────────────────────────────────────────────

async function activate(userDataPath, key) {
  if (!validateKey(key)) {
    return { success: false, error: 'Clave inválida. Verificá que la ingresaste correctamente.' }
  }

  try {
    const result = await apiPost('/api/license/activate', {
      key: key.replace(/\s/g, '').toUpperCase(),
      deviceHash: deviceHash(),
    })

    if (!result.ok && !result.alreadyActivated) {
      return { success: false, error: result.error || 'Error al verificar la clave.' }
    }
  } catch {
    // No internet: accept offline if HMAC is valid (will verify next time online)
    console.warn('License server unreachable — accepting offline activation')
  }

  const data         = readData(userDataPath) || {}
  data.key           = key.replace(/\s/g, '').toUpperCase()
  data.activatedAt   = new Date().toISOString().slice(0, 10)
  data.lastOnlineCheck = Date.now()
  writeData(userDataPath, data)
  return { success: true }
}

// ─── PDF tracking ─────────────────────────────────────────────────────────────

function trackPDF(userDataPath) {
  const data = readData(userDataPath) || {}
  if (data.key && validateKey(data.key)) return { allowed: true }
  const count = data.pdfCount || 0
  if (count >= PDF_LIMIT) return { allowed: false, pdfCount: count, pdfLimit: PDF_LIMIT }
  data.pdfCount = count + 1
  writeData(userDataPath, data)
  return { allowed: true, pdfCount: data.pdfCount, pdfLimit: PDF_LIMIT }
}

module.exports = { generateKey, validateKey, getStatus, activate, trackPDF }
