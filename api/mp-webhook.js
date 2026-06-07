/**
 * POST /api/mp-webhook
 * Recibe notificaciones de MercadoPago y activa el plan "paid" en Supabase.
 * MP envía: { id, type, data: { id } }
 */
import { createClient } from '@supabase/supabase-js'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-request-id')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Healthcheck para verificar que el endpoint responde
  if (req.method === 'GET') return res.status(200).json({ ok: true })

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const { type, data } = body

  console.log('[mp-webhook] received:', JSON.stringify(body))

  // MP envía pings de prueba con type "test" — responder 200 siempre
  if (!type || !data?.id) {
    return res.status(200).json({ ok: true, msg: 'no action needed' })
  }

  // Solo procesamos eventos de suscripciones (preapproval) y pagos
  const relevantTypes = ['subscription_preapproval', 'payment']
  if (!relevantTypes.includes(type)) {
    console.log('[mp-webhook] ignored type:', type)
    return res.status(200).json({ ok: true, msg: 'ignored' })
  }

  try {
    // Obtener detalles del recurso desde MP
    const resourceId = data.id
    let mpData = null

    if (type === 'subscription_preapproval') {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      })
      mpData = await mpRes.json()
      console.log('[mp-webhook] preapproval data:', JSON.stringify(mpData))
    } else if (type === 'payment') {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      })
      mpData = await mpRes.json()
      console.log('[mp-webhook] payment data:', JSON.stringify(mpData))
    }

    if (!mpData) return res.status(200).json({ ok: true, msg: 'no mpData' })

    // Extraer external_reference (= user_id de Supabase) y status
    const externalRef = mpData.external_reference || mpData.metadata?.external_reference
    const status = mpData.status

    console.log('[mp-webhook] external_reference:', externalRef, 'status:', status)

    const activeStatuses = ['authorized', 'active', 'approved']
    if (!externalRef || !activeStatuses.includes(status)) {
      return res.status(200).json({ ok: true, msg: 'not active yet', status })
    }

    // Activar plan paid en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: user, error } = await supabase.auth.admin.getUserById(externalRef)
    if (error || !user?.user) {
      console.error('[mp-webhook] user not found:', externalRef, error)
      return res.status(200).json({ ok: true, msg: 'user not found', externalRef })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(externalRef, {
      user_metadata: {
        ...user.user.user_metadata,
        plan: 'paid',
        mp_subscription_id: mpData.id,
        activated_at: new Date().toISOString(),
      },
    })

    if (updateError) {
      console.error('[mp-webhook] update error:', updateError)
      return res.status(500).json({ error: updateError.message })
    }

    console.log('[mp-webhook] plan activated for user:', externalRef)
    return res.status(200).json({ ok: true, activated: externalRef })
  } catch (err) {
    console.error('[mp-webhook] error:', err)
    // Siempre devolver 200 a MP para que no reintente indefinidamente en errores nuestros
    return res.status(200).json({ ok: false, error: err.message })
  }
}
