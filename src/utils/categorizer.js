export const CATEGORIES = {
  alimentacion:    { label: 'Alimentación',      color: '#f59e0b', icon: '🍔' },
  supermercado:    { label: 'Supermercado',       color: '#10b981', icon: '🛒' },
  transporte:      { label: 'Transporte',         color: '#3b82f6', icon: '🚗' },
  combustible:     { label: 'Combustible',        color: '#6366f1', icon: '⛽' },
  entretenimiento: { label: 'Entretenimiento',    color: '#ec4899', icon: '🎬' },
  suscripciones:   { label: 'Suscripciones',      color: '#8b5cf6', icon: '📱' },
  salud:           { label: 'Salud',              color: '#ef4444', icon: '💊' },
  indumentaria:    { label: 'Indumentaria',       color: '#f97316', icon: '👕' },
  hogar:           { label: 'Hogar',              color: '#84cc16', icon: '🏠' },
  educacion:       { label: 'Educación',          color: '#06b6d4', icon: '📚' },
  viajes:          { label: 'Viajes',             color: '#0ea5e9', icon: '✈️' },
  tecnologia:      { label: 'Tecnología',         color: '#7c3aed', icon: '💻' },
  restaurantes:    { label: 'Restaurantes',       color: '#dc2626', icon: '🍽️' },
  cafeterias:      { label: 'Cafeterías',         color: '#92400e', icon: '☕' },
  banco:           { label: 'Banco / Finanzas',   color: '#475569', icon: '🏦' },
  impuestos:       { label: 'Impuestos / Servicios', color: '#64748b', icon: '📄' },
  otros:           { label: 'Otros',              color: '#94a3b8', icon: '📦' },
}

