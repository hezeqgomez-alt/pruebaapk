/**
 * POST /api/admin/promote
 * Promueve un usuario de Supabase Auth a plan "paid".
 * Body: { email: string, secret: string }
 * Requiere env var ADMIN_SECRET para autenticar la llamada.
 */
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

export default async function handler(req, res) {
  // Admin endpoint — server-to-server only, no CORS needed
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET not configured' })

  const { email, secret, plan = 'paid' } = req.body || {}

  if (!['paid', 'expired', 'trial'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan value' })
  }

  if (!secret) return res.status(401).json({ error: 'Unauthorized' })
  const secretsMatch = (() => {
    try {
      const a = Buffer.from(secret)
      const b = Buffer.from(adminSecret)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch { return false }
  })()
  if (!secretsMatch) return res.status(401).json({ error: 'Unauthorized' })

  if (!email) return res.status(400).json({ error: 'Missing email' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Buscar usuario por email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) return res.status(500).json({ error: listError.message })

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return res.status(404).json({ error: `Usuario ${email} no encontrado` })

  // Actualizar metadata
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, plan },
  })

  if (updateError) return res.status(500).json({ error: updateError.message })

  return res.status(200).json({
    ok: true,
    user: { id: data.user.id, email: data.user.email, plan: data.user.user_metadata?.plan },
  })
}
