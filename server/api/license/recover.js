/**
 * POST /api/license/recover
 * Body: { email }
 * Re-sends all license keys purchased with that email.
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body || {}
  if (!email) return res.status(400).json({ ok: false, error: 'Email requerido' })

  const { data: licenses } = await supabase
    .from('licenses')
    .select('key, created_at')
    .eq('email', email.toLowerCase().trim())
    .order('created_at', { ascending: false })

  // Always return 200 (don't reveal whether email exists)
  if (!licenses || licenses.length === 0) {
    return res.status(200).json({ ok: true })
  }

  const keysList = licenses.map(l => `<li style="margin:8px 0"><code style="font-size:16px;font-weight:700;letter-spacing:2px;color:#4f46e5">${l.key}</code></li>`).join('')

  await resend.emails.send({
    from:    'EasyResumen <licencias@easyresumen.com>',
    to:      email,
    subject: 'Recuperación de clave — EasyResumen',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e293b">Tus claves de EasyResumen</h2>
        <ul style="list-style:none;padding:0">${keysList}</ul>
        <p style="color:#64748b;font-size:13px;margin-top:24px">
          Si no solicitaste este email, ignoralo. Soporte: hezeq.gomez@gmail.com
        </p>
      </div>
    `,
  })

  return res.status(200).json({ ok: true })
}
