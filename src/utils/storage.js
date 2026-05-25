const KEY = 'gasto_tracker_data'

function isValidDate(d) {
  if (!d || typeof d !== 'string') return false
  const parsed = Date.parse(d)
  return !isNaN(parsed)
}

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
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function clearData() {
  localStorage.removeItem(KEY)
}
