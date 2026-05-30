# EasyResumen — Informe de Lanzamiento Comercial 2026
**Versión 1.0 · Mayo 2026 · Confidencial**

---

## Resumen Ejecutivo

EasyResumen es una aplicación de escritorio (Windows, con build futuro para Mac/Linux) que parsea PDFs de resúmenes bancarios y de tarjetas de crédito argentinas, categorizando movimientos automáticamente y permitiendo planificación financiera personal. Opera **100% localmente**, sin enviar datos a servidores externos.

El mercado argentino de finanzas personales está crónicamente sub-atendido por herramientas locales especializadas: hay **28,8 millones de usuarios de billeteras digitales** sin una solución dedicada de análisis y planificación post-transacción. La reducción de la inflación (de 289% en 2024 a ~30% proyectado para fines de 2026) está generando una nueva demanda de planificación financiera real a mediano plazo — el timing es favorable.

**Recomendación de modelo de negocio:** Freemium + opción de **pago único (lifetime)** como producto principal, con suscripción anual como alternativa. Sin suscripción mensual en el lanzamiento inicial.

**Proyección Year 1 con 1.000 usuarios activos (escenario moderado):** ARS 2.400.000 – 4.200.000 (~USD 2.000–3.500) en ingresos directos. El objetivo real de los primeros 12 meses es validar el modelo y escalar a 5.000–10.000 usuarios para Year 2.

---

## 1. El Producto

### 1.1 Funcionalidades actuales (v1.2.0)

| Módulo | Descripción |
|---|---|
| **Parser de PDFs** | Detecta y parsea resúmenes de CABAL, VISA/Credicoop, Galicia, BBVA, Santander, Naranja X, AMEX, Ciudad, Macro, ICBC, Patagonia, Supervielle, Brubank |
| **Categorización automática** | 20+ categorías con íconos y colores (supermercados, servicios, tecnología, MercadoPago, etc.) |
| **Movimientos** | Lista filtrable por tarjeta (multi-select), categoría, fecha, tipo. Búsqueda instantánea. Edición de categorías y notas |
| **Resumen / Dashboard** | Totales por categoría, comparativa mensual, gráfico de torta |
| **Cuotas** | Panel de cuotas activas con proyección de meses restantes |
| **Alertas** | Detección de suscripciones recurrentes, gastos por cuota finalizadas ("capital liberado"), gastos frecuentes |
| **Balance** | Control de gastos vs. ingresos manuales. Ingresos y gastos adicionales editables |
| **Presupuesto** | Límites por categoría con alertas visuales |
| **Exportación** | Excel (.xlsx), CSV, Informe PDF |
| **Privacidad** | 100% local. Sin cuenta requerida. Sin cloud. Sin IA externa |

### 1.2 Stack técnico

- **Frontend:** React 19 + Vite 8 + Tailwind 3.4
- **Desktop:** Electron 42.2 (build Windows x64 ~178 MB instalador NSIS)
- **PDF parsing:** pdf.js (pdfjs-dist 5.x)
- **Sin backend:** todo el procesamiento corre en el dispositivo del usuario

### 1.3 Ventaja competitiva para Argentina

Ningún competidor internacional (Wallet, Spendee, Money Manager, YNAB) tiene:
1. Soporte nativo de PDFs de bancos argentinos (CABAL, Credicoop, Naranja X, Ciudad, etc.)
2. Detección de cuotas en formato argentino (C.06/06, 6/12, etc.)
3. Funcionamiento offline completo sin sincronización cloud obligatoria
4. Interfaz en español rioplatense

---

## 2. Análisis de Mercado

### 2.1 Tamaño y contexto

| Indicador | Dato | Fuente |
|---|---|---|
| Fintechs activas en Argentina | 383 locales + 101 extranjeras | Finnovista Fintech Radar 2024 |
| Crecimiento ecosistema fintech YoY | +11,7% (CAGR 5 años: 15,3%) | Finnosummit 2024 |
| Usuarios de billeteras digitales | 28,8 millones | Cámara Argentina Fintech |
| Uso diario de billeteras | 64% de los argentinos | Infobae / FECOBA |
| Penetración de smartphones | 88% | DataReportal 2024 |
| Penetración de internet | 93% | DataReportal 2024 |
| Apps nativas de gestión de gastos locales | Prácticamente ninguna | Investigación propia |

### 2.2 Mapa competitivo

