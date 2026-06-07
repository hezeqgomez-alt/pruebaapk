import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function cloudLoad(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('transactions, budgets')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) { console.warn('cloudLoad error:', error.message); return null }
    return data
  } catch (e) { console.warn('cloudLoad exception:', e); return null }
}

export async function cloudSave(userId, { transactions, budgets }) {
  if (!isSupabaseConfigured || !supabase || !userId) return
  try {
    const slim = transactions?.map(({ raw, ...t }) => t) ?? []
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, transactions: slim, budgets: budgets ?? {}, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.warn('cloudSave error:', error.message)
  } catch (e) { console.warn('cloudSave exception:', e) }
}
