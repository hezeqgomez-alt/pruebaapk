/**
 * POST /api/webhook/gumroad
 * Gumroad fires this on every sale. We:
 *   1. Validate the seller_id matches our account
 *   2. Generate the next license key
 *   3. Store it in Supabase
 *   4. Email the key to the buyer via Resend
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateKey } from '../../lib/keygen.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body

  // Basic Gumroad verification — seller_id must match
  if (body.seller_id !== process.env.GUMROAD_SELLER_ID) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Skip refunds / chargebacks
  if (body.refunded === 'true' || body.chargebacked === 'true') {
    return res.status(200).json({ ok: true, skipped: true })
  }

  const email      = body.email
  const saleId     = body.sale_id
  const buyerName  = body.full_name || 'Cliente'

  if (!email || !saleId) return res.status(400).json({ error: 'Missing email or sale_id' })

  // Idempotency: if we already processed this sale, just re-send the email
  const { data: existing } = await supabase
    .from('licenses')
    .select('key')
    .eq('gumroad_sale_id', saleId)
    .single()

  if (existing) {
    await sendEmail(resend, email, buyerName, existing.key)
    return res.status(200).json({ ok: true, resent: true })
  }

  // Get next license ID (count of existing licenses + 1)
  const { count } = await supabase
    .from('licenses')
    .select('*', { count: 'exact', head: true })

  const licenseId = (count || 0) + 1
  const key = generateKey(licenseId)

  // Store in Supabase
  const { error } = await supabase.from('licenses').insert({
    license_id:      licenseId,
    key,
    email,
    gumroad_sale_id: saleId,
    buyer_name:      buyerName,
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return res.status(500).json({ error: 'DB error' })
  }

  // Send email
  await sendEmail(resend, email, buyerName, key)

  return res.status(200).json({ ok: true, licenseId })
}

async function sendEmail(resend, email, name, key) {
  await resend.emails.send({
    from:    'EasyResumen <licencias@easyresumen.com>',
    to:      email,
    subject: '🎉 Tu licencia de EasyResumen',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:24px">¡Gracias por comprar EasyResumen!</h1>
        </div>

        <p style="color:#475569;font-size:15px">Hola ${name},</p>
        <p style="color:#475569;font-size:15px">Tu clave de licencia es:</p>

        <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
          <code style="font-size:20px;font-weight:700;letter-spacing:3px;color:#4f46e5">${key}</code>
        </div>

        <p style="color:#64748b;font-size:14px">
          Para activarla: abrí EasyResumen → hacé clic en <strong>"Activar licencia"</strong> en el banner superior → pegá la clave → listo.
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px;text-align:center">
          Guardá este email. Si necesitás recuperar tu clave escribí a hezeq.gomez@gmail.com con tu email de compra.
        </p>
      </div>
    `,
  })
}