| Competidor | Tipo | Precio | Soporte AR | Fortaleza | Debilidad |
|---|---|---|---|---|---|
| **Wallet by BudgetBakers** | Móvil + Web | Free / ~USD 35 lifetime | Parcial | Multi-banco mundial, lifetime offer | No parsea PDFs argentinos |
| **Spendee** | Móvil | Freemium | No | UX limpia, wallets compartidas | Sin ingreso de datos de PDFs |
| **Money Manager** | Móvil | Freemium | No | Simple, muy usado en Latam | Solo entrada manual |
| **Fintonic** | Móvil | Gratis | No (España) | Conecta cuentas automático | No disponible en Argentina |
| **YNAB** | Web + Móvil | USD 109/año | No | Metodología sólida | Precio alto, solo inglés |
| **Monarch Money** | Web + Móvil | USD 99–199/año | No | Mejor UX post-Mint | Solo EE.UU. |
| **HomeBank** | Desktop | Gratis (OSS) | No | Offline, open-source | Sin parseo automático de PDFs |
| **Apps bancarias AR** | Móvil (cada banco) | Gratis | Solo su banco | Integración nativa | Siloed: un banco por app |
| **EasyResumen** | Desktop | Freemium | ✅ Nativo | Parser AR, 100% local | Solo desktop por ahora |

**Conclusión:** EasyResumen no tiene competencia directa en el nicho de "parser local de resúmenes argentinos con análisis integrado". El mercado está abierto.

---

## 3. Segmentación de 1.000 Usuarios Simulados

Para las proyecciones, se modelaron **1.000 usuarios del primer año** en 5 segmentos con perfiles, comportamientos y disposición a pagar distintos.

### 3.1 Perfiles de segmento

#### Segmento A — "Millennial Organizado" (350 usuarios · 35%)
- **Edad:** 25–38 años
- **Perfil:** Empleado en relación de dependencia o freelancer. Usa Mercado Pago, tarjeta de crédito del banco y CABAL. Descargó Spendee pero lo abandonó porque "no cargaba sus gastos automático".
- **Dolores principales:** No sabe en qué se va la plata; quiere ver cuánto pagó de cuotas este mes vs. el anterior.
- **Tech savviness:** Alto. Instala apps sin miedo.
- **Disposición a pagar:** Media. Pagaría por algo que realmente use. Resistente a suscripciones mensuales.
- **Canal de llegada:** Instagram / TikTok finfluencer, búsqueda Google.

#### Segmento B — "Autónomo / Dueño de PYME" (200 usuarios · 20%)
- **Edad:** 30–50 años
- **Perfil:** Monotributista o responsable inscripto. Tiene tarjeta de crédito empresarial + personal. Necesita separar gastos deducibles de personales. Le interesa la exportación a Excel para el contador.
- **Dolores principales:** Gasta horas mezclando resúmenes para el balance mensual; le falta una herramienta que lo haga automático.
- **Tech savviness:** Medio-alto.
- **Disposición a pagar:** Alta. Lo vería como una herramienta de trabajo, no un gasto.
- **Canal de llegada:** Búsqueda activa, recomendación de colegas.

#### Segmento C — "Familia Ahorrista" (280 usuarios · 28%)
- **Edad:** 35–55 años
- **Perfil:** Pareja con dos ingresos y dos tarjetas. Quiere saber el total a pagar de cada resumen y si llegan al sueldo. Primera vez que busca una app de control de gastos.
- **Dolores principales:** "¿Cuánto es el total del resumen?" es la pregunta semanal de casa. No sabe si alcanza para pagar todo.
- **Tech savviness:** Medio.
- **Disposición a pagar:** Media-baja. Necesita ver valor antes de pagar.
- **Canal de llegada:** Recomendación boca a boca, YouTube tutorial.

#### Segmento D — "Inversor Activo" (120 usuarios · 12%)
- **Edad:** 28–45 años
- **Perfil:** Tiene 3+ tarjetas de crédito, cuenta en dólares, invierte en cedears o criptomonedas. Quiere ver el panorama completo de sus gastos y contrastarlos con sus ingresos en ARS y USD.
- **Dolores principales:** Las apps no entienden la dualidad peso/dólar del mercado argentino. Quiere consolidar todo en un lugar.
- **Tech savviness:** Muy alto.
- **Disposición a pagar:** Alta. Ya paga por otras herramientas (TradingView, Cocos, etc.).
- **Canal de llegada:** Comunidades de Discord/Telegram de finanzas, Twitter/X finanzas.

#### Segmento E — "Estudiante / Joven" (50 usuarios · 5%)
- **Edad:** 18–25 años
- **Perfil:** Primer tarjeta de crédito. Poco ingreso. Quiere controlar gastos pero tiene alta sensibilidad al precio.
- **Dolores principales:** Supera el límite de la tarjeta sin saber por qué.
- **Tech savviness:** Muy alto.
- **Disposición a pagar:** Muy baja. Solo usaría el tier gratuito en el corto plazo.
- **Canal de llegada:** TikTok, Reddit Argentina.

