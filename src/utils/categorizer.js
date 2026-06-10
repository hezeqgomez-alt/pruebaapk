export const CATEGORIES = {
  intereses:     { label: 'Intereses Financieros', color: '#f43f5e', icon: '💸' },
  mercadopago:   { label: 'Pagos con MercadoPago', color: '#00b1ea', icon: '💙' },
  alimentacion:    { label: 'Alimentación',         color: '#f59e0b', icon: '🍔' },
  supermercado:    { label: 'Supermercado',          color: '#10b981', icon: '🛒' },
  transporte:      { label: 'Transporte',            color: '#3b82f6', icon: '🚗' },
  combustible:     { label: 'Combustible',           color: '#6366f1', icon: '⛽' },
  entretenimiento: { label: 'Entretenimiento',       color: '#ec4899', icon: '🎬' },
  suscripciones:   { label: 'Suscripciones',         color: '#8b5cf6', icon: '📱' },
  salud:           { label: 'Salud',                 color: '#ef4444', icon: '💊' },
  mascotas:        { label: 'Mascotas',              color: '#f97316', icon: '🐾' },
  indumentaria:    { label: 'Indumentaria',          color: '#d97706', icon: '👕' },
  hogar:           { label: 'Hogar',                 color: '#84cc16', icon: '🏠' },
  educacion:       { label: 'Educación',             color: '#06b6d4', icon: '📚' },
  viajes:          { label: 'Viajes',                color: '#0ea5e9', icon: '✈️' },
  tecnologia:      { label: 'Tecnología',            color: '#7c3aed', icon: '💻' },
  restaurantes:    { label: 'Restaurantes',          color: '#dc2626', icon: '🍽️' },
  cafeterias:      { label: 'Cafeterías',            color: '#92400e', icon: '☕' },
  banco:           { label: 'Banco / Finanzas',      color: '#475569', icon: '🏦' },
  impuestos:       { label: 'Impuestos / Servicios', color: '#64748b', icon: '📄' },
  donaciones:      { label: 'Donaciones',            color: '#14b8a6', icon: '❤️' },
  otros:           { label: 'Otros',                 color: '#94a3b8', icon: '📦' },
}

// ─── Rules ────────────────────────────────────────────────────────────────────
// Order matters: first match wins. More specific patterns come before broad ones.

