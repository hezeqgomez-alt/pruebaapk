const KEY       = 'gasto_tracker_data'
const KEY_BUD   = 'easyresumen_budgets'
const KEY_FILT  = 'easyresumen_filters'
const KEY_DARK  = 'easyresumen_dark'
const KEY_CATS  = 'easyresumen_custom_categories'

function isValidDate(d) {
  if (!d || typeof d !== 'string') return false
  return !isNaN(Date.parse(d))
}

// ── Transactions ─────────────────────────────────────────────────────────────

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { transactions: [] }
    const data = JSON.parse(raw)
    if (data.transactions) {
      data.transactions = data.transactions.filter(t => t && isValidDate(t.date) && t.amount > 0)
    }
    return data
  } catch {
    return { transactions: [] }
  }
}

export function saveData(data) {
  const slim = {
    ...data,
    transactions: data.transactions?.map(({ raw, ...t }) => t),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(slim))
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('EasyResumen: localStorage quota exceeded, datos no guardados')
    }
  }
}

export function clearData() {
  localStorage.removeItem(KEY)
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export function loadBudgets() {
  try {
    const raw = localStorage.getItem(KEY_BUD)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveBudgets(budgets) {
  try { localStorage.setItem(KEY_BUD, JSON.stringify(budgets)) } catch { /* quota/private-mode */ }
}

// ── Filter preferences ────────────────────────────────────────────────────────

export function loadFilterPrefs() {
  try {
    const raw = localStorage.getItem(KEY_FILT)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveFilterPrefs(prefs) {
  try { localStorage.setItem(KEY_FILT, JSON.stringify(prefs)) } catch { /* quota/private-mode */ }
}

// ── Custom categories ─────────────────────────────────────────────────────────

export function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(KEY_CATS)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveCustomCategories(cats) {
  try { localStorage.setItem(KEY_CATS, JSON.stringify(cats)) } catch { /* quota/private-mode */ }
}

// ── Dark mode ─────────────────────────────────────────────────────────────────

export function loadDarkMode() {
  const val = localStorage.getItem(KEY_DARK)
  return val === null ? true : val === 'true'
}

export function saveDarkMode(val) {
  try { localStorage.setItem(KEY_DARK, String(val)) } catch { /* quota/private-mode */ }
}
