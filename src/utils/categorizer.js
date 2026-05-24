export const CATEGORIES = {
  alimentacion: { label: 'Alimentación', color: '#f59e0b', icon: '🍔' },
  supermercado: { label: 'Supermercado', color: '#10b981', icon: '🛒' },
  transporte: { label: 'Transporte', color: '#3b82f6', icon: '🚗' },
  combustible: { label: 'Combustible', color: '#6366f1', icon: '⛽' },
  entretenimiento: { label: 'Entretenimiento', color: '#ec4899', icon: '🎬' },
  suscripciones: { label: 'Suscripciones', color: '#8b5cf6', icon: '📱' },
  salud: { label: 'Salud', color: '#ef4444', icon: '💊' },
  indumentaria: { label: 'Indumentaria', color: '#f97316', icon: '👕' },
  hogar: { label: 'Hogar', color: '#84cc16', icon: '🏠' },
  educacion: { label: 'Educación', color: '#06b6d4', icon: '📚' },
  viajes: { label: 'Viajes', color: '#0ea5e9', icon: '✈️' },
  tecnologia: { label: 'Tecnología', color: '#7c3aed', icon: '💻' },
  otros: { label: 'Otros', color: '#94a3b8', icon: '📦' },
}

const RULES = [
  { category: 'supermercado', keywords: ['carrefour', 'disco', 'jumbo', 'walmart', 'coto', 'dia ', 'vea ', 'la anonima', 'chango mas', 'changomas', 'makro', 'atomo', 'supermercado', 'market'] },
  { category: 'alimentacion', keywords: ['mcdonalds', 'mcdonald', 'burger king', 'burgerking', 'kfc ', 'subway ', 'pizza hut', 'pizzahut', 'dominos', 'rappi', 'pedidosya', 'pedidos ya', 'glovo', 'ifood', 'starbucks', 'cafe', 'café', 'restaurant', 'restoran', 'pizzeria', 'hamburgues', 'sushi', 'delivery', 'bar ', 'confiteria', 'panaderia', 'heladeria', 'pasteleria', 'almacen', 'mercado', 'verduleria', 'carniceria'] },
  { category: 'transporte', keywords: ['uber', 'cabify', 'taxi', 'remis', 'sube ', 'subte', 'colectivo', 'peaje', 'autopista', 'estacionamiento', 'parking', 'didi ', 'beat ', 'in driver', 'indriver'] },
  { category: 'combustible', keywords: ['ypf', 'shell ', 'axion', 'puma ', 'petrobras', 'nafta', 'combustible', 'gasolinera', 'gasoil', 'estacion de servicio'] },
  { category: 'suscripciones', keywords: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'prime video', 'youtube premium', 'youtube music', 'apple music', 'deezer', 'flow ', 'directv', 'telecentro', 'fibertel', 'personal', 'claro ', 'movistar', 'tuenti', 'arnet', 'icloud', 'dropbox', 'microsoft 365', 'office 365', 'adobe', 'linkedin premium', 'duolingo', 'canva '] },
  { category: 'entretenimiento', keywords: ['cine', 'cinema', 'teatro', 'show ', 'concierto', 'evento', 'ticket', 'entradas', 'boliche', 'discoteca', 'steam ', 'playstation', 'xbox ', 'nintendo', 'epic games', 'mercado pago gaming'] },
  { category: 'salud', keywords: ['farmacia', 'osde', 'omint', 'swiss medical', 'medicus', 'hospital', 'clinica', 'clinica ', 'sanatorio', 'medico', 'doctor', 'odontologia', 'dentista', 'optica', 'laboratorio', 'diagnostico', 'prepaga', 'obra social'] },
  { category: 'indumentaria', keywords: ['zara', 'h&m', 'adidas', 'nike ', 'lacoste', 'levis', 'levi', 'gap ', 'forever 21', 'rapsodia', 'legacy ', 'mimo ', 'wanama', 'bensimon', 'ropa', 'indumentaria', 'calzado', 'zapatos', 'zapatillas'] },
  { category: 'hogar', keywords: ['ikea', 'easy ', 'sodimac', 'falabella', 'homecenter', 'casa ideas', 'homestore', 'el hogar', 'boulanger', 'garbarino', 'frávega', 'fravega', 'musimundo', 'rodo ', 'electro', 'whirlpool', 'muebleria'] },
  { category: 'educacion', keywords: ['universidad', 'colegio', 'escuela', 'instituto', 'cursillo', 'capacitacion', 'platzi', 'udemy', 'coursera', 'academia'] },
  { category: 'viajes', keywords: ['despegar', 'booking', 'airbnb', 'hotel', 'aerolinea', 'aerolínea', 'aerolineas', 'lan ', 'latan', 'latam', 'aeromexico', 'vuelo', 'flybondi', 'jetsmart', 'pasaje', 'hospedaje', 'hostel', 'motel'] },
  { category: 'tecnologia', keywords: ['apple store', 'google play', 'mercadolibre', 'mercado libre', 'amazon ', 'ebay ', 'aliexpress', 'musimundo', 'pc factory', 'smart', 'celular', 'compu', 'notebook', 'computacion'] },
]

export function categorize(description) {
  if (!description) return 'otros'
  const lower = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const rule of RULES) {
    if (rule.keywords.some(k => lower.includes(k.normalize('NFD').replace(/[̀-ͯ]/g, '')))) {
      return rule.category
    }
  }
  return 'otros'
}

export function detectUnnecessary(transactions) {
  const findings = []

  // Group by description similarity to find recurring charges
  const byDesc = {}
  for (const t of transactions) {
    const key = t.description.toLowerCase().slice(0, 20)
    if (!byDesc[key]) byDesc[key] = []
    byDesc[key].push(t)
  }

  // Suscripciones recurrentes
  for (const [key, txs] of Object.entries(byDesc)) {
    if (txs.length >= 2 && txs[0].category === 'suscripciones') {
      findings.push({
        type: 'subscription',
        label: 'Suscripción recurrente',
        description: txs[0].description,
        count: txs.length,
        total: txs.reduce((s, t) => s + t.amount, 0),
        transactions: txs,
      })
    }
  }

  // Gastos de alimentación muy frecuentes (más de 8 veces en un mes)
  const foodByMonth = {}
  for (const t of transactions.filter(t => t.category === 'alimentacion')) {
    const key = t.date.slice(0, 7)
    if (!foodByMonth[key]) foodByMonth[key] = []
    foodByMonth[key].push(t)
  }
  for (const [month, txs] of Object.entries(foodByMonth)) {
    if (txs.length > 8) {
      findings.push({
        type: 'highFrequency',
        label: 'Alta frecuencia en delivery/comida',
        description: `${txs.length} gastos en ${month}`,
        count: txs.length,
        total: txs.reduce((s, t) => s + t.amount, 0),
        transactions: txs,
      })
    }
  }

  return findings
}