const RULES = [
  // ── Intereses Financieros ─────────────────────────────────────────────────────
  { cat: 'intereses', kw: [
    'interes financiero', 'intereses financieros',
    'interes por financiacion', 'intereses por financiacion',
    'interes financiacion', 'intereses financiacion',
    'interes de financiacion', 'intereses de financiacion',
    'interes s/ saldo', 'intereses s/ saldo', 'interes s/saldo',
    'cargo financiero', 'financiacion automatica', 'financiacion automat',
    'interes mora', 'intereses mora', 'recargo financiero',
    'costo financiero', 'interes punitorio', 'intereses punitorios',
    'interes compra', 'intereses compra',
  ]},

  // ── MercadoPago / MercadoLibre ───────────────────────────────────────────────
  { cat: 'mercadopago', kw: [
    'mercadopago', 'mercado pago', 'mercadolibre', 'mercado libre',
    'merpago', 'mercpago', 'meli ',
  ]},

  // ── Donaciones ───────────────────────────────────────────────────────────────
  { cat: 'donaciones', kw: [
    'garrahan', 'fund garrahan', 'fundgarrahan', 'fundacion', 'fund ',
    'donacion', 'donativo', 'caritas', 'unicef', 'greenpeace',
    'fundacion techo', 'techo argentina',
    'red solidaria', 'banco de alimentos', 'medicos sin fronteras',
    'aldeas infantiles', 'oxfam', 'acnur',
  ]},

  // ── Mascotas ────────────────────────────────────────────────────────────────
  { cat: 'mascotas', kw: [
    'veterinari', 'vet ', 'petshop', 'pet shop', 'pet store',
    'zoonosis', 'pedigree', 'purina', 'whiskas', 'royal canin', 'eukanuba',
    'bravecto', 'frontline', 'rienda', 'mascotas', 'tienda animal',
  ]},

  // ── Supermercados ────────────────────────────────────────────────────────────
  { cat: 'supermercado', kw: [
    'carrefour', ' disco ', 'jumbo', 'walmart', ' coto ', ' dia ', ' vea ',
    'la anonima', 'chango mas', 'changomas', 'makro', 'atomo',
    'hiper libertad', 'la gallega', ' toledo ', 'cencosud',
    'hipermayor', 'yaguar', 'diarco', 'maxiconsumo', 'el super', 'mi super',
    'tattersall', 'vital', 'supermercado', 'supermarket',
    'almacen', 'despensa', 'autoservicio', 'minimarket',
    'verduleria', 'fruteria', 'carniceria', 'pescaderia',
    'fiambreria', 'lacteos', 'panaderia', 'rotiseria',
    'cooperativa de consumo',
    // Cadenas argentinas identificadas por nombre abreviado en MERPAGO
    'open25',   // Open 25 Hs — drugstore/kiosco 24hs, +300 sucursales nacional
    'supermarc', // Supermercados Marc — regional CABA/GBA
  ]},

  // ── Entretenimiento (venues conocidos antes de coincidencias amplias) ─────────
  { cat: 'entretenimiento', kw: [
    'movistar arena', 'luna park', 'teatro colon', 'teatro colon',
    'vorterix', 'gran rex', 'opera cine', 'teatro la plata',
    'cine ', 'cinema', 'hoyts', 'village ', 'showcase', 'cinemark', 'cinepolis',
    'teatro ', 'show ', 'espectaculo', 'concierto', 'recital', 'evento ',
    'ticket', 'entradas', 'boliche', 'discoteca', 'after ', 'cerveceria',
    'brewhouse', 'globos', 'cotillon', 'souvenirs',
    'steam ', 'playstation store', 'ps store', 'xbox ', 'nintendo',
    'epic games', 'twitch', 'gog ', 'origin ', 'uplay',
    'blizzard', 'riot games', 'betway', 'codere', 'bingo', 'casino',
  ]},

  // ── Suscripciones / Telecomunicaciones ───────────────────────────────────────
  { cat: 'suscripciones', kw: [
    'netflix', 'disney', 'hbo', 'disneypl', 'paramount', 'star+',
    'primevideo', 'prime video', 'amazon prime',
    'flow ', 'directv', 'telecentro', 'cablevision', 'fibertel',
    'spotify', 'deezer', 'tidal', 'apple music',
    'crunchyroll', 'mubi ', 'hbo max', 'youtube',
    // Apple: antes de que 'apple ' genérico quede sin categoría
    'apple.com', 'apple com', 'apple tv', 'apple one', 'apple arcade',
    'apple storage', 'icloud',
    // Sony servicios (antes de 'sony ' en hogar)
    'sony one', 'sony music', 'sony liv',
    // Google (any product: One, Play, GSuite, Workspace, Services…)
    'google', 'gsuite', 'google workspace',
    // Microsoft / cloud
    'microsoft 365', 'office 365', 'dropbox',
    // Productividad / software
    'adobe', 'canva ', 'figma', 'notion ', 'slack ', 'zoom ', 'github ',
    'chatgpt', 'openai', 'linkedin premium', 'duolingo', 'rosetta',
    'quillbot', 'audible', 'kindle',
    // Telefonía argentina (usar nombres específicos para evitar "PERSONAL TRAINER" → suscripciones)
    'personal ar', 'personal prepago', 'personal movil', 'claro ', 'movistar', 'tuenti', 'telecom',
    'tigo ', 'nextel', 'telefonica', 'arnet', 'speedy',
    'coop tel', 'cooperativa telefonica',
  ]},

  // ── Restaurantes ─────────────────────────────────────────────────────────────
  { cat: 'restaurantes', kw: [
    'restaurant', 'restoran', 'barra ', 'asador', 'parrilla', 'tenedor libre',
    'bodegon', 'cantina', 'trattoria', 'sushi', 'wok ', 'china ',
    'buffet', 'comedor', 'gastronomia', 'grill ', 'burger ',
    'hamburgu', 'pizzeria', 'pizza ', ' pizz ', 'empanada', 'sandwicheria',
    'arabe ', 'thai ', 'mexicano', 'vegetarian',
    'tosta', 'selectos', 'parrillada', 'churrasco',
    'big pizza', 'big pizz',   // Big Pizza — cadena nacional argentina
  ]},

  // ── Cafeterías ────────────────────────────────────────────────────────────────
  { cat: 'cafeterias', kw: [
    'starbucks', 'sbux',         // Starbucks (sbux = abrev. en resúmenes)
    'cafe martinez', 'cafe havanna', 'cafe tortoni', 'havanna',
    'freddo', 'grido', 'via resto', 'bonafide', 'tienda de cafe',
    'cafe ', 'cafeteria', 'caffe', ' bar ', 'confiteria',
    'heladeria', 'gelateria', 'helado', 'factura ', 'medialunas',
    'caramel', 'nero ', 'rapanui', 'laquinta', 'el noble',
    'caffe truffa', 'truffacafe', // Caffè Truffa — Lavalle 372 CABA
  ]},

  // ── Comida rápida / delivery ─────────────────────────────────────────────────
  { cat: 'alimentacion', kw: [
    'mcdonalds', 'mcdonald', 'burger king', 'burgerking', 'kfc ',
    'subway ', 'pizza hut', 'pizzahut', 'dominos', 'papa johns',
    'mostaza ', 'kentucky', 'wendy', 'taco bell',
    'rappi', 'pedidosya', 'pedidos ya', 'glovo', 'ifood',
    'uber eats', 'delivery', 'propina',
    'milanesa', 'empanadas', 'lomito', 'choripan', 'pancho',
    'hot dog', 'milanesas', 'comida ',
  ]},

  // ── Transporte ───────────────────────────────────────────────────────────────
  { cat: 'transporte', kw: [
    'uber', 'cabify', 'didi ', 'beat ', 'indriver', 'in driver',
    'taxi', 'remis', 'transfer ', 'shuttle', 'colectivo', 'subte',
    ' sube ', ' tren ', 'metrobus', 'movibus', 'ecobici', 'scooter',
    'moto taxi', 'aeropuerto bus', 'omnibus',
    'flecha bus', 'flechabus', 'via bariloche', 'andesmar',
    ' cata ', ' jac ', 'plusmar', 'el rapido', 'flybondi express',
    // Peajes
    'telepase', 'peaje', 'ausol', 'aubasa', 'caminos del rio', 'autopistas del sol',
    // Neumáticos y mecánica
    'neumen', 'neumatico', 'gomeria', 'auxilio mecanico',
    'taller mecanico', 'mecanica automotriz', 'repuesto automotor',
    // Estacionamiento
    'seeker',     // Seeker Parking — reserva de cocheras en eventos (MERPAGOSEEKER)
    'parkimovil', 'estacionamiento', 'cochera', 'parking',
  ]},

  // ── Combustible ──────────────────────────────────────────────────────────────
  { cat: 'combustible', kw: [
    'ypf', 'shell ', 'axion', 'puma energy', 'petrobras', 'oil combustible',
    'refinor', 'eg3', 'dapsa', 'nafta', 'combustible', 'gasoil',
    'gasolina', 'estacion de servicio', 'service station', 'surtidor',
  ]},

  // ── Salud ─────────────────────────────────────────────────────────────────────
  { cat: 'salud', kw: [
    'farma', 'drogueria',
    'osde', 'omint', 'swiss medical', 'medicus', 'galeno', 'accord',
    'sancor salud', 'hospital', 'clinica', 'sanatorio',
    'consultorio', 'medico', 'doctor', 'odontologia', 'dentista',
    'odontologo', 'optica', 'laboratorio', 'bioquimica', 'diagnostico',
    'prepaga', 'obra social', 'emergencias', 'ambulancia',
    'pami ', 'ioma ', 'vacunatorio', 'farmaplus',
    'fisioterapia', 'kinesiologia', 'psicologia', 'psiquiatria',
    'nutricionista', 'gym', 'gimnasio', 'personal trainer',
    'pilates', 'yoga', 'meditacion',
    'italaqua',
  ]},

  // ── Indumentaria ─────────────────────────────────────────────────────────────
  { cat: 'indumentaria', kw: [
    'stock center', 'dafiti', 'dexter', 'sportline', 'grimoldi', 'solodeportes',
    'zara', 'h&m', 'pull&bear', 'bershka', 'stradivarius',
    'adidas', 'nike ', 'puma ', 'lacoste', 'levis', 'levi ',
    'tommy', 'gap ', 'forever 21', 'rapsodia', 'legacy ', 'mimo ',
    'wanama', 'bensimon', 'tucci', 'kosiuko', 'carmela', 'sarkany',
    'prune', 'mishka', 'complot', 'akiabara', 'atlas ', 'cheeky',
    'paula cahen', 'montagne', 'topper', 'fila ', 'umbro', 'reebok',
    'new balance', 'vans ', 'converse', 'gucci', 'louis vuitton',
    'chanel ', 'prada ', 'ropa ', 'calzado', 'zapatillas', 'botines',
    'sandalias', 'camisa', 'vestido', 'jean ', 'indumentaria',
    'boutique', 'moda ', 'outlet',
  ]},

  // ── Hogar y servicios del hogar ──────────────────────────────────────────────
  { cat: 'hogar', kw: [
    'easy ', 'sodimac', 'homecenter', 'blaisten', 'pintureria', 'pintur',
    'ferreteria', 'corralon', 'maderas', 'plomeria', 'electricidad',
    'brico', 'bricco', 'bricolaje', 'herramientas',
    // Energía y utilidades
    'gas natural', 'edesur', 'edenor', 'edelap', 'cammesa',
    'metrogas', 'naturgy', 'camuzzi', 'fenixenergia', 'fenix energia',
    'energia ', 'distribuidora gas',
    'aguas', 'aysa', 'absa',
    // Electrodomésticos
    'garbarino', 'fravega', 'musimundo', 'whirlpool',
    'samsung', 'lg ', 'sony ', 'philips', 'electrolux',
    // Seguridad
    'cerrajeria', 'alarma', 'prosegur', 'securitas',
    // Muebles / decoración
    'muebles', 'colchon', 'sommier', 'bazar', 'menaje',
    'vajilla', 'manteleria', 'cortinas', 'alfombra',
    // Limpieza — marcas cortas con espacio inicial y final para evitar
    // falsos positivos por substring ("uala " → 'ala ', "space " → 'ace ')
    'limpieza', ' ala ', ' ariel ', ' skip ', ' drive ', ' ace ',
    'lysoform', 'detergente', 'desodorante ambiental', 'iluminacion',
    // Electro / hogar argentinos
    ' rodo ', 'hiper rodo', 'cetrogar', 'naldo', 'ribeiro', 'on city',
    // Energía provincial
    'ecogas', 'litoral gas', 'epec ', 'edemsa', 'edea ',
    // Artículos para bebés / puericultura
    'panalera', 'pañalera',   // pañalerías (Delta, etc.)
    'panalonce', 'panal once', // Pañal Once — Once CABA
    'briccone',               // Briccone — artículos de bebés, La Paternal CABA
    'puericultura', 'cochecito', 'chupete',
  ]},

  // ── Educación ─────────────────────────────────────────────────────────────────
  { cat: 'educacion', kw: [
    // Universidades: nombres completos — 'austral'/'palermo'/'belgrano' solos son
    // aerolíneas y barrios, no universidades
    'universidad', 'facultad', 'uba ', 'uca ', 'udesa',
    'universidad austral', 'univ austral',
    'universidad de palermo', 'univ palermo',
    'universidad de belgrano', 'univ belgrano',
    'uade', 'utn ', 'unlp', 'unsam',
    'colegio', 'escuela', 'instituto', 'jardin', 'guarderia',
    'academia', 'capacitacion', 'curso ', 'seminario',
    'platzi', 'udemy', 'coursera', 'edx ', 'domestika',
    'coderhouse', 'acamica', 'henry ', 'digitalhouse', 'wolox',
    'egg ', 'scholarships',
    'libreria', 'librerias', 'el ateneo', 'distal', ' libro ',
    'rayuela', 'crisol', 'yenny',
    'brisetulibrer', 'brise ',  // Brise Tu Librería — Barracas CABA
  ]},

  // ── Viajes y turismo ──────────────────────────────────────────────────────────
  { cat: 'viajes', kw: [
    'despegar', 'booking', 'airbnb', 'hotels', 'trivago', 'tripadvisor',
    'expedia', 'hotel ', 'apart ', 'hostel', 'motel ', 'cabana',
    'posada', 'alojamiento',
    'aerolineas', 'austral lineas', 'latam', 'flybondi', 'jetsmart',
    'aeromexico', 'american airlines', ' copa ', ' gol ', ' lan ', 'vuelo',
    'pasaje', 'turismo', 'agencia de viajes',
    'almundo', 'hoteles', 'assist card', 'assistcard',
    'rent a car', 'avis ', 'hertz ', 'europcar',
    'carlos paz', 'bariloche', 'ushuaia', 'iguazu',
  ]},

  // ── Tecnología ────────────────────────────────────────────────────────────────
  { cat: 'tecnologia', kw: [
    'amazon ', 'ebay ', 'aliexpress', 'wish ',
    'app store', 'appstore', 'compranet',
    'dell ', 'hp ', 'lenovo', 'asus ', 'intel ', 'amd ', 'nvidia',
    'crucial', 'kingston', 'western digital', 'seagate',
    'pc factory', 'compuservice', 'megatone', 'maxihogar',
    'nexo ', 'bangho', 'compumundo', 'grupo nucleo',
    'notebook', 'monitor', 'teclado', 'mouse ', 'impresora',
    'camara', 'celular', 'smartphone', 'tablet',
    'auricular', 'parlante', 'proyector', 'cable ',
    'cargador', 'power bank',
  ]},

  // ── Banco / Finanzas ──────────────────────────────────────────────────────────
  { cat: 'banco', kw: [
    'banco galicia', 'banco bbva', 'banco santander', 'banco macro',
    'banco nacion', 'bna ', 'banco patagonia', 'banco ciudad',
    'banco supervielle', 'banco hipotecario', 'banco comafi',
    'banco credicoop', 'icbc ', 'hsbc ', 'itau ', 'bradesco', 'scotiabank',
    'debito automatico', 'debin ', 'transferencia ',
    'comision bancaria', 'mantenimiento cuenta',
    'seguro de vida', 'seguro de tarjeta',
    'retiro atm', 'extraccion cajero',
    'brubank', 'uala ', 'naranja x', 'naranja ', 'prex ', 'lemon ',
    'modo ', 'cuenta dni', 'western union',
    'cuenta dolar', 'fci ', 'fondo comun', 'cauciones', 'plazo fijo',
    'mobbex', 'todopago', 'todo pago', 'pomelo',
  ]},

  // ── Impuestos / Servicios ─────────────────────────────────────────────────────
  { cat: 'impuestos', kw: [
    'afip', 'arba', 'agip', 'rentas ', 'municipalidad', 'impuesto',
    'tasa ', 'ingresos brutos', 'iva ', 'sellado', 'abl ', 'patente',
    'automotor', 'bien de uso',
    // Seguros
    'seguro ', 'seguros', 'cia seg', 'aseguradora', 'segurcoop',
    'allianz', 'zurich', 'mapfre', 'sancor seguros',
    'federacion patronal', 'berkley', 'rio uruguay', 'nacion seguros',
    // Cobro / envíos / pagos
    'trenes argentinos', 'autopistas', 'ausa ', 'osm ',
    'correo argentino', 'andreani', ' oca ', 'fedex ', 'dhl ',
    'rapipago', 'pagofacil', 'cobroexpress', 'pago mis cuentas',
  ]},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Like normalize but without .trim() — preserves leading/trailing spaces so
// keywords like 'bar ' act as word-boundary guards when matched against a
// padded description (' ' + n + ' ').
function normalizeKw(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
}

// Payment gateway prefixes that concatenate the merchant name without spaces
// e.g. "MERPAGOMOSTAZA" → merchant "MOSTAZA", "PAYU*AR*UBER" → "UBER"
const GATEWAY_PREFIXES = [
  /^merpago[*\s]*/i,
  /^mp[*\s]+(?:ar[*\s]*)?/i,
  /^payu[*\s]+ar[*\s]*/i,
  /^payu[*\s]*/i,
  /^dlopedidosya[*\s]*/i,
  /^dlo[*\s]*/i,
  /^sipago[*\s]*/i,
  /^mobbex[*\s]*/i,
  /^todopago[*\s]*/i,
  /^cnp[*\s]+\d+[/\d]*/i,
  /^pvs[*\s]*/i,
]

function extractMerchant(desc) {
  for (const re of GATEWAY_PREFIXES) {
    const m = desc.match(re)
    if (m && m[0].length < desc.length) return desc.slice(m[0].length).trim()
  }
  return null
}

// Resolve well-known abbreviations that appear in gateway-stripped merchant
// names and wouldn't otherwise match any keyword.
// Keys are lowercase normalized merchant names (or prefixes).
function resolveAlias(merchant) {
  const m = merchant.toLowerCase().trim()
  // Starbucks uses SBUX (stock ticker) as internal abbreviation
  // e.g. SBUXESPEJO, SBUXRECOLETA, SBUX*PALERMO
  if (m.startsWith('sbux')) return 'starbucks'
  // McDonald's uses MCD in some gateways
  if (m.startsWith('mcd') && m.length <= 8) return 'mcdonalds'
  // YPF may appear abbreviated
  if (m === 'ypf' || m.startsWith('ypf ') || m.startsWith('ypf*')) return 'ypf'
  // Pedidos Ya shorthand
  if (m.startsWith('pedya') || m.startsWith('pdya')) return 'pedidosya'
  return merchant
}

// Pre-normalize keywords once at module load — avoids re-normalizing ~300 kw × n transactions
const RULES_N = RULES.map(rule => ({ cat: rule.cat, kw: rule.kw.map(normalizeKw) }))

// ─── Main export ──────────────────────────────────────────────────────────────

export function categorize(description) {
  if (!description) return 'otros'

  // ── 1. Gateway merchant extraction — runs FIRST ───────────────────────────
  // Without this order, the 'merpago' keyword in the mercadopago rule would
  // fire on every MERPAGO* transaction before we can identify the real
  // merchant: MERPAGOMOSTAZA → mercadopago (wrong) instead of alimentacion.
  const merchant = extractMerchant(description)
  if (merchant && merchant.length >= 3) {
    const resolved = resolveAlias(merchant)
    const mnp = ' ' + normalize(resolved) + ' '
    for (const rule of RULES_N) {
      if (rule.kw.some(k => mnp.includes(k))) return rule.cat
    }
  }

  // ── 2. Full-description rules (fallback) ──────────────────────────────────
  // Catches 'merpago' → mercadopago when the merchant couldn't be classified,
  // direct transactions (NETFLIX, SPOTIFY, etc.), and non-gateway descriptions.
  const np = ' ' + normalize(description) + ' '
  for (const rule of RULES_N) {
    if (rule.kw.some(k => np.includes(k))) return rule.cat
  }

  return 'otros'
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function detectUnnecessary(transactions) {
  const findings = []

  // Recurring subscriptions (same description ≥ 2 times, category = suscripciones)
  const byDesc = {}
  for (const t of transactions) {
    const key = normalize(t.description).slice(0, 25)
    if (!byDesc[key]) byDesc[key] = []
    byDesc[key].push(t)
  }
  for (const txs of Object.values(byDesc)) {
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

  // High food/delivery frequency in a single month
  const foodByMonth = {}
  for (const t of transactions.filter(t =>
    ['alimentacion', 'restaurantes', 'cafeterias'].includes(t.category)
  )) {
    const key = t.date.slice(0, 7)
    if (!foodByMonth[key]) foodByMonth[key] = []
    foodByMonth[key].push(t)
  }
  for (const [month, txs] of Object.entries(foodByMonth)) {
    if (txs.length > 10) {
      findings.push({
        type: 'highFrequency',
        label: 'Alto gasto en comida / delivery',
        description: `${txs.length} transacciones en ${month}`,
        count: txs.length,
        total: txs.reduce((s, t) => s + t.amount, 0),
        transactions: txs,
      })
    }
  }

  // Merchant concentration: one merchant > 50% of its category total
  // Precompute normalized descriptions once to avoid O(n²) repeated normalize() calls
  const normDescCache = new Map()
  const getNorm = t => {
    const k = t.id ?? t.description
    if (!normDescCache.has(k)) normDescCache.set(k, normalize(t.description).slice(0, 20))
    return normDescCache.get(k)
  }

  const catTotals = {}
  const catCounts = {}
  const merchantTotals = {}
  const merchantTxs = {} // mk → array of transactions
  for (const t of transactions) {
    if (t.type === 'credit') continue
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount
    catCounts[t.category] = (catCounts[t.category] || 0) + 1
    const mk = `${t.category}|${getNorm(t)}`
    merchantTotals[mk] = (merchantTotals[mk] || 0) + t.amount
    if (!merchantTxs[mk]) merchantTxs[mk] = []
    merchantTxs[mk].push(t)
  }
  for (const [mk, amt] of Object.entries(merchantTotals)) {
    const [cat, desc] = mk.split('|')
    const catTotal = catTotals[cat] || 0
    // Require ≥3 transactions in the category before flagging concentration
    if (catTotal > 0 && (catCounts[cat] || 0) >= 3 && amt / catTotal > 0.5) {
      if (!findings.some(f => normalize(f.description).startsWith(desc))) {
        findings.push({
          type: 'concentration',
          label: 'Gasto concentrado en un comercio',
          description: `"${desc}" representa el ${Math.round((amt / catTotal) * 100)}% de ${CATEGORIES[cat]?.label || cat}`,
          count: merchantTxs[mk].length,
          total: amt,
          transactions: merchantTxs[mk],
        })
      }
    }
  }

  // Completed installment plans — last cuota paid, amount freed next period.
  // Use slot-based tracking: each distinct purchase gets its own slot, even when
  // two purchases share the same merchant, amount and installment count (e.g. two
  // NEUMEN C.6/6 at $44,530 each). A transaction updates an existing slot only
  // if that slot has a lower installment number (same plan, later month); otherwise
  // it opens a new slot (different purchase).
  const planSlots = [] // { descKey, amount, total, current, t }
  for (const t of transactions) {
    if (!t.installment || t.type === 'credit' || t.installment.total < 2) continue
    const descKey = normalize(t.description).slice(0, 35)
    let updated = false
    for (const s of planSlots) {
      if (s.descKey === descKey &&
          Math.abs(s.amount - t.amount) < 1 &&
          s.total === t.installment.total &&
          s.current < t.installment.current) {
        s.current = t.installment.current
        s.t = t
        updated = true
        break
      }
    }
    if (!updated) {
      planSlots.push({ descKey, amount: t.amount, total: t.installment.total, current: t.installment.current, t })
    }
  }
  const mostRecentDate = transactions.reduce(
    (max, t) => (t.date > max ? t.date : max), '0000-00-00'
  )
  // Group completed slots by description and sum freed amounts
  const completedByDesc = new Map()
  for (const s of planSlots) {
    if (s.current !== s.total) continue
    const ageDays = (new Date(mostRecentDate) - new Date(s.t.date)) / 86400000
    if (ageDays > 365) continue
    if (!completedByDesc.has(s.descKey)) {
      completedByDesc.set(s.descKey, { t: s.t, totalAmount: 0, txs: [] })
    }
    const entry = completedByDesc.get(s.descKey)
    entry.totalAmount += s.amount
    entry.txs.push(s.t)
    if (s.t.date > entry.t.date) entry.t = s.t
  }
  for (const { t, totalAmount, txs } of completedByDesc.values()) {
    findings.push({
      type: 'lastInstallment',
      label: '¡Última cuota pagada!',
      description: `"${t.description}" — ${t.installment.total} cuotas completadas. Ya no aparece en el próximo resumen.`,
      total: totalAmount,
      completedDate: t.date,
      transactions: txs,
    })
  }

  return findings
}
