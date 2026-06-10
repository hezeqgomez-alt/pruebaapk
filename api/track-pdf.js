/**
 * POST /api/track-pdf
 * Server-side PDF tracking: validates trial expiry and increments counter.
 * The counter is informational only — there is no per-PDF cap on trial accounts.
 * Requires header: Authorization: Bearer <supabase_access_token>
 *
 * Returns:
 *   { allowed: true, pdfCount }
 *   { allowed: false, expired: true, message }
 */
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = ['https://easyresumen.com.ar', 'https://www.easyresumen.com.ar']

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) return res.status(401).json({ error: 'Missing Authorization header' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(accessToken)
  if (authErr || !authUser) return res.status(401).json({ error: 'Invalid or expired token' })

  const userId = authUser.id

  const { data: { user: sbUser }, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr) return res.status(500).json({ error: getErr.message })

  // Paid users — always allowed, skip counting
  if (sbUser.app_metadata?.plan === 'paid') {
    return res.status(200).json({ allowed: true, pdfCount: null })
  }

  // Server-side trial expiry check (cannot be faked by changing system clock)
  const trialStartedAt = new Date(
    sbUser.user_metadata?.trial_started_at || sbUser.created_at
  )
  const daysElapsed = Math.floor((Date.now() - trialStartedAt) / 86_400_000)
  if (daysElapsed >= 30) {
    return res.status(200).json({
      allowed: false,
      expired: true,
      message: 'Tu período de prueba expiró. Suscribite para continuar.',
    })
  }

  // Increment pdf_count in app_metadata for analytics (no cap enforced)
  const currentCount = sbUser.app_metadata?.pdf_count ?? sbUser.user_metadata?.pdf_count ?? 0
  const newCount = currentCount + 1
  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...sbUser.app_metadata,
      pdf_count: newCount,
    },
  })
  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ allowed: true, pdfCount: newCount })
}
