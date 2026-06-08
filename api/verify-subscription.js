/**
 * POST /api/verify-subscription
 * Verifica si el usuario tiene una suscripción activa en MercadoPago
 * y activa su plan en Supabase si corresponde.
 * Body: { userId: string, email: string }
 */
import { createClient } from '@supabase/supabase-js'

const MP_PLAN_ID = '65b536a45d974b038219887643100785'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email } = req.body || {}
  if (!userId && !email) return res.status(400).json({ error: 'Missing userId or email' })

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' })

  // Search by external_reference (userId) first, then by payer email as fallback
  let preapproval = null

  if (userId) {
    const r = await fetch(
      `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&preapproval_plan_id=${MP_PLAN_ID}&status=authorized`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
    )
    if (r.ok) {
      const data = await r.json()
      preapproval = data.results?.[0] || null
    }
  }

  if (!preapproval && email) {
    const r = await fetch(
      `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email)}&preapproval_plan_id=${MP_PLAN_ID}&status=authorized`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
    )
    if (r.ok) {
      const data = await r.json()
      preapproval = data.results?.[0] || null
    }
  }

  if (!preapproval) {
    return res.status(200).json({ found: false, message: 'No se encontró suscripción activa en MercadoPago' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const targetId = preapproval.external_reference || userId
  if (!targetId) return res.status(400).json({ error: 'No user ID available' })

  // Fetch existing metadata to preserve fields like trial_started_at, pdf_count
  const { data: { user }, error: getErr } = await supabase.auth.admin.getUserById(targetId)
  if (getErr) return res.status(500).json({ error: getErr.message })

  const { error } = await supabase.auth.admin.updateUserById(targetId, {
    user_metadata: {
      ...(user?.user_metadata || {}),
      plan: 'paid',
      mp_preapproval_id: preapproval.id,
      activated_at: new Date().toISOString(),
    },
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ found: true, activated: true, preapprovalId: preapproval.id })
}
