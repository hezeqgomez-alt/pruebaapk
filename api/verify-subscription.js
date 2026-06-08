/**
 * POST /api/verify-subscription
 * Verifica si el usuario autenticado tiene una suscripción activa en MercadoPago
 * y activa su plan en Supabase si corresponde.
 * Requiere header: Authorization: Bearer <supabase_access_token>
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, proActivationEmail } from './_lib/email.js'

const MP_PLAN_ID      = '65b536a45d974b038219887643100785'
const ALLOWED_ORIGIN  = 'https://easyresumen.com.ar'

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN
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

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' })

  // Search by external_reference (userId) first, then by payer email as fallback
  let preapproval = null

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
    preapproval = dataByEmail.results?.[0] || null
  }

  if (!preapproval) {
    return res.status(200).json({ found: false, message: 'No se encontró suscripción activa en MercadoPago' })
  }

  // Fetch existing metadata to preserve fields like trial_started_at, pdf_count
  const { data: { user: sbUser }, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr) return res.status(500).json({ error: getErr.message })

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(sbUser?.user_metadata || {}),
      plan: 'paid',
      mp_preapproval_id: preapproval.id,
      activated_at: new Date().toISOString(),
    },
  })

  if (error) return res.status(500).json({ error: error.message })

  if (email) await sendEmail(proActivationEmail(email))

  return res.status(200).json({ found: true, activated: true, preapprovalId: preapproval.id })
}