### 3.2 Resumen de segmentos

| Segmento | Usuarios | % del total | Disposición a pagar | Canal principal |
|---|---|---|---|---|
| A · Millennial Organizado | 350 | 35% | Media (USD 10–15 pago único) | Instagram/TikTok finfluencer |
| B · Autónomo / PYME | 200 | 20% | Alta (USD 15–25 pago único) | SEO / boca a boca |
| C · Familia Ahorrista | 280 | 28% | Media-baja (USD 5–10) | YouTube / recomendación |
| D · Inversor Activo | 120 | 12% | Alta (USD 20+) | Comunidades finanzas online |
| E · Estudiante | 50 | 5% | Muy baja (free solamente) | TikTok |

---

## 4. Modelos de Monetización y Proyecciones

### 4.1 Opciones de monetización comparadas

**Referencia de precios al momento de escritura (Mayo 2026):**
- Tipo de cambio referencia: ARS 1.200/USD (oficial / MEP aproximado)
- Inflación interanual proyectada: ~25% para 2026

Se analizan tres modelos principales:

---

#### Modelo 1 — Suscripción Mensual en Pesos

**Precio:** ARS 3.500/mes (~USD 2,9)

**Ventajas:**
- Baja barrera de entrada
- Ingresos recurrentes predecibles

**Desventajas:**
- Alta tasa de churn esperada en Argentina (~25–35% mensual en apps de nicho)
- Fricción psicológica: el usuario siente que "sigue pagando por siempre"
- En contexto inflacionario, requiere actualizar precios frecuentemente
- Los usuarios argentinos tienen fuerte resistencia cultural a suscripciones mensuales en apps
- Administración de pagos recurrentes más compleja (MercadoPago suscripciones tiene comisiones altas)

**Veredicto:** ❌ No recomendado para lanzamiento

---

#### Modelo 2 — Suscripción Anual en Pesos

**Precio:** ARS 28.000/año (~USD 23,3)

**Ventajas:**
- Menor churn que mensual (el usuario "se olvidó que paga")
- LTV más predecible
- Precio psicológicamente accesible vs. mensual

**Desventajas:**
- Barrera de entrada alta en un mercado que no conoce el producto
- Requiere que el usuario confíe en el producto por 12 meses desde el inicio
- Requiere renovación anual activa (churn en renovación ~40–50%)

**Veredicto:** ⚠️ Viable como opción secundaria, no como principal en el lanzamiento

---

#### Modelo 3 — Pago Único (Lifetime License) ✅ RECOMENDADO

**Precio:** ARS 18.000 (~USD 15) — versión Pro/Lifetime
O bien precio en USD (USD 12–15) via MercadoPago o Gumroad

**Ventajas:**
- **Elimina la barrera psicológica de "pago para siempre"**: el usuario paga una vez y listo
- **Mayor conversión esperada** en mercados con desconfianza hacia suscripciones
- **Validado por competidores**: Wallet by BudgetBakers mantiene opción lifetime (~USD 35–40)
- **Simplicidad operativa**: sin gestión de churn, renovaciones, ni cancelaciones
- **Alineación de incentivos**: el desarrollador cobra si el producto es bueno (sin retención forzada)
- Sin problemas de actualización de precios por inflación
- Distribución más fácil: Gumroad, MercadoPago, incluso un link simple

**Desventajas:**
- Revenue no recurrente: hay que adquirir nuevos usuarios continuamente
- Sin garantía de ingresos futuros si no hay crecimiento de usuarios
- Financiamiento de actualizaciones depende del volumen de nuevas ventas

**Veredicto:** ✅ Mejor opción para lanzamiento. Captura el willingness-to-pay del usuario argentino sin fricción de suscripción.

---

#### Modelo 4 — Híbrido (Recomendación final)

**Estructura:**
- **Tier Free:** Funcionalidades core (parseo PDF, movimientos, categorización, exportación CSV). Sin límite de PDFs. Sin límite de tiempo.
- **Tier Pro (Pago único ARS 18.000 / USD 15):** Balance panel, Alertas avanzadas, Exportación Excel/PDF informe, Presupuesto con alertas, Cuotas tracking, actualizaciones por 2 años.
- **Suscripción anual (ARS 28.000/año / USD 23/año):** Mismo que Pro + actualizaciones sin límite de tiempo. Opción para quienes prefieren no pago único grande.

**Tier Free incluye suficiente para que el usuario vea el valor antes de pagar.** El tier Pro desbloquea lo que el usuario ya usó en el free y quiere mantener.

---

### 4.2 Proyecciones de ingresos — 1.000 Usuarios Year 1

