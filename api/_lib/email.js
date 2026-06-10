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

export function onboardingEmail(email) {
  return {
    to: email,
    subject: '¿Pudiste subir tu primer PDF? 👀',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:20px;overflow:hidden;max-width:560px;width:100%">

        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);padding:40px 40px 32px;text-align:center">
            <img src="https://easyresumen.com.ar/icon.png" width="56" height="56" alt="EasyResumen" style="display:block;margin:0 auto 16px;border-radius:14px">
            <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px">¿Empezaste a usar EasyResumen?</h1>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">Tu período de prueba está activo 🎉</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 28px">
            <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
              Hola 👋 Te escribimos porque creaste tu cuenta hace un par de días y queremos asegurarnos de que todo haya salido bien.
            </p>
            <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7">
              Si todavía no subiste tu primer resumen, es más fácil de lo que parece: entrá a la app, arrastrá el PDF de tu tarjeta y en segundos vas a ver todos tus gastos organizados.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:14px;margin-bottom:28px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 12px;color:#818cf8;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">¿Cómo descargo el PDF de mi banco?</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px;line-height:1.4">🔴 &nbsp;<strong>Galicia:</strong> homebanking.galicia.com.ar → Tarjetas → Resumen</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px;line-height:1.4">🔵 &nbsp;<strong>BBVA:</strong> bbva.com.ar → Tarjetas de crédito → Ver resumen</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px;line-height:1.4">🔴 &nbsp;<strong>Santander:</strong> online.santander.com.ar → Tarjetas → Resumen</td></tr>
                  <tr><td style="padding:6px 0;color:#e2e8f0;font-size:14px;line-height:1.4">🟢 &nbsp;<strong>Nación:</strong> bna.com.ar → Tarjetas → Resumen digital</td></tr>
                  <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Y 12 bancos más — guía completa dentro de la app 📖</td></tr>
                </table>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="https://easyresumen.com.ar" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;letter-spacing:0.2px">
                  Subir mi primer PDF →
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;color:#4a5568;font-size:13px;text-align:center;line-height:1.6">
              Si tenés algún problema, respondé este email y te ayudamos.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0 0 6px;color:#4a5568;font-size:12px;line-height:1.6">
              <a href="mailto:soporte@easyresumen.com.ar" style="color:#6366f1;text-decoration:none">soporte@easyresumen.com.ar</a>
            </p>
            <p style="margin:0;color:#2d2d4e;font-size:11px">© ${new Date().getFullYear()} EasyResumen · Argentina</p>
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return String(s).replace(/[&<>"']/g, c => map[c])
}

function emailWrapper(body) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:20px;overflow:hidden;max-width:560px;width:100%">
        ${body}
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0 0 6px;color:#4a5568;font-size:12px;line-height:1.6">
              ¿Consultas? <a href="mailto:soporte@easyresumen.com.ar" style="color:#6366f1;text-decoration:none">soporte@easyresumen.com.ar</a>
            </p>
            <p style="margin:0;color:#2d2d4e;font-size:11px">© ${new Date().getFullYear()} EasyResumen · Argentina</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(text, url) {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;letter-spacing:0.2px">${text}</a>
  </td></tr></table>`
}

function header(title, subtitle, gradient = 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)') {
  return `<tr>
    <td style="background:${gradient};padding:40px 40px 32px;text-align:center">
      <img src="https://easyresumen.com.ar/icon.png" width="56" height="56" alt="EasyResumen" style="display:block;margin:0 auto 16px;border-radius:14px">
      <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px">${title}</h1>
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px">${subtitle}</p>
    </td>
  </tr>`
}

// ─── Trial email sequences ─────────────────────────────────────────────────────

export function trialNoUploadEmail(email) {
  const safe = escapeHtml(email)
  return {
    to: email,
    subject: 'Tu prueba sigue activa — ¿ya subiste tu primer resumen?',
    html: emailWrapper(`
      ${header('Tu prueba sigue activa 🎉', '¿Todavía no subiste tu primer PDF?')}
      <tr><td style="padding:36px 40px 28px">
        <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
          Pasaron unos días desde que creaste tu cuenta en EasyResumen y notamos que todavía no analizaste ningún resumen. ¡Lo más difícil es empezar!
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:14px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 10px;color:#818cf8;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Solo necesitás 3 pasos</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">1️⃣ &nbsp;Entrá a tu homebanking y descargá el PDF del último resumen</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">2️⃣ &nbsp;Abrí EasyResumen y arrastrá el archivo</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">3️⃣ &nbsp;En segundos ves todos tus gastos organizados automáticamente 📊</p>
          </td></tr>
        </table>
        ${ctaButton('Subir mi primer PDF →', 'https://easyresumen.com.ar')}
        <p style="margin:20px 0 0;color:#4a5568;font-size:12px;text-align:center">Tu cuenta: <span style="color:#818cf8">${safe}</span></p>
      </td></tr>
    `),
  }
}

export function trialCountdownEmail(email, daysLeft) {
  const safe = escapeHtml(email)
  const urgent = daysLeft <= 2
  const gradient = urgent
    ? 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)'
    : 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)'
  const title = urgent
    ? `⚠️ Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} de prueba`
    : `Tu prueba vence en ${daysLeft} días`
  const subtitle = urgent
    ? 'Suscribite ahora para no perder el acceso'
    : 'Seguí analizando tus gastos sin límites'
  return {
    to: email,
    subject: urgent
      ? `⚠️ Último aviso: tu prueba EasyResumen vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
      : `EasyResumen: te quedan ${daysLeft} días de prueba`,
    html: emailWrapper(`
      ${header(title, subtitle, gradient)}
      <tr><td style="padding:36px 40px 28px">
        <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
          ${urgent
            ? 'El acceso completo a tus análisis, presupuestos y proyecciones de cuotas se bloquea cuando vence la prueba.'
            : 'Tu período de prueba está por terminar. Suscribite para seguir usando EasyResumen sin interrupciones.'}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:14px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 10px;color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Con EasyResumen PRO</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;PDFs ilimitados — todos tus bancos y tarjetas</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Sincronización en la nube</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Exportación a Excel y PDF</p>
            <p style="margin:4px 0;color:#e2e8f0;font-size:14px">✅ &nbsp;Insights, cuotas proyectadas, presupuestos</p>
            <p style="margin:8px 0 0;color:#fbbf24;font-size:15px;font-weight:700">$2.999/mes · Cancelás cuando querés</p>
          </td></tr>
        </table>
        ${ctaButton('Suscribirme ahora →', 'https://easyresumen.com.ar')}
        <p style="margin:20px 0 0;color:#4a5568;font-size:12px;text-align:center">Tu cuenta: <span style="color:#818cf8">${safe}</span></p>
      </td></tr>
    `),
  }
}

