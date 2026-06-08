/**
 * Sends a transactional email via Resend REST API.
 * Requires RESEND_API_KEY env var.
 * Returns { ok: true } or { ok: false, error: string }
 */
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY not configured' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EasyResumen <noreply@easyresumen.com.ar>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: body }
  }
  return { ok: true }
}

export function proActivationEmail(email) {
  return {
    to: email,
    subject: '¡Tu plan PRO de EasyResumen está activo! 🎉',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 40px;text-align:center">
            <p style="margin:0 0 8px;font-size:32px">⚡</p>
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">¡Plan PRO activado!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">EasyResumen</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px">
            <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px">
              Hola 👋
            </p>
            <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6">
              Tu suscripción PRO fue activada correctamente. A partir de ahora tenés acceso completo a todas las funciones de EasyResumen sin límites.
            </p>

            <!-- Features list -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:12px;overflow:hidden;margin-bottom:24px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 12px;color:#6366f1;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Lo que incluye tu plan PRO</p>
                <table cellpadding="0" cellspacing="0">
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Análisis ilimitado de PDFs</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Sincronización en la nube</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Presupuestos y categorías personalizadas</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Exportación a Excel y PDF</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Soporte prioritario</td></tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">
              Cuenta activada: <span style="color:#e2e8f0">${email}</span>
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
              <tr><td align="center">
                <a href="https://easyresumen.com.ar" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px">
                  Ir a EasyResumen →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0;color:#4a5568;font-size:12px">
              Si tenés alguna duda escribinos a
              <a href="mailto:soporte@easyresumen.com.ar" style="color:#6366f1;text-decoration:none">soporte@easyresumen.com.ar</a>
            </p>
            <p style="margin:8px 0 0;color:#4a5568;font-size:11px">
              © ${new Date().getFullYear()} EasyResumen · Argentina
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  }
}