**Supuestos del modelo:**
- Tipo de cambio referencia: ARS 1.200/USD (se mantiene constante en el modelo; revisión trimestral recomendada)
- Precios en ARS actualizados si la inflación supera 15% acumulado desde el último ajuste
- % de conversión por segmento a Pro/Lifetime:

| Segmento | Free-to-Pro (pago único) | Free-to-Annual |
|---|---|---|
| A · Millennial | 14% | 6% |
| B · Autónomo | 22% | 10% |
| C · Familia | 10% | 4% |
| D · Inversor | 28% | 12% |
| E · Estudiante | 3% | 1% |

---

#### Escenario Conservador (conversión baja, canales orgánicos puros)

| Segmento | Usuarios | Conv. Pro | Pagos únicos | Conv. Anual | Suscriptores |
|---|---|---|---|---|---|
| A · Millennial | 350 | 8% | 28 | 3% | 11 |
| B · Autónomo | 200 | 12% | 24 | 5% | 10 |
| C · Familia | 280 | 6% | 17 | 2% | 6 |
| D · Inversor | 120 | 15% | 18 | 6% | 7 |
| E · Estudiante | 50 | 1% | 1 | 0% | 0 |
| **TOTAL** | **1.000** | **8,8%** | **88** | **3,4%** | **34** |

**Ingresos Year 1 (Conservador):**
- Pagos únicos: 88 × ARS 18.000 = **ARS 1.584.000** (~USD 1.320)
- Suscripciones anuales: 34 × ARS 28.000 = **ARS 952.000** (~USD 793)
- **Total Year 1: ARS 2.536.000 (~USD 2.113)**

---

#### Escenario Moderado (finfluencer + SEO activo)

| Segmento | Usuarios | Conv. Pro | Pagos únicos | Conv. Anual | Suscriptores |
|---|---|---|---|---|---|
| A · Millennial | 350 | 14% | 49 | 6% | 21 |
| B · Autónomo | 200 | 22% | 44 | 10% | 20 |
| C · Familia | 280 | 10% | 28 | 4% | 11 |
| D · Inversor | 120 | 28% | 34 | 12% | 14 |
| E · Estudiante | 50 | 3% | 2 | 1% | 1 |
| **TOTAL** | **1.000** | **15,7%** | **157** | **6,7%** | **67** |

**Ingresos Year 1 (Moderado):**
- Pagos únicos: 157 × ARS 18.000 = **ARS 2.826.000** (~USD 2.355)
- Suscripciones anuales: 67 × ARS 28.000 = **ARS 1.876.000** (~USD 1.563)
- **Total Year 1: ARS 4.702.000 (~USD 3.918)**

---

#### Escenario Optimista (viral + finfluencer grande + prensa)

| Segmento | Usuarios | Conv. Pro | Pagos únicos | Conv. Anual | Suscriptores |
|---|---|---|---|---|---|
| A · Millennial | 350 | 20% | 70 | 9% | 32 |
| B · Autónomo | 200 | 30% | 60 | 14% | 28 |
| C · Familia | 280 | 15% | 42 | 7% | 20 |
| D · Inversor | 120 | 38% | 46 | 16% | 19 |
| E · Estudiante | 50 | 6% | 3 | 2% | 1 |
| **TOTAL** | **1.000** | **22,1%** | **221** | **10%** | **100** |

**Ingresos Year 1 (Optimista):**
- Pagos únicos: 221 × ARS 18.000 = **ARS 3.978.000** (~USD 3.315)
- Suscripciones anuales: 100 × ARS 28.000 = **ARS 2.800.000** (~USD 2.333)
- **Total Year 1: ARS 6.778.000 (~USD 5.648)**

---

### 4.3 Proyecciones plurianuales (3 años)

Supuestos de crecimiento de base de usuarios:
- Year 1: 1.000 usuarios activos (simulado)
- Year 2: 4.000 usuarios (+300% — finfluencer + boca a boca del Year 1)
- Year 3: 12.000 usuarios (+200% — consolidación SEO, Product Hunt, referidos)

Ingresos recurrentes de suscriptores año anterior + nuevas conversiones:

| Año | Usuarios | Ingresos Conservador | Ingresos Moderado | Ingresos Optimista |
|---|---|---|---|---|
| Year 1 | 1.000 | ARS 2,5M (~USD 2.100) | ARS 4,7M (~USD 3.900) | ARS 6,8M (~USD 5.700) |
| Year 2 | 4.000 | ARS 8,5M (~USD 7.100) | ARS 16,2M (~USD 13.500) | ARS 26,1M (~USD 21.750) |
| Year 3 | 12.000 | ARS 22M (~USD 18.300) | ARS 44M (~USD 36.700) | ARS 72M (~USD 60.000) |

