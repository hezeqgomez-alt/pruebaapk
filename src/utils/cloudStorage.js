import { supabase } from '../lib/supabase'

/**
 * Carga transactions, budgets y custom_categories desde Supabase.
 * Devuelve null si no hay datos o hay error.
 */
export async function cloudLoad(userId) {
  if (!supabase || !userId) return null
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('transactions, budgets, custom_categories')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      console.warn('[cloudStorage] load error:', error.message)
      return null
    }
    return data || null
  } catch (e) {
    console.warn('[cloudStorage] load exception:', e.message)
    return null
  }
}

/**
 * Guarda transactions, budgets y custom_categories en Supabase (upsert).
 * Silencia errores — el localStorage ya tiene los datos seguros.
 */
export async function cloudSave(userId, { transactions, budgets, customCategories }) {
  if (!supabase || !userId) return
  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        transactions: transactions ?? [],
        budgets: budgets ?? {},
        custom_categories: customCategories ?? {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) console.warn('[cloudStorage] save error:', error.message)
  } catch (e) {
    console.warn('[cloudStorage] save exception:', e.message)
  }
}
