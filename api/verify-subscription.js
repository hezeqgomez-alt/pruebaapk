/**
 * POST /api/verify-subscription
 * Busca activamente en MP si el usuario tiene una suscripción activa
 * y si la encuentra, activa plan "paid" en Supabase.
 * Body: { userId: string, email?: string }
 * Se llama desde el botón "Ya me suscribí" en el cliente.
 */
import { createClient } from '@supabase/supabase-js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const PLAN_ID = '65b536a45d974b038219887643100785'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 1. Buscar por external_reference = userId (la forma principal)
    let subscription = await findByExternalReference(userId)

    // 2. Si no se encontró y tenemos email, buscar por email del pagador
    if (!subscription && email) {
      subscription = await findByPayerEmail(email)
    }

    if (!subscription) {
      return res.status(200).json({ ok: false, msg: 'no active subscription found' })
    }

    console.log('[verify-subscription] found:', subscription.id, 'status:', subscription.status)

    // 3. Activar en Supabase
    const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(userId)
    if (getUserError || !user?.user) {
      return res.status(404).json({ error: 'User not found in Supabase' })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user.user_metadata,
        plan: 'paid',
        mp_subscription_id: subscription.id,
        activated_at: new Date().toISOString(),
      },
    })

    if (updateError) {
      console.error('[verify-subscription] update error:', updateError)
      return res.status(500).json({ error: updateError.message })
    }

    console.log('[verify-subscription] plan activated for user:', userId)
    return res.status(200).json({
      ok: true,
      activated: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    })
  } catch (err) {
    console.error('[verify-subscription] error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function findByExternalReference(userId) {
  try {
    const url = `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&status=authorized&limit=5`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const data = await res.json()
    const results = data?.results || []
    return results.find(s => ['authorized', 'active'].includes(s.status)) || null
  } catch {
    return null
  }
}

async function findByPayerEmail(email) {
  try {
    const url = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email)}&status=authorized&preapproval_plan_id=${PLAN_ID}&limit=5`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const data = await res.json()
    const results = data?.results || []
    return results.find(s => ['authorized', 'active'].includes(s.status)) || null
  } catch {
    return null
  }
}
