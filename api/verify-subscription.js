/**
 * POST /api/verify-subscription
 * Verifica si el usuario autenticado tiene una suscripción activa en MercadoPago
 * y activa su plan en Supabase si corresponde.
 * Requiere header: Authorization: Bearer <supabase_access_token>
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, proActivationEmail } from './_lib/email.js'

const MP_PLAN_ID      = '65b536a45d974b038219887643100785'
const ALLOWED_ORIGINS = ['https://easyresumen.com.ar', 'https://www.easyresumen.com.ar']

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Authenticate caller via Supabase JWT
  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) return res.status(401).json({ error: 'Missing Authorization header' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify token and get authenticated user
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(accessToken)
  if (authErr || !authUser) return res.status(401).json({ error: 'Invalid or expired token' })

  const userId = authUser.id
  const email  = authUser.email
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email format' })

  // Rate limit: max 1 call per 30s per user (stored in app_metadata, requires service_role)
  const { data: { user: rateUser } } = await supabase.auth.admin.getUserById(userId)
  const lastVerifyAt = rateUser?.app_metadata?.last_verify_at
  if (lastVerifyAt && (Date.now() - new Date(lastVerifyAt)) < 30_000) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Esperá 30 segundos antes de reintentar.' })
  }
  // Update timestamp before the slow MP call so parallel requests are also blocked
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...(rateUser?.app_metadata || {}), last_verify_at: new Date().toISOString() },
  })

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' })

  // Search by external_reference (userId) first, then by payer email as fallback
  let preapproval = null

  try {
    const byId = await fetch(
      `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&preapproval_plan_id=${MP_PLAN_ID}&status=authorized`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
    )
    if (!byId.ok) return res.status(502).json({ error: `MP API error: ${byId.status}` })
    const dataById = await byId.json()
    preapproval = dataById.results?.[0] || null

    if (!preapproval && email) {
      const byEmail = await fetch(
        `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email)}&preapproval_plan_id=${MP_PLAN_ID}&status=authorized`,
        { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
      )
      if (!byEmail.ok) return res.status(502).json({ error: `MP API error: ${byEmail.status}` })
      const dataByEmail = await byEmail.json()
      const candidate = dataByEmail.results?.[0] || null
      // Only trust if the subscription belongs to this user (or has no external_reference set)
      if (candidate && candidate.external_reference && candidate.external_reference !== userId) {
        preapproval = null
      } else {
        preapproval = candidate
      }
    }
  } catch (err) {
    return res.status(502).json({ error: `MP fetch failed: ${err.message}` })
  }

  if (!preapproval) {
    // Check for pending subscriptions (e.g. payment processing, cash payment)
    let pending = null
    const byIdPending = await fetch(
      `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&preapproval_plan_id=${MP_PLAN_ID}&status=pending`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
    )
    if (byIdPending.ok) {
      const dataPending = await byIdPending.json()
      pending = dataPending.results?.[0] || null
    }
    if (pending) {
      return res.status(200).json({ found: false, pending: true, message: 'Tu pago está siendo procesado. Puede tardar unos minutos en acreditarse.' })
    }
    return res.status(200).json({ found: false, message: 'No se encontró suscripción activa en MercadoPago' })
  }

  // Plan lives in app_metadata: only writable with service_role, so the client
  // can never self-promote via supabase.auth.updateUser()
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(rateUser?.app_metadata || {}),
      plan: 'paid',
      mp_preapproval_id: preapproval.id,
      activated_at: new Date().toISOString(),
      last_verify_at: new Date().toISOString(),
    },
  })

  if (error) return res.status(500).json({ error: error.message })

  if (email) await sendEmail(proActivationEmail(email))

  return res.status(200).json({ found: true, activated: true })
}
