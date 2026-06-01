import crypto from 'crypto'

const SECRET = process.env.LICENSE_HMAC_SECRET

export function generateKey(licenseId) {
  const idHex = licenseId.toString(16).toUpperCase().padStart(5, '0')
  const hmac  = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  const check = hmac.digest('hex').toUpperCase().slice(0, 15)
  return `EASY-${idHex}-${check.slice(0,5)}-${check.slice(5,10)}-${check.slice(10,15)}`
}

export function validateKey(key) {
  const clean = (key || '').replace(/[\s-]/g, '').toUpperCase()
  if (clean.length !== 24) return false
  const formatted = `${clean.slice(0,4)}-${clean.slice(4,9)}-${clean.slice(9,14)}-${clean.slice(14,19)}-${clean.slice(19,24)}`
  const m = formatted.match(/^EASY-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})-([0-9A-F]{5})$/)
  if (!m) return false
  const licenseId = parseInt(m[1], 16)
  if (licenseId < 1 || licenseId > 999999) return false
  const inputCheck = m[2] + m[3] + m[4]
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(`EASYRESUMEN|${licenseId}`)
  return inputCheck === hmac.digest('hex').toUpperCase().slice(0, 15)
}
