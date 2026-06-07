/**
 * POST /api/mp-webhook
 * Recibe notificaciones de MercadoPago para suscripciones.
 * Cuando un pago es aprobado, activa el plan "paid" del usuario en Supabase.
 *
 * Env vars requeridas:
 *   MP_ACCESS_TOKEN       — token de acceso producción de MercadoPago
 *   MP_WEBHOOK_SECRET     — secret configurado en el panel de webhooks MP (opcional pero recomendado)
 *   SUPABASE_URL          — URL del proyecto Supabase
 *   SUPABASE_SERVICE_KEY  — service_role key de Supabase (solo server-side)
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function verifyMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // skip if not configured

  const xSignature = req.headers['x-signature']
  const xRequestId = req.headers['x-request-id']
  const dataId     = req.query?.['data.id'] || req.body?.data?.id

  if (!xSignature) return false

  // Parse ts and v1 from x-signature header
  const parts = {}
  for (const part of xSignature.split(',')) {
    const [k, v] = part.trim().split('=')
    if (k && v) parts[k] = v
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return parts.v1 === expected
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-request-id')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // MercadoPago sends GET pings — respond 200 to avoid retries
  if (req.method === 'GET') return res.status(200).json({ ok: true })

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify MP signature when secret is configured
  if (!verifyMpSignature(req)) {
    console.warn('[mp-webhook] invalid signature')
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

  // Only activate on authorized (active) subscriptions
  if (preapproval.status !== 'authorized') {
    return res.status(200).json({ ok: true, status: preapproval.status, skipped: true })
  }

  const userId    = preapproval.external_reference   // set when building checkout URL
  const payerEmail = preapproval.payer_email

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Activate by user ID (preferred) or fallback to email lookup
  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { plan: 'paid', mp_preapproval_id: preapprovalId },
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, activated_by: 'user_id', userId })
  }

  if (payerEmail) {
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) return res.status(500).json({ error: listErr.message })

    const user = users.find(u => u.email?.toLowerCase() === payerEmail.toLowerCase())
    if (!user) return res.status(404).json({ error: `User not found for email ${payerEmail}` })

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, plan: 'paid', mp_preapproval_id: preapprovalId },
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, activated_by: 'email', email: payerEmail })
  }

  return res.status(400).json({ error: 'No user identifier in subscription' })
}
