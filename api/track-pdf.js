/**
 * POST /api/track-pdf
 * Server-side PDF tracking: validates trial limits and increments counter
 * in app_metadata (service_role — clients cannot self-reset the counter).
 * Requires header: Authorization: Bearer <supabase_access_token>
 *
 * Returns:
 *   { allowed: true, pdfCount, pdfLimit }
 *   { allowed: false, expired: true, message }
 *   { allowed: false, pdfLimit, pdfCount, message }
 */
import { createClient } from '@supabase/supabase-js'

const PDF_LIMIT = 3
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

  // Get full user with app_metadata via service_role
  const { data: { user: sbUser }, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr) return res.status(500).json({ error: getErr.message })

  // Paid users have no limit
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

  // Read pdf_count from app_metadata (authoritative) with fallback to user_metadata (legacy)
  const currentCount = sbUser.app_metadata?.pdf_count ?? sbUser.user_metadata?.pdf_count ?? 0

  if (currentCount >= PDF_LIMIT) {
    return res.status(200).json({
      allowed: false,
      pdfLimit: PDF_LIMIT,
      pdfCount: currentCount,
      message: `Límite de prueba: ya analizaste ${PDF_LIMIT} resúmenes. Suscribite para continuar.`,
    })
  }

  // Increment in app_metadata — only writable server-side
  const newCount = currentCount + 1
  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...sbUser.app_metadata,
      pdf_count: newCount,
    },
  })
  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ allowed: true, pdfCount: newCount, pdfLimit: PDF_LIMIT })
}
