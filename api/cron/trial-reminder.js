/**
 * GET /api/cron/trial-reminder
 * Daily cron — sends lifecycle emails to trial users based on days elapsed:
 *   Day 7  (no upload yet) → trialNoUploadEmail
 *   Day 20                 → trialCountdownEmail (10 days left)
 *   Day 28                 → trialCountdownEmail (2 days left, urgent)
 *   Day 30                 → trialExpiredEmail
 *   Day 37                 → trialWinBackEmail
 *
 * Tracks sent emails in app_metadata to prevent duplicates.
 * Protected by CRON_SECRET (Vercel injects it automatically).
 */
import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  trialNoUploadEmail,
  trialCountdownEmail,
  trialExpiredEmail,
  trialWinBackEmail,
} from '../_lib/email.js'

const TRIAL_DAYS = 30

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return res.status(500).json({ error: 'CRON_SECRET not configured' })
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch all users (paginated)
  let users = [], page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return res.status(500).json({ error: error.message })
    users.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }

  const results = { sent: 0, skipped: 0, errors: [] }

  for (const user of users) {
    const appMeta  = user.app_metadata  || {}
    const userMeta = user.user_metadata || {}
    const email    = user.email

    // Skip paid users and users without an email
    if (!email || appMeta.plan === 'paid') { results.skipped++; continue }

    const startedAt   = new Date(userMeta.trial_started_at || user.created_at)
    const daysElapsed = Math.floor((Date.now() - startedAt) / 86_400_000)
    const pdfCount    = appMeta.pdf_count ?? userMeta.pdf_count ?? 0

    let emailToSend = null
    let flagKey     = null

    if (daysElapsed >= 7 && daysElapsed <= 10 && pdfCount === 0 && !appMeta.email_no_upload_sent) {
      emailToSend = trialNoUploadEmail(email)
      flagKey     = 'email_no_upload_sent'
    } else if (daysElapsed >= 20 && daysElapsed <= 22 && !appMeta.email_countdown_20_sent) {
      emailToSend = trialCountdownEmail(email, TRIAL_DAYS - daysElapsed)
      flagKey     = 'email_countdown_20_sent'
    } else if (daysElapsed >= 28 && daysElapsed < TRIAL_DAYS && !appMeta.email_countdown_28_sent) {
      emailToSend = trialCountdownEmail(email, Math.max(1, TRIAL_DAYS - daysElapsed))
      flagKey     = 'email_countdown_28_sent'
    } else if (daysElapsed >= TRIAL_DAYS && daysElapsed <= 33 && !appMeta.email_expired_sent) {
      emailToSend = trialExpiredEmail(email)
      flagKey     = 'email_expired_sent'
    } else if (daysElapsed >= 37 && daysElapsed <= 40 && !appMeta.email_winback_sent) {
      emailToSend = trialWinBackEmail(email)
      flagKey     = 'email_winback_sent'
    } else {
      results.skipped++
      continue
    }

    try {
      const { ok, error: mailErr } = await sendEmail(emailToSend)
      if (!ok) throw new Error(mailErr)

      // Mark flag in app_metadata so we don't re-send
      await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { ...appMeta, [flagKey]: true },
      })
      results.sent++
    } catch (err) {
      results.errors.push({ email, flag: flagKey, error: err.message })
    }
  }

  return res.status(200).json({
    ok: true,
    processed: users.length,
    ...results,
  })
}
