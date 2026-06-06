# EasyResumen — Documento de Traspaso de Sesión

> Generado automáticamente para continuar el desarrollo en una nueva sesión.
> Fecha: Junio 2025 · Branch: `claude/charming-rubin-d3P33` · Repo: `hezeqgomez-alt/pruebaapk`

---

## 1. Qué es el proyecto

**EasyResumen** es una app de escritorio (Electron 42 + React 19 + Vite + Tailwind 3.4) para usuarios argentinos que analiza resúmenes de tarjeta de crédito y extractos bancarios en PDF. Detecta banco, marca de tarjeta, cuotas, categorías automáticas, proyección de gastos futuros y balance mensual. 100% offline.

- **Stack**: React 19 + Vite, Tailwind, pdfjs-dist 5.x, Electron 42
- **Parser PDF**: `src/utils/pdfParser.js`
- **15+ bancos**: Credicoop, Galicia, BBVA, Santander, Macro, Ciudad, Nación, HSBC, Supervielle, Patagonia, ICBC, Brubank, Ualá, Naranja X, Mercado Pago
- **Marcas**: Visa, Mastercard, Cabal, AMEX, Maestro

---

## 2. Estado actual del modelo de negocio

- **Precio**: $4.999 ARS/mes (suscripción mensual)
- **Trial**: 30 días gratis + máx. 3 PDFs, sin tarjeta de crédito
- **Pago**: Gumroad (suscripción mensual)
- **Entrega**: automática vía webhook → Supabase + Resend

---

## 3. Implementaciones completadas en esta sesión

### Parser PDF
| Implementación | Archivo | Estado |
|---|---|---|
| `detectCardBrand()` — detecta Visa/MC/Cabal/AMEX/Maestro separado del banco | `src/utils/pdfParser.js` | ✅ |
| Fix CABAL detectado como Mastercard (reorden prioridades + límite 2000 chars) | `src/utils/pdfParser.js` | ✅ |
| Detección banco por contenido PDF (fallback cuando filename no alcanza) | `src/utils/pdfParser.js` | ✅ |
| Sufijos ordinales legibles: `*A1` → `Adicional 1` | `src/utils/pdfParser.js` | ✅ |
| Dedup cross-período: clave incluye `t.source` | `src/App.jsx` | ✅ |

### Sistema de licencias
| Implementación | Archivo | Estado |
|---|---|---|
| HMAC-SHA256 offline (formato `EASY-XXXXX-XXXXX-XXXXX-XXXXX`) | `electron/license.cjs` | ✅ |
| Validación online Supabase + grace period 72h offline | `electron/license.cjs` | ✅ |
| Trial 30 días + límite 3 PDFs (storage en disco, no localStorage) | `electron/license.cjs` | ✅ |
| CLI keygen: `node tools/keygen.cjs 1 100` | `tools/keygen.cjs` | ✅ |
| IPC handlers: `license:status`, `license:activate`, `license:trackpdf` | `electron/main.cjs` | ✅ |
| contextBridge preload | `electron/preload.cjs` | ✅ |

### Servidor (Vercel serverless)
| Implementación | Archivo | Estado |
|---|---|---|
| Webhook Gumroad → genera clave → Supabase → email Resend | `server/api/webhook/gumroad.js` | ✅ |
| Activación/verificación de licencia online | `server/api/license/activate.js` | ✅ |
| Recuperación de clave por email | `server/api/license/recover.js` | ✅ |
| Schema Supabase (tabla `licenses`, RLS, indexes) | `server/supabase-schema.sql` | ✅ |
| Módulo ES de keygen para Vercel | `server/lib/keygen.js` | ✅ |

### UI / UX
| Implementación | Archivo | Estado |
|---|---|---|
| `<TrialBanner>` — franja días restantes + PDFs usados | `src/components/LicenseGate.jsx` | ✅ |
| `<ExpiredGate>` — pantalla bloqueante al vencer trial | `src/components/LicenseGate.jsx` | ✅ |
| `<UpdateToast>` — notificación de nueva versión disponible | `src/components/LicenseGate.jsx` | ✅ |
| Auto-update electron-updater (verifica 10s post-inicio) | `electron/main.cjs` | ✅ |
| Panel filtros mobile-friendly (`flex-col sm:flex-row`) | `src/components/TransactionList.jsx` | ✅ |
| Export PDF respeta filtros activos | `src/components/ExportButtons.jsx` | ✅ |
| Badge Alertas con conteo real (≥80% del límite) | `src/components/BudgetPanel.jsx` | ✅ |

### Web y documentación
| Archivo | Descripción |
|---|---|
| `landing/index.html` | Landing page completa con pricing $4.999/mes |
| `landing/informe-lanzamiento.html` | Proyección de ingresos 3 años (imprimible como PDF) |
| `landing/informe-implementaciones.html` | Este resumen en formato visual (imprimible como PDF) |

