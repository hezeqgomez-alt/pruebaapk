/**
 * POST /api/license/activate
 * Body: { key, deviceHash }
 * Validates the key exists in Supabase, checks activation limit (max 2 devices),
 * registers the device and returns { ok, error? }
 */
import { createClient } from '@supabase/supabase-js'
import { validateKey } from '../../lib/keygen.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const MAX_DEVICES = 2

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { key, deviceHash } = req.body || {}
  if (!key || !deviceHash) return res.status(400).json({ ok: false, error: 'Faltan datos' })

  // Offline HMAC check first (fast, no DB round-trip if clearly invalid)
  if (!validateKey(key)) {
    return res.status(200).json({ ok: false, error: 'Clave inválida. Verificá que la ingresaste correctamente.' })
  }

  // Look up in DB
  const { data: license, error: dbErr } = await supabase
    .from('licenses')
    .select('id, key, activations')
    .eq('key', key.replace(/\s/g, '').toUpperCase())
    .single()

  if (dbErr || !license) {
    return res.status(200).json({ ok: false, error: 'Clave no encontrada. Verificá o contactá soporte.' })
  }

  const activations = license.activations || []

  // Already activated on this device?
  if (activations.includes(deviceHash)) {
    return res.status(200).json({ ok: true, alreadyActivated: true })
  }

  // Too many devices?
  if (activations.length >= MAX_DEVICES) {
    return res.status(200).json({
      ok: false,
      error: `Límite de ${MAX_DEVICES} dispositivos alcanzado. Escribí a hezeq.gomez@gmail.com para transferir la licencia.`,
    })
  }

  // Register device
  const { error: updateErr } = await supabase
    .from('licenses')
    .update({ activations: [...activations, deviceHash], activated_at: new Date().toISOString() })
    .eq('id', license.id)

  if (updateErr) return res.status(500).json({ ok: false, error: 'Error interno. Intentá de nuevo.' })

  return res.status(200).json({ ok: true })
}