export function trialExpiredEmail(email) {
  const safe = escapeHtml(email)
  return {
    to: email,
    subject: 'Tu período de prueba EasyResumen venció — reactivá en 1 click',
    html: emailWrapper(`
      ${header('Tu prueba venció 😔', 'Pero tus datos siguen guardados', 'linear-gradient(135deg,#64748b 0%,#475569 100%)')}
      <tr><td style="padding:36px 40px 28px">
        <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
          Tu período de prueba de 30 días terminó. <strong style="color:#e2e8f0">Tus movimientos, presupuestos y datos siguen guardados</strong> — solo necesitás suscribirte para volver a acceder.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:14px;margin-bottom:24px">
          <tr><td style="padding:18px 22px;text-align:center">
            <p style="margin:0 0 4px;color:#818cf8;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">EasyResumen PRO</p>
            <p style="margin:0 0 2px;color:#fff;font-size:32px;font-weight:800">$2.999</p>
            <p style="margin:0;color:#94a3b8;font-size:13px">por mes · sin permanencia · cancelás cuando querés</p>
          </td></tr>
        </table>
        ${ctaButton('Reactivar mi cuenta →', 'https://easyresumen.com.ar')}
        <p style="margin:20px 0 0;color:#4a5568;font-size:12px;text-align:center">Tu cuenta: <span style="color:#818cf8">${safe}</span></p>
      </td></tr>
    `),
  }
}