---

## 4. Archivos clave del proyecto

```
pruebaapk/
├── src/
│   ├── App.jsx                    # Estado global, carga PDFs, licencia
│   ├── utils/
│   │   ├── pdfParser.js           # ★ Parser principal multi-banco
│   │   ├── categorizer.js         # Categorías automáticas
│   │   ├── reportGenerator.js     # Generación PDF informe
│   │   ├── exportXLSX.js
│   │   ├── importFile.js
│   │   └── storage.js
│   └── components/
│       ├── LicenseGate.jsx        # ★ Trial/Expired/UpdateToast
│       ├── TransactionList.jsx    # Lista de movimientos + filtros
│       ├── BudgetPanel.jsx        # Presupuestos y alertas
│       ├── InstallmentsPanel.jsx  # Cuotas y proyección
│       ├── BalancePanel.jsx       # Balance mensual
│       ├── LoansPanel.jsx         # Préstamos
│       ├── CategoryChart.jsx
│       ├── StatsCards.jsx
│       └── ExportButtons.jsx
├── electron/
│   ├── main.cjs                   # ★ Electron main + IPC + updater
│   ├── preload.cjs                # ★ contextBridge API
│   └── license.cjs                # ★ Lógica de licencias
├── server/
│   ├── api/
│   │   ├── webhook/gumroad.js     # ★ Webhook Gumroad
│   │   └── license/
│   │       ├── activate.js        # ★ Verificación online
│   │       └── recover.js         # Recuperación por email
│   ├── lib/keygen.js              # Generador claves (ES module)
│   ├── supabase-schema.sql        # Schema DB
│   └── vercel.json
├── tools/
│   └── keygen.cjs                 # CLI: node tools/keygen.cjs 1 100
├── landing/
│   ├── index.html                 # Landing page
│   ├── informe-lanzamiento.html   # Proyección ingresos 3 años
│   └── informe-implementaciones.html
└── package.json
```

---

## 5. Constantes críticas (NO COMPARTIR)

```js
// electron/license.cjs y tools/keygen.cjs
const SECRET = 'ER2025-easyresumen-7f3a8e2bc4d14f6a9e5c2b8d-private'
```

Variables de entorno necesarias en Vercel:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
GUMROAD_SELLER_ID=
LICENSE_API_URL=https://easyresumen.vercel.app
```

---

## 6. Lo que falta para lanzar (pendiente del usuario)

### BLOQUEANTE — servicios externos a configurar:
1. **Supabase**: crear proyecto → ejecutar `server/supabase-schema.sql`
2. **Resend**: crear cuenta → verificar dominio `easyresumen.com` (o usar gmail transitoriamente)
3. **Vercel**: deploy de la carpeta `server/` con las env vars del punto 5
4. **Gumroad**: crear producto suscripción $4.999 ARS → configurar webhook a `https://tu-vercel.app/api/webhook/gumroad`
5. **GitHub Release**: subir el `.exe` instalador para que auto-update funcione
6. **Landing page**: subir `landing/index.html` al repo `hezeqgomez-alt/Web` (GitHub Pages)

### OPCIONAL recomendado:
- Code signing Windows: Azure Code Signing ~$10/mes (sin esto, Windows muestra advertencia SmartScreen)
- Dominio propio: `easyresumen.com`
- Video tutorial para redes sociales

---

## 7. Próxima tarea pendiente (última conversación)

El usuario preguntó sobre hacer una **versión web** de la herramienta. Se empezó a analizar y se interrumpió.

**Contexto del análisis:**
- El 80% del código ya es compatible con web (React + Vite, pdfjs-dist funciona en browser)
- Lo que hay que cambiar:
  1. Reemplazar `window.electronAPI.*` por llamadas directas a Supabase Auth
  2. Login email/password en vez de licencia por archivo
  3. Almacenamiento en localStorage/IndexedDB o Supabase
  4. Deploy a Vercel (ya está preparado)
- La ventaja: no instalar nada, funciona en mobile, alcance mucho mayor
- El riesgo: pierde el argumento "100% offline" (aunque el parsing sigue siendo client-side)

---

## 8. Cómo continuar en una nueva sesión

Decirle a Claude en la nueva sesión:

> "Continuamos el desarrollo de EasyResumen. Lee el archivo HANDOFF.md en la raíz del repo para entender el contexto completo. El branch de trabajo es `claude/charming-rubin-d3P33` en `hezeqgomez-alt/pruebaapk`."

---

*Branch: `claude/charming-rubin-d3P33` · Repo: `hezeqgomez-alt/pruebaapk` · Junio 2025*
