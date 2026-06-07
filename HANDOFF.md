# EasyResumen — Handoff de Sesión

> Última actualización: Junio 2026 · Branch activo: `claude/dreamy-dijkstra-iIlSf` · Repo: `hezeqgomez-alt/pruebaapk`

---

## 1. Descripción del proyecto

**EasyResumen** — App web (+ Electron desktop) para analizar resúmenes de tarjetas de crédito argentinas en PDF.

- **Dominio**: [www.easyresumen.com.ar](https://www.easyresumen.com.ar)
- **Deploy**: Vercel (web) · Auto-update electron-updater (desktop)
- **Stack**: React 19 + Vite + Tailwind CSS (dark mode, fondo `#0f0f1a`) + Supabase Auth + Vercel serverless

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Auth | Supabase Auth (email/password) |
| Backend | Vercel serverless (`/api/*.js`, ES modules) |
| Pagos | MercadoPago suscripciones |
| PDF | pdfjs-dist + Tesseract OCR (fallback) |
| Persistencia | localStorage + Supabase tabla `user_data` |
| Export | jsPDF, xlsx |
| Desktop | Electron (build separado) |

---

## 3. Estado actual del MVP

### ✅ Implementado y funcionando

| Feature | Detalle |
|---|---|
| Parsing PDF | 15+ bancos argentinos, OCR fallback |
| 23 categorías automáticas | Incluye Intereses Financieros (primera prioridad) |
| Categorías personalizadas | Modal crear/editar/borrar, sincroniza a nube |
| UI glassmorphism dark | Header, tabs, fondo animado con orbs |
| Auth web | Login / registro / recovery — Supabase |
| Trial 30 días + 3 PDFs | Basado en `created_at`, sin tarjeta |
| Badge PRO | Aparece en header (junto al logo) cuando `plan: paid` — ícono ⚡ dorado |
| Persistencia Supabase | Tabla `user_data` (transactions, budgets, custom_categories) |
| MercadoPago checkout | URL dinámica con `external_reference={user.id}` |
| Webhook MP | `api/mp-webhook.js` — activa `plan: paid` en Supabase |
| Verificación activa | `api/verify-subscription.js` — búsqueda en MP por userId/email |
| Botón "Ya me suscribí" | Aparece tras abrir checkout en `TrialBanner` y `ExpiredGate` |
| Precio visible | $2.999/mes en banner y pantalla de expiración |
| Export PDF/Excel/CSV | Respeta filtros activos |
| Import Excel/CSV | Dedup automático |
| Guía por banco | Modal con instrucciones paso a paso |
| Compartir resumen | Web Share API o clipboard |
| Mobile responsive | Cards en transacciones, drawer lateral |
| Presupuesto por categoría | Alertas 80%, selector de mes |
| Cuotas + préstamos + balance | Paneles completos |
| Insights automáticos | Suscripciones, impulsos, concentración |
| Admin manual | `api/admin/promote.js` — activa plan por email + ADMIN_SECRET |

---

## 4. Flujo de suscripción (completo y funcional)

```
Usuario hace click "Suscribirse — $2.999/mes"
  → abre: mercadopago.com.ar/subscriptions/checkout
          ?preapproval_plan_id=65b536a45d974b038219887643100785
          &external_reference={user.id}   ← clave para webhook
  → usuario paga en MP
  → MP hace POST a /api/mp-webhook con el evento
  → webhook busca la suscripción en MP API
  → extrae external_reference = user.id
  → llama supabase.auth.admin.updateUserById → plan: paid
  → badge PRO aparece en header

Si el webhook falla:
  → usuario presiona "Ya me suscribí"
  → llama /api/verify-subscription con {userId, email}
  → busca suscripción en MP por external_reference, luego por email
  → si encuentra authorized → activa plan: paid
  → refreshTrial() actualiza la sesión sin recargar
```

**Plan ID de producción MP**: `65b536a45d974b038219887643100785`

---

## 5. Archivos clave

### Componentes
| Archivo | Descripción |
|---|---|
| `src/components/LicenseGate.jsx` | `TrialBanner`, `ExpiredGate`, `ProBadge`, `UpdateToast`, `VerifyButton` |
| `src/components/AuthGate.jsx` | Login / registro / recovery |
| `src/components/BudgetPanel.jsx` | Presupuestos con alertas |
| `src/components/TransactionList.jsx` | Lista movimientos + categoría editable |
| `src/components/MobileDrawer.jsx` | Menú lateral mobile |

### API (Vercel serverless)
| Archivo | Descripción |
|---|---|
| `api/mp-webhook.js` | Recibe eventos MP (`subscription_preapproval`, `payment`), activa `plan: paid` |
| `api/verify-subscription.js` | Búsqueda activa en MP; llamado por "Ya me suscribí" |
| `api/admin/promote.js` | Activación manual por email + `ADMIN_SECRET` |

### Utils y contexto
| Archivo | Descripción |
|---|---|
| `src/context/AuthContext.jsx` | `user`, `trialStatus`, `trackPDF`, `refreshTrial` |
| `src/utils/cloudStorage.js` | `cloudLoad` / `cloudSave` a Supabase |
| `src/utils/storage.js` | localStorage + `loadCustomCategories` / `saveCustomCategories` |
| `src/utils/categorizer.js` | `CATEGORIES` (23) + `RULES` |
| `src/utils/pdfParser.js` | Parser multi-banco + OCR fallback |

### Config
| Archivo | Descripción |
|---|---|
| `vercel.json` | `buildCommand: npm run build:web`, `outputDir: dist`, rewrite SPA (excluye `/api/`) |

---

## 6. Variables de entorno (Vercel)

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | Cliente frontend |
| `VITE_SUPABASE_ANON_KEY` | Cliente frontend |
| `SUPABASE_URL` | API serverless |
| `SUPABASE_SERVICE_KEY` | API serverless (admin) |
| `MP_ACCESS_TOKEN` | `APP_USR-6269736721458782-...` producción MP |
| `ADMIN_SECRET` | Endpoint manual promote |

---

## 7. Supabase

### Tabla `user_data`
```sql
create table user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  transactions jsonb default '[]',
  budgets jsonb default '{}',
  custom_categories jsonb default '{}',
  updated_at timestamptz default now()
);
-- RLS activado: users can manage their own data
-- columna custom_categories agregada con:
-- alter table user_data add column if not exists custom_categories jsonb default '{}'::jsonb;
```

### Plan activado en `user_metadata`
```js
// Plan trial (default al registrarse)
{ plan: 'trial', trial_started_at: '...', pdf_count: 0 }

// Plan pagado (activado por webhook o verify-subscription)
{ plan: 'paid', mp_subscription_id: '...', activated_at: '...' }
```

---

## 8. Usuarios activos

| Email | Estado | Nota |
|---|---|---|
| mcandelaguido@gmail.com | `plan: paid` | Activado manualmente via SQL (primera usuaria) |

---

## 9. Pendientes / Próximos pasos

| Prioridad | Tarea |
|---|---|
| 🔴 Alta | Probar flujo completo de suscripción con cuenta de prueba MP para validar webhook end-to-end |
| 🔴 Alta | Confirmar que columna `custom_categories` en Supabase ya existe (ALTER TABLE) |
| 🟡 Media | Completar guía de descarga para bancos: Itaú, ICBC, Patagonia, Credicoop |
| 🟡 Media | Persistencia Electron — datos del desktop sin sync a nube todavía |
| 🟢 Baja | Video tutorial para redes sociales |
| 🟢 Baja | Code signing Windows (sin esto, SmartScreen muestra advertencia) |

---

## 10. Cómo continuar en una nueva sesión

```
Continuamos el desarrollo de EasyResumen. Lee el archivo HANDOFF.md
en la raíz del repo para entender el contexto completo.
El branch de trabajo es claude/dreamy-dijkstra-iIlSf en hezeqgomez-alt/pruebaapk.
```

---

*Branch: `claude/dreamy-dijkstra-iIlSf` · Repo: `hezeqgomez-alt/pruebaapk` · Junio 2026*