export function trialWinBackEmail(email) {
  const safe = escapeHtml(email)
  return {
    to: email,
    subject: '¿Volvemos? Seguí analizando tus gastos con EasyResumen',
    html: emailWrapper(`
      ${header('¿Volvemos? 👋', 'Tus datos siguen acá, esperándote', 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)')}
      <tr><td style="padding:36px 40px 28px">
        <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
          Pasó un tiempo desde que terminó tu prueba. Por si te sirve: todos tus movimientos y análisis siguen guardados en tu cuenta.
        </p>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7">
          Suscribite a EasyResumen PRO y retomá exactamente donde lo dejaste — sin re-subir PDFs, sin reconfigurar presupuestos.
        </p>
        ${ctaButton('Suscribirme a EasyResumen →', 'https://easyresumen.com.ar')}
        <p style="margin:20px 0 0;color:#4a5568;font-size:12px;text-align:center">Tu cuenta: <span style="color:#818cf8">${safe}</span> · $2.999/mes</p>
      </td></tr>
    `),
  }
}

export function proActivationEmail(email) {
  return {
    to: email,
    subject: 'Estás a un paso de empezar a usar EasyResumen 🚀',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:20px;overflow:hidden;max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);padding:40px 40px 32px;text-align:center">
            <img src="https://easyresumen.com.ar/icon.png" width="56" height="56" alt="EasyResumen" style="display:block;margin:0 auto 16px;border-radius:14px">
            <h1 style="margin:0 0 8px;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px">Estás a un paso de empezar<br>a usar EasyResumen</h1>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">Tu suscripción PRO ya está activa 🎉</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px">
            <p style="margin:0 0 12px;color:#e2e8f0;font-size:16px;font-weight:600">¡Bienvenido/a! 👋</p>
            <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">
              Gracias por suscribirte a EasyResumen. A partir de ahora podés subir tus resúmenes de tarjeta de crédito y en segundos ver exactamente en qué gastás, cuánto debés en cuotas y cómo optimizar tu plata — todo sin que tus datos salgan de tu dispositivo.
            </p>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.7">
              Empezar es muy simple: ingresá a la app, subí el PDF de tu tarjeta y listo. EasyResumen hace el resto.
            </p>

            <!-- Features list -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:14px;margin-bottom:28px">
              <tr><td style="padding:22px 26px">
                <p style="margin:0 0 14px;color:#818cf8;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Tu plan PRO incluye</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;color:#e2e8f0;font-size:14px;line-height:1.4">
                      ✅ &nbsp;<strong>Análisis ilimitado de PDFs</strong> — cargá todos los resúmenes que quieras
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#e2e8f0;font-size:14px;line-height:1.4">
                      ✅ &nbsp;<strong>Sincronización en la nube</strong> — accedé desde cualquier dispositivo
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#e2e8f0;font-size:14px;line-height:1.4">
                      ✅ &nbsp;<strong>Presupuestos y categorías</strong> — personalizá todo a tu medida
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#e2e8f0;font-size:14px;line-height:1.4">
                      ✅ &nbsp;<strong>Exportación a Excel y PDF</strong> — compartí o archivá tus reportes
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#e2e8f0;font-size:14px;line-height:1.4">
                      ✅ &nbsp;<strong>Soporte prioritario</strong> — respondemos en menos de 24 hs
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="https://easyresumen.com.ar" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;letter-spacing:0.2px">
                  Abrir EasyResumen →
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;color:#4a5568;font-size:13px;text-align:center">
              Tu cuenta: <span style="color:#818cf8">${email}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0 0 6px;color:#4a5568;font-size:12px;line-height:1.6">
              ¿Tenés alguna duda? Escribinos a
              <a href="mailto:soporte@easyresumen.com.ar" style="color:#6366f1;text-decoration:none">soporte@easyresumen.com.ar</a>
              — estamos para ayudarte.
            </p>
            <p style="margin:0;color:#2d2d4e;font-size:11px">
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
