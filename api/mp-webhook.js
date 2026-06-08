/**
 * POST /api/mp-webhook
 * Recibe notificaciones de MercadoPago para suscripciones.
 * Activa o desactiva el plan del usuario en Supabase según el estado.
 *
 * Env vars requeridas:
 *   MP_ACCESS_TOKEN      — token de acceso producción de MercadoPago
 *   SUPABASE_URL         — URL del proyecto Supabase
 *   SUPABASE_SERVICE_KEY — service_role key de Supabase (solo server-side)
 */
import { createClient } from '@supabase/supabase-js'
import { createHmac }   from 'crypto'
import { sendEmail, proActivationEmail } from './_lib/email.js'

function verifyMPSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // skip if not configured (dev/test)

  const xSignature  = req.headers['x-signature']  || ''
  const xRequestId  = req.headers['x-request-id'] || ''
  const dataId      = req.query?.['data.id']       || req.body?.data?.id || ''

  // MP signature format: ts=<timestamp>,v1=<hmac>
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts    = parts['ts'] || ''
  const v1    = parts['v1'] || ''
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  return expected === v1
}

export default async function handler(req, res) {
  // Webhook is called server-to-server — no CORS headers needed
  if (req.method === 'OPTIONS') return res.status(200).end()

  // MercadoPago sends GET pings — respond 200 to avoid retries
  if (req.method === 'GET') return res.status(200).json({ ok: true })

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!verifyMPSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { type, data } = req.body || {}

  // Only handle subscription events
  if (type !== 'subscription_preapproval') {
    return res.status(200).json({ ok: true, skipped: type })
  }

  const preapprovalId = data?.id
  if (!preapprovalId) return res.status(400).json({ error: 'Missing preapproval id' })

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' })

  // Fetch subscription details from MercadoPago
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  })

  if (!mpRes.ok) {
    return res.status(502).json({ error: `MP API error: ${mpRes.status}` })
  }

  const preapproval = await mpRes.json()

  const userId     = preapproval.external_reference
  const payerEmail = preapproval.payer_email
  const status     = preapproval.status

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Helper: update user preserving existing metadata
  async function activateUser(id, newMeta) {
    const { data: { user }, error: getErr } = await supabase.auth.admin.getUserById(id)
    if (getErr) return getErr
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { ...(user?.user_metadata || {}), ...newMeta },
    })
    return error
  }

  // Handle cancellations and pauses — downgrade plan
  if (['cancelled', 'paused'].includes(status)) {
    if (userId) {
      const err = await activateUser(userId, { plan: 'expired', mp_preapproval_id: preapprovalId })
      if (err) return res.status(500).json({ error: err.message })
      return res.status(200).json({ ok: true, downgraded_by: 'user_id', userId, status })
    }
    // No userId — no action, let subscription expire naturally
    return res.status(200).json({ ok: true, skipped: 'no userId for downgrade', status })
  }

  // Only activate on authorized subscriptions
  if (status !== 'authorized') {
    return res.status(200).json({ ok: true, status, skipped: true })
  }

  // Activate by user ID (preferred)
  if (userId) {
    const err = await activateUser(userId, { plan: 'paid', mp_preapproval_id: preapprovalId })
    if (err) return res.status(500).json({ error: err.message })
    if (payerEmail) await sendEmail(proActivationEmail(payerEmail))
    return res.status(200).json({ ok: true, activated_by: 'user_id', userId })
  }

  // Fallback: activate by payer email
  if (payerEmail) {
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) return res.status(500).json({ error: listErr.message })

    const user = users.find(u => u.email?.toLowerCase() === payerEmail.toLowerCase())
    if (!user) return res.status(404).json({ error: `User not found for email ${payerEmail}` })

    const err = await activateUser(user.id, { plan: 'paid', mp_preapproval_id: preapprovalId })
    if (err) return res.status(500).json({ error: err.message })
    await sendEmail(proActivationEmail(payerEmail))
    return res.status(200).json({ ok: true, activated_by: 'email', email: payerEmail })
  }

  return res.status(400).json({ error: 'No user identifier in subscription' })
}
