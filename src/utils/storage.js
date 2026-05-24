const KEY = 'gasto_tracker_data'

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { transactions: [] }
    return JSON.parse(raw)
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