> **Nota:** Las proyecciones en USD asumen tipo de cambio ~1.200 ARS/USD. Los valores en ARS deben revisarse trimestralmente según evolución del tipo de cambio e inflación. El modelo de pago único implica que los ingresos de Year 2 provienen principalmente de los 3.000 nuevos usuarios; las suscripciones anuales del Year 1 renuevan con ~50% de retención.

---

## 5. Plan de Lanzamiento

### 5.1 Cronograma de 4 fases

---

#### Fase 0 — Pre-lanzamiento (Semanas 1–4)

**Objetivo:** Construir audiencia antes de publicar. Generar anticipación. Validar el mensaje.

**Acciones:**
- [ ] Crear landing page (sin app aún): describe el problema y la solución. Formulario de "quiero ser el primero en probarla".
- [ ] Grabar 2–3 videos cortos para TikTok/Instagram Reels: "¿Sabes cuánto pagaste en cuotas este mes?", "Este mes descubrí que gasté X en servicios que ni usaba" — sin mencionar la app todavía, solo el dolor.
- [ ] Definir pricing definitivo y estructura de tiers (Free / Pro / Annual).
- [ ] Configurar sistema de pagos: MercadoPago para ARS + Gumroad/LemonSqueezy para USD.
- [ ] Crear cuenta en Product Hunt, IndieHackers, Reddit (r/argentina, r/personalfinance).
- [ ] Contactar 3–5 microinfluencers financieros argentinos (10K–100K seguidores YouTube/TikTok) para canje/colaboración pagada en el lanzamiento.
- [ ] Configurar analytics: Plausible o Umami (privacidad-first, coherente con el posicionamiento del producto).
- [ ] Colectar 200+ waitlist emails antes de lanzar.

**KPIs de éxito:**
- 200+ suscriptores en la lista de espera
- Al menos 2 finfluencers confirmados para colaboración en Fase 1

---

#### Fase 1 — Beta cerrada (Semanas 5–8)

**Objetivo:** Probar con usuarios reales, iterar rápido, generar testimonios.

**Acciones:**
- [ ] Invitar a los primeros 200 de la lista de espera (priorizar Segmentos B y D: autónomos e inversores — mayor willingness to pay y feedback de calidad).
- [ ] Tier gratuito sin restricción en beta. Pedir feedback activo via formulario Tally o Typeform.
- [ ] Iterar sobre los 3 pain points más reportados.
- [ ] Recolectar 10–15 testimonios reales con número de facturas/resúmenes procesados, tiempo ahorrado, o "hallazgos" (ej: "descubrí que gastaba $80.000 en cuotas que no recordaba").
- [ ] Grabar video de demostración con un usuario real procesando su propio resumen (con permiso).
- [ ] Documentar casos de uso reales para usar en marketing.

**KPIs de éxito:**
- 200 beta usuarios activos (al menos 50% procesó ≥ 1 PDF)
- NPS ≥ 40
- 10 testimonios publicables

---

#### Fase 2 — Lanzamiento público (Semanas 9–12)

**Objetivo:** Generar tracción pública, primeras ventas, cobertura orgánica.

**Acciones:**
- [ ] **Día de lanzamiento:** publicar en Product Hunt Argentina + Reddit r/argentina + Twitter/X + LinkedIn.
- [ ] **Finfluencers:** coordinar publicaciones simultáneas en TikTok/Instagram/YouTube de los 2–5 colaboradores confirmados. Modelo CPA (comisión por cada Pro vendido con su código) o pago fijo + comisión.
- [ ] **Email a la lista de espera:** "Ya está disponible" con código de descuento del 30% por las primeras 72 horas (crea urgencia sin romper la percepción de valor).
- [ ] **Precio de lanzamiento:** ARS 12.600 en lugar de ARS 18.000 (30% off) las primeras 2 semanas.
- [ ] **SEO:** publicar 3 artículos en el blog/landing: "Cómo saber exactamente cuánto debés de tarjeta", "Las 5 suscripciones que los argentinos pagan sin saberlo", "Tutorial: parsear tu resumen de tarjeta sin subir tus datos a ningún servidor".
- [ ] **Video tutorial YouTube:** 8–12 minutos, demo completo de la app. Este video es el ancla SEO a largo plazo.
- [ ] Activar publicidad paga en Meta Ads con ARS 50.000–100.000 de presupuesto de prueba para el segmento A y C (targeting: Argentina, 25–45 años, intereses: finanzas personales, tarjetas de crédito, ahorro).

**KPIs de éxito:**
- 1.000 descargas en las primeras 2 semanas
- 80+ conversiones Pro en el mes de lanzamiento
- 1 medio de tecnología/economía cubre la app (Infobae Tech, iProfesional, TN Tecno)

---

