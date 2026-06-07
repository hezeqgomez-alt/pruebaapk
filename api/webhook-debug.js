/**
 * GET/POST /api/webhook-debug
 * Diagnostic endpoint — logs all incoming headers and body.
 * Used to verify that external servers (e.g. MercadoPago) can reach Vercel functions.
 * SAFE: read-only, no side effects.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const info = {
    method:  req.method,
    url:     req.url,
    headers: req.headers,
    body:    req.body || null,
    ts:      new Date().toISOString(),
  }

  console.log('[webhook-debug]', JSON.stringify(info))

  return res.status(200).json({ ok: true, received: info })
}
