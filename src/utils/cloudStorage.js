/**
 * Supabase cloud sync for transactions and budgets.
 * Uses a single `user_data` row per user (upsert pattern).
 * Falls back to localStorage silently on any error.
 */
import { supabase } from '../lib/supabase'

export async function cloudLoad(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('transactions, budgets')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function cloudSave(userId, { transactions, budgets }) {
  const slim = transactions?.map(({ raw, ...t }) => t)
  await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, transactions: slim, budgets, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
}