#### Fase 3 — Crecimiento orgánico (Meses 4–12)

**Objetivo:** Construir el canal de adquisición sostenible, aumentar LTV y referencias.

**Acciones:**
- [ ] **Programa de referidos:** código único por usuario Pro. Cada referido exitoso = 30 días extra de soporte premium o crédito para futuras versiones (no descuento: protege el precio).
- [ ] **Newsletter mensual:** "El resumen de EasyResumen" — tips de finanzas personales en Argentina, novedades del producto, estadísticas anonimizadas de usuarios ("el mes pasado, los usuarios de EasyResumen descubrieron $X en cuotas olvidadas").
- [ ] **Actualizaciones de producto:** un nuevo banco/tarjeta soportada cada mes (ICBC, HSBC, BICE, etc.) genera un motivo de comunicación y SEO nueva.
- [ ] **Community building:** Discord o Telegram de usuarios de EasyResumen — los usuarios de Segmento D (inversores) son naturalmente evangelizadores si el producto los sorprende.
- [ ] **Partnerships:** contactar asociaciones de contadores (FACPCE), colegios de graduados en ciencias económicas — oferta especial para sus asociados.
- [ ] **Lanzamiento en Mac:** amplía el mercado al 15–20% de usuarios Mac (típicamente de mayor poder adquisitivo).
- [ ] **A/B test de precios:** probar ARS 18.000 vs ARS 22.000 para el tier Pro con nuevos usuarios en Q3.

**KPIs de éxito:**
- 5.000 usuarios totales al cierre de Year 1
- 15% de conversión free-to-paid (promedio ponderado)
- CAC < ARS 5.000 (< USD 4)
- Churn anual de suscripciones < 45%

---

### 5.2 Canales de adquisición por prioridad

| Canal | Prioridad | CAC estimado | Tiempo para ver resultado |
|---|---|---|---|
| Finfluencers (micro, CPA) | 🔴 Alta | ARS 800–2.500 | 1–2 semanas |
| SEO + blog en español AR | 🔴 Alta | ARS 0 (tiempo) | 3–9 meses |
| Boca a boca / referidos | 🔴 Alta | ARS 0 | Continuo |
| Video demo YouTube | 🟡 Media | ARS 0 (tiempo) | 1–6 meses |
| Meta Ads (Instagram/FB) | 🟡 Media | ARS 2.000–6.000 | 1–4 semanas |
| Product Hunt / IndieHackers | 🟡 Media | ARS 0 | Día del lanzamiento |
| Comunidades online (Reddit, Discord, Telegram) | 🟡 Media | ARS 0 (tiempo) | 2–8 semanas |
| Google Ads (search) | 🟠 Baja | ARS 3.000–8.000 | 2–6 semanas |
| PR / Medios tech argentinos | 🟠 Baja | ARS 0 (pitching) | Variable |
| TikTok Ads | 🟠 Baja | ARS 1.500–4.000 | 1–3 semanas |

---

## 6. Posibles Obstáculos y Mitigaciones

### 6.1 Obstáculos técnicos

#### O1 — Cambios en formato de PDF de los bancos
**Riesgo:** Un banco actualiza su sistema y los PDFs cambian de estructura. El parser falla.
**Probabilidad:** Alta (los bancos actualizan sus sistemas frecuentemente).
**Impacto:** Alto (usuarios reportan que "no funciona" → churn).
**Mitigación:**
- Mantener un suite de PDFs de prueba actualizados (al menos 3 ejemplares por banco por versión).
- Sistema de reporte de error in-app con opción de enviar el PDF (anonimizado/opt-in) para diagnóstico.
- Ciclo de updates rápido: hotfix en ≤ 72hs para bancos principales.
- Documentar claramente en la app qué versión de resumen fue probada.

#### O2 — Problemas de instalación en Windows
**Riesgo:** Antivirus bloquea el ejecutable (falso positivo), Windows Defender alerta sobre app no firmada, usuario sin permisos de admin.
**Probabilidad:** Media-alta (Electron apps con NSIS no firmadas disparan Defender).
**Impacto:** Medio (fricción en instalación → abandono).
**Mitigación:**
- Firmar el ejecutable con un certificado de code signing (USD 200–500/año via DigiCert o Sectigo).
- Agregar instrucciones claras in-app de cómo agregar excepción en Windows Defender.
- Ofrecer versión portable (sin instalador) como alternativa.
- A mediano plazo: publicar en Microsoft Store (requiere proceso de certificación pero elimina la fricción).

