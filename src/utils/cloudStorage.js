import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function cloudLoad(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_data')
    .select('transactions, budgets, custom_categories')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function cloudSave(userId, { transactions, budgets, customCategories }) {
  if (!isSupabaseConfigured || !supabase || !userId) return
  const slim = transactions?.map(({ raw, ...t }) => t) ?? []
  const { error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        transactions: slim,
        budgets: budgets ?? {},
        custom_categories: customCategories ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (error) {
    console.error('cloudSave error:', error.code, error.message, error.details, error.hint)
    throw new Error(error.message)
  }
}
