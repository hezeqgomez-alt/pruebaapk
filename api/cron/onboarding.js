/**
 * GET /api/cron/onboarding
 * Cron job diario: envía email de onboarding a usuarios registrados hace ~48 hs
 * que todavía no recibieron el email (onboarding_email_sent != true).
 *
 * Protegido por CRON_SECRET (Vercel lo inyecta automáticamente en el header
 * Authorization: Bearer <CRON_SECRET>).
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, onboardingEmail } from '../_lib/email.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch all users across all pages
  let users = [], page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return res.status(500).json({ error: error.message })
    users.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }

  const now = Date.now()
  const HOURS_48 = 48 * 60 * 60 * 1000
  const HOURS_72 = 72 * 60 * 60 * 1000 // upper bound: don't email users registered > 72h ago

  const targets = users.filter(u => {
    if (!u.email) return false
    if (u.user_metadata?.onboarding_email_sent) return false
    const age = now - new Date(u.created_at).getTime()
    return age >= HOURS_48 && age <= HOURS_72
  })

  let sent = 0
  let failed = 0

  for (const u of targets) {
    const result = await sendEmail(onboardingEmail(u.email))
    if (result.ok) {
      // Mark as sent to avoid resending
      await supabase.auth.admin.updateUserById(u.id, {
        user_metadata: { ...u.user_metadata, onboarding_email_sent: true },
      })
      sent++
    } else {
      console.error(`Onboarding email failed for ${u.email}:`, result.error)
      failed++
    }
  }

  return res.status(200).json({ ok: true, sent, failed, checked: targets.length })
}