#### O3 — Performance con muchos PDFs
**Riesgo:** El usuario carga 12 meses de resúmenes de 4 tarjetas (~50 PDFs). La app se cuelga.
**Probabilidad:** Media.
**Impacto:** Medio (solo afecta power users — Segmentos B y D).
**Mitigación:**
- Virtualización de listas (ya parcialmente implementada con paginación de 50 items).
- Processing de PDFs en background worker (web worker para no bloquear el hilo principal).
- Límite soft de 500 transacciones con aviso previo.

---

### 6.2 Obstáculos de mercado

#### O4 — Resistencia cultural al software pago en Argentina
**Riesgo:** "¿Por qué voy a pagar si hay apps gratis?" — la cultura del pirateo y la gratuidad digital está arraigada.
**Probabilidad:** Alta.
**Impacto:** Alto (baja conversión free-to-paid).
**Mitigación:**
- El tier gratuito debe ser genuinamente útil y completo en su núcleo. El usuario debe sentir que está pagando por "más", no por "lo básico".
- Comunicar el diferenciador de privacidad: "tus datos financieros nunca salen de tu PC — ninguna app gratis te da eso".
- Precio en ARS visible inmediatamente (sin converión mental a USD que infla la percepción de precio).
- Período de prueba Pro de 14 días sin necesidad de tarjeta.

#### O5 — Competidor grande entra al mercado
**Riesgo:** Mercado Pago, Galicia o BBVA lanza una herramienta de análisis cross-banco.
**Probabilidad:** Baja en el corto plazo (requeriría acuerdos entre bancos competidores).
**Impacto:** Muy alto (potencialmente hace obsoleto el producto).
**Mitigación:**
- Construir comunidad y base instalada antes de que ocurra.
- Diferenciador de privacidad: los bancos NUNCA ofrecerán una solución 100% offline porque les conviene ver tus datos.
- Expandir a funcionalidades que los bancos no pueden ofrecer: multi-banco, multi-tarjeta, balance con ingresos manuales, exportación contable.

#### O6 — Volatilidad macroeconómica argentina
**Riesgo:** Devaluación brusca, cambio de gobierno, nuevas restricciones cambiarias afectan los precios y el poder adquisitivo.
**Probabilidad:** Media (Argentina tiene historial de shocks macroeconómicos periódicos).
**Impacto:** Medio (afecta ingresos en USD pero no en ARS relativo).
**Mitigación:**
- Diversificar moneda de cobro: ofrecer pago en USD vía Gumroad/LemonSqueezy para usuarios que prefieran dolarizarse.
- Política de precio claro: "si el tipo de cambio oficial sube más del 20%, actualizamos el precio en pesos automáticamente" — comunicar esto proactivamente elimina sorpresas.
- El producto en sí beneficia al usuario en crisis: cuando la economía aprieta, la gente quiere más control sobre sus gastos.

---

### 6.3 Obstáculos operativos

#### O7 — Soporte al cliente escalable
**Riesgo:** Con 5.000+ usuarios, los reportes de "mi banco no funciona" o "no reconoce mi PDF" generan una carga de soporte inmanejable para un equipo pequeño.
**Probabilidad:** Media-alta.
**Impacto:** Medio.
**Mitigación:**
- Base de conocimiento (FAQ) en el sitio desde el día 1: "Bancos soportados", "Qué hacer si mi PDF no se parsea".
- Sistema de reporte in-app que incluya el error técnico automáticamente (sin necesidad de que el usuario lo describa).
- Discord de comunidad donde usuarios se ayudan entre sí (reduce carga de soporte en ~40%).
- SLA diferenciado: usuarios Pro tienen soporte por email con respuesta en ≤ 48hs; usuarios Free tienen la comunidad.

#### O8 — Dependencia de PDF-js y actualizaciones de Electron
**Riesgo:** Actualizaciones de pdf.js o Electron rompen funcionalidades existentes.
**Probabilidad:** Baja-media.
**Impacto:** Medio.
**Mitigación:**
- Pin de versiones de dependencias con testing antes de actualizar.
- CI/CD básico con suite de tests de parseo automático contra PDFs de referencia.

---

## 7. Recomendación Final de Modelo de Negocio

### 7.1 Estructura recomendada

