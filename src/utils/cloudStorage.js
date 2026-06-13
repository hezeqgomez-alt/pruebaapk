import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function cloudLoad(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null
  // Try with custom_categories first; fall back if the column doesn't exist yet
  let { data, error } = await supabase
    .from('user_data')
    .select('transactions, budgets, custom_categories')
    .eq('user_id', userId)
    .maybeSingle()
  if (error?.message?.includes('custom_categories')) {
    ;({ data, error } = await supabase
      .from('user_data')
      .select('transactions, budgets')
      .eq('user_id', userId)
      .maybeSingle())
  }
  if (error) throw new Error(error.message)
  return data
}

export async function cloudSave(userId, { transactions, budgets, customCategories }) {
  if (!isSupabaseConfigured || !supabase || !userId) return
  const slim = transactions?.map(({ raw, ...t }) => t) ?? []
  const payload = {
    user_id: userId,
    transactions: slim,
    budgets: budgets ?? {},
    custom_categories: customCategories ?? {},
    updated_at: new Date().toISOString(),
  }
  let { error } = await supabase
    .from('user_data')
    .upsert(payload, { onConflict: 'user_id' })
  // Retry without custom_categories if the column doesn't exist in the DB yet
  if (error?.message?.includes('custom_categories')) {
    const { custom_categories: _, ...payloadWithout } = payload
    ;({ error } = await supabase
      .from('user_data')
      .upsert(payloadWithout, { onConflict: 'user_id' }))
  }
  if (error) {
    console.error('cloudSave error:', error.code, error.message, error.details, error.hint)
    throw new Error(error.message)
  }
}