const RULES = [
  // Supermercados
  { cat: 'supermercado', kw: ['carrefour','disco','jumbo','walmart','coto ','dia ','vea ','la anonima','chango mas','changomas','makro','atomo','tattersall','walmart','vital','super','supermercado','market','hipermayor','yaguar','diarco','maxiconsumo','el super','mi super','la plata','cooperativa'] },
  // Almacenes / despensas
  { cat: 'supermercado', kw: ['almacen','despensa','autoservicio','minimarket','verduleria','fruteria','carniceria','pescaderia','fiambreria','lacteos','panaderia','rotiseria'] },
  // Restaurantes
  { cat: 'restaurantes', kw: ['restaurant','restoran','barra','asador','parrilla','tenedor libre','bodegon','cantina','trattoria','sushi','wok','china','buffet','comedor','merendero','rotisería','cocina','gastronomia','grill','burger','hamburgues','pizzeria','pizza','empanada','sandwicheria','arabe','persa','thai','mexicano','vegetarian'] },
  // Cafeterías
  { cat: 'cafeterias', kw: ['starbucks','cafe martinez','cafe havanna','cafe tortoni','havanna','freddo','grido','via resto','bonafide','tienda de cafe','cafe ','cafeteria','bar ','confiteria','heladeria','gelateria','helado','facturia','medialunas'] },
  // Comida rápida / delivery
  { cat: 'alimentacion', kw: ['mcdonalds','mcdonald','burger king','burgerking','kfc ','subway ','pizza hut','pizzahut','dominos','papa johns','mostaza ','kentucky','wendy','taco bell','rappi','pedidosya','pedidos ya','glovo','ifood','uber eats','rapido','delivery','milanesa','empanadas','lomito','choripan','pancho','hot dog','milanesas'] },
  // Transporte
  { cat: 'transporte', kw: ['uber','cabify','didi ','beat ','indriver','in driver','taxi','remis','transfer','shuttle','colectivo','subte','sube ','tren ','metrobus','movibus','ecobici','scooter','moto taxi','aeropuerto bus','omnibus','flecha bus','flechabus','via bariloche','andesmar','cata ','jac ','plusmar','el rapido','flybondi express'] },
  // Combustible
  { cat: 'combustible', kw: ['ypf','shell ','axion','puma ','petrobras','oil combustible','refinor','eg3','dapsa','nafta','combustible','gasoil','gasolina','estacion de servicio','service station','surtidor'] },
  // Streaming y suscripciones digitales
  { cat: 'suscripciones', kw: ['netflix','spotify','disney','hbo','amazon prime','prime video','youtube premium','youtube music','apple music','apple tv','apple one','apple arcade','deezer','tidal','flow ','directv','telecentro','cablevision','fibertel','arnet','speedy','icloud','dropbox','google one','google storage','microsoft 365','office 365','adobe','canva ','figma','notion ','slack ','zoom ','github ','chatgpt','openai','linkedin premium','duolingo','rosetta','quillbot','audible','kindle'] },
  // Telefonía e internet
  { cat: 'suscripciones', kw: ['personal ','claro ','movistar','tuenti','telecom','tigo ','nextel','telefonica','fibertel','cablevision','telecentro','coop tel','cooperativa telefonica'] },
  // Entretenimiento
  { cat: 'entretenimiento', kw: ['cine','cinema','hoyts','village','showcase','cinemark','teatro','show ','espectaculo','concierto','recital','evento','ticket','entradas','boliche','discoteca','after','bar ','cerveceria','brewhouse','steam ','playstation store','ps store','xbox ','nintendo','epic games','twitch','metacritic','gog ','origin ','uplay','blizzard','riot games','betway','codere','bingo','casino'] },
  // Salud
  { cat: 'salud', kw: ['farmacia','osde','omint','swiss medical','medicus','galeno','accord','sancor salud','hospital','clinica','sanatorio','consultorio','medico','doctor','odontologia','dentista','odontologo','optica','laboratorio','bioquimica','diagnostico','prepaga','obra social','emergencias','ambulancia','fisioterapia','kinesiologia','psicologia','psiquiatria','nutricionista','gym','gimnasio','personal trainer','pilates','yoga','meditacion','drogueria'] },
  // Indumentaria y calzado
  { cat: 'indumentaria', kw: ['zara','h&m','pull&bear','bershka','stradivarius','adidas','nike ','puma ','lacoste','levis','levi ','tommy','gap ','forever 21','rapsodia','legacy ','mimo ','wanama','bensimon','tucci','kosiuko','carmela','kosiuko','sarkany','prüne','prune','mishka','complot','akiabara','atlas','cheeky','paula cahen','montagne','topper','fila ','umbro','reebok','new balance','vans ','converse','gucci','louis vuitton','chanel ','prada ','ropa ','calzado','zapatillas','botines','sandalias','camisa','vestido','jean ','indumentaria','boutique','moda ','outlet'] },
  // Hogar y ferretería
  { cat: 'hogar', kw: ['easy ','sodimac','homecenter','blaisten','pintuRerias','pintureria','ferreteria','corralon','maderas','plomeria','electricidad','gas natural','edesur','edenor','edelap','cammesa','metrogas','naturgy','camuzzi','aguas','aysa','absa','indoquimica','pintar','cerrajeria','alarma','seguridad','garbarino','fravega','musimundo','whirlpool','samsung','lg ','sony ','philips','electrolux','muebles','colchon','sommier','bazar','menaje','vajilla','manteleria','cortinas','alfombra','limpieza','ala ','ariel ','skip ','drive ','ace ','lysoform','detergente','desodorante ambiental','iluminacion'] },
  // Educación
  { cat: 'educacion', kw: ['universidad','facultad','uba ','uca ','udesa','austral','palermo','belgrano','uade','utn ','unlp','unsam','colegio','escuela','instituto','jardin','guarderia','academia','capacitacion','curso ','seminario','platzi','udemy','coursera','edx ','domestika','coderhouse','acamica','henry ','digitalhouse','wolox','egg ','scholarships','libreria','librerias','el ateneo','distal','el libro','rayuela','crisol','yenny'] },
  // Viajes y turismo
  { cat: 'viajes', kw: ['despegar','booking','airbnb','hotels','trivago','tripadvisor','expedia','hotel','apart','hostel','motel','cabaña','posada','alojamiento','aerolineas','aerolíneas','latam','flybondi','jetsmart','aeromexico','american airlines','copa ','gol ','lan ','vuelo','pasaje','turismo','viaje','agencia','rent a car','avis ','hertz ','europcar','visa tur','carlos paz','bariloche','mendoza','salta','ushuaia','iguazu','patagonia'] },
  // Tecnología
  { cat: 'tecnologia', kw: ['mercadolibre','mercado libre','amazon ','ebay ','aliexpress','wish ','apple store','google play','app store','dell ','hp ','lenovo','asus ','intel ','amd ','nvidia','crucial','kingston','western digital','seagate','pc factory','compuservice','megatone','maxihogar','full ','nexo ','bangho','compu','notebook','monitor','teclado','mouse','impresora','camara','celular','smartphone','tablet','auricular','parlante','proyector','cable ','cargador','power bank'] },
  // Banco y finanzas
  { cat: 'banco', kw: ['banco galicia','banco bbva','banco santander','banco macro','banco nacion','bna ','banco patagonia','banco ciudad','banco supervielle','banco hipotecario','banco comafi','banco credicoop','icbc ','hsbc ','itau ','bradesco','scotiabank','debito automatico','debin ','transferencia','comision','mantenimiento cuenta','seguro de vida','seguro de tarjeta','retiro atm','extraccion','extraccion cajero','mercado pago','mercadopago','brubank','uala ','naranja x','naranja ','prex ','lemon ','cuenta dolar','fci ','fondo comun','cauciones','plazo fijo'] },
  // Servicios e impuestos
  { cat: 'impuestos', kw: ['afip','arba','agip','rentas','municipalidad','impuesto','tasa ','ingresos brutos','iva ','sellado','abl ','patente','automotor','bien de uso','seguro ','allianz','zurich','mapfre','sancor seguros','federacion patronal','berkley','trenes argentinos','autopistas','aubasa','ausa ','osm ','correo argentino','andreani','oca ','fedex ','dhl ','rapipago','pagofacil','cobroexpress','pago mis cuentas'] },
]

function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function categorize(description) {
  if (!description) return 'otros'
  const n = normalize(description)
  for (const rule of RULES) {
    if (rule.kw.some(k => n.includes(normalize(k)))) return rule.cat
  }
  return 'otros'
}

export function detectUnnecessary(transactions) {
  const findings = []
  const byDesc = {}
  for (const t of transactions) {
    const key = normalize(t.description).slice(0, 25)
    if (!byDesc[key]) byDesc[key] = []
    byDesc[key].push(t)
  }

  for (const [, txs] of Object.entries(byDesc)) {
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

  const foodByMonth = {}
  for (const t of transactions.filter(t => ['alimentacion','restaurantes','cafeterias'].includes(t.category))) {
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

  return findings
}