```
┌─────────────────────────────────────────────────────┐
│                  EasyResumen                         │
│                                                      │
│  🆓 TIER FREE (siempre gratis)                      │
│  ✅ Parseo ilimitado de PDFs                        │
│  ✅ Lista de movimientos + búsqueda                 │
│  ✅ Categorización automática                        │
│  ✅ Exportación CSV                                 │
│  ✅ Estadísticas básicas (totales por mes)          │
│                                                      │
│  ⭐ TIER PRO — ARS 18.000 pago único               │
│     (o USD 15 via Gumroad)                          │
│  ✅ Todo lo de Free +                               │
│  ✅ Panel de Balance (ingresos vs. gastos)          │
│  ✅ Alertas avanzadas (cuotas, suscripciones)       │
│  ✅ Panel de Cuotas con proyecciones                │
│  ✅ Presupuesto mensual con alertas                 │
│  ✅ Exportación Excel + Informe PDF                 │
│  ✅ Multi-tarjeta con filtros avanzados             │
│  ✅ Actualizaciones por 2 años                      │
│  ✅ Soporte por email (<48hs)                       │
│                                                      │
│  🔄 TIER ANUAL — ARS 28.000/año                    │
│     (o USD 23/año)                                  │
│  ✅ Todo lo de Pro +                               │
│  ✅ Actualizaciones sin límite                      │
│  ✅ Acceso a nuevas features beta                   │
│  ✅ Prioridad en soporte                            │
└─────────────────────────────────────────────────────┘
```

### 7.2 Plataformas de cobro recomendadas

| Plataforma | Para qué | Comisión | Ventaja |
|---|---|---|---|
| **MercadoPago** | Cobro en ARS con tarjeta argentina | 4,5–5,99% | El 95% de los argentinos lo usa; acepta cuotas sin interés |
| **Gumroad** | Cobro en USD para usuarios que quieren dolarizarse | 10% | Sin necesidad de entidad fiscal compleja; directo a cuenta bancaria |
| **LemonSqueezy** | Alternativa a Gumroad, mejor para suscripciones anuales | 5% + USD 0,50 | Maneja IVA global automáticamente |

### 7.3 Decisión: ¿mensual o pago único?

| Criterio | Suscripción mensual | Suscripción anual | Pago único |
|---|---|---|---|
| Barrera de entrada | ✅ Baja | 🟡 Media | 🟡 Media-alta |
| Conversión esperada en AR | ❌ Baja | 🟡 Media | ✅ Alta |
| Revenue recurrente | ✅ Sí | ✅ Sí | ❌ No |
| Churn | ❌ Alto (~30%/mes) | 🟡 Medio (~40%/año) | ✅ N/A |
| Complejidad operativa | ❌ Alta | 🟡 Media | ✅ Baja |
| LTV | 🟡 Depende de retención | ✅ Predecible | ✅ Garantizado |
| Adecuación al mercado AR | ❌ Mala | 🟡 Aceptable | ✅ Buena |

**Recomendación:** Lanzar con **Pago único como opción principal** + **Suscripción anual como opción alternativa**. Evaluar suscripción mensual solo si el análisis de datos del Year 1 muestra demanda orgánica por ese modelo.

---

## 8. Resumen Ejecutivo de Proyecciones

| Métrica | Year 1 (Conservador) | Year 1 (Moderado) | Year 1 (Optimista) |
|---|---|---|---|
| Usuarios activos | 1.000 | 1.000 | 1.000 |
| Conversión Pro | 8,8% | 15,7% | 22,1% |
| Conversión Anual | 3,4% | 6,7% | 10% |
| Ingresos totales ARS | 2.536.000 | 4.702.000 | 6.778.000 |
| Ingresos totales USD | ~USD 2.100 | ~USD 3.900 | ~USD 5.650 |
| **Year 2** (4.000 usuarios) | ~USD 7.100 | ~USD 13.500 | ~USD 21.750 |
| **Year 3** (12.000 usuarios) | ~USD 18.300 | ~USD 36.700 | ~USD 60.000 |

**Nota:** Los ingresos en USD a Year 3 en el escenario moderado (~USD 37K/año) equivalen a un ingreso mensual de ~USD 3.050, viable como proyecto de tiempo parcial con baja infraestructura de costos. Para alcanzar el nivel de ingreso full-time (USD 6.000–8.000/mes), se requiere alcanzar el escenario optimista en Year 3 o superar los 12.000 usuarios con el modelo moderado.

---

## 9. Próximos Pasos Inmediatos (Semana 1)

1. **Definir el pricing final** (acordar los números exactos en ARS y USD).
2. **Crear la landing page** con lista de espera (Carrd.co o Framer — 1–2 horas de trabajo).
3. **Separar features Free de Pro** en el código (feature flags por licencia).
4. **Integrar MercadoPago** para cobro de pago único en ARS.
5. **Firmar el ejecutable** (cotizar certificado de code signing).
6. **Contactar el primer finfluencer** con propuesta de colaboración para el lanzamiento.

---

*Informe preparado con datos de Finnovista Fintech Radar Argentina 2024, Cámara Argentina Fintech, DataReportal, Reuters Institute, Nearshore Americas, y análisis comparativo de competidores directos. Las proyecciones son estimaciones basadas en benchmarks del mercado y no constituyen garantías de resultado.*

*EasyResumen · v1.2.0 · Mayo 2026*
