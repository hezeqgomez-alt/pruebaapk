# EasyResumen — Estado del proyecto al 8 de junio de 2025

## ¿Qué es esto?
App web para analizar resúmenes de tarjetas de crédito argentinas. El usuario sube un PDF, la app lo parsea localmente (sin enviar datos a ningún servidor), categoriza los gastos y genera reportes.

**URL producción:** https://easyresumen.com.ar  
**Repo:** hezeqgomez-alt/pruebaapk  
**Deploy:** Vercel (auto-deploy desde `main`)  
**MVP Score:** 88/100 (2 auditorías Opus completadas)

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS (dark mode `#0f0f1a`) |
| Auth | Supabase Auth (user_metadata para plan/trial) |
| DB | Supabase (tabla `user_data` para cloud sync) |
| Backend | Vercel Serverless Functions (ES modules, `/api/*.js`) |
| Pagos | MercadoPago preapproval (suscripción mensual) |
| Email | Resend REST API (sin SDK, fetch directo) |
| PDF parse | pdf.js + Tesseract.js OCR |
| Export | jsPDF + jspdf-autotable (PDF), XLSX (Excel) |
| Charts | Chart.js vía react-chartjs-2 |

---

## Precio y modelo de negocio

- **Precio:** $2.999 ARS/mes
- **Trial:** 30 días gratis (guardado en `user_metadata.trial_started_at`)
- **Plan:** `user_metadata.plan` = `'trial'` | `'paid'` | `'expired'`
- **MP Plan ID:** `65b536a45d974b038219887643100785`
- **Break-even:** 24 suscriptores activos

---

## Variables de entorno en Vercel (todas configuradas ✅)

```
SUPABASE_URL               → https://ejnfpprlpwcxacybadok.supabase.co
SUPABASE_SERVICE_KEY       → sb_secret_... (service role, NO la anon)
VITE_SUPABASE_URL          → mismo que SUPABASE_URL (para el frontend)
VITE_SUPABASE_ANON_KEY     → sb_publishable_... (anon key para el frontend)
MP_ACCESS_TOKEN            → token de producción de MercadoPago
MP_WEBHOOK_SECRET          → secret para verificar firma HMAC del webhook
RESEND_API_KEY             → re_... (para emails de activación)
ADMIN_SECRET               → secret para el endpoint /api/admin/promote
```

> ⚠️ Las funciones serverless usan `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (sin prefijo `VITE_`). El frontend usa las `VITE_` prefijadas.

---

## Bancos compatibles (16)

Galicia, BBVA, Santander, HSBC, Macro, Naranja X, American Express, Brubank, Ualá, Itaú, ICBC, Banco Patagonia, Credicoop, Banco Nación, Banco Ciudad, Supervielle.

También soporta OCR para PDFs escaneados (Tesseract.js, idioma español).

---

## Estructura de archivos clave

```
src/
  App.jsx                    → componente raíz, toda la lógica principal
  components/
    AuthGate.jsx             → login/registro/recovery + Instagram link + T&C
    LicenseGate.jsx          → trial banner, expired gate, verify subscription
    TransactionList.jsx      → tabla con filtros, sort, edición inline
    InsightsPanel.jsx        → alertas: suscripciones, concentración, cuotas
    BudgetPanel.jsx          → presupuestos por categoría
    BankGuideModal.jsx       → guía de 16 bancos (cómo descargar el PDF)
    MobileDrawer.jsx         → menú móvil con links a T&C
  utils/
    pdfParser.js             → parser multi-banco + OCR (Tesseract worker singleton)
    categorizer.js           → 20 categorías, ~300 keywords, detectUnnecessary()
    cloudStorage.js          → cloudLoad() / cloudSave() con Supabase
    exportXLSX.js            → export a Excel (5 hojas, sanitización anti-inyección)
    reportGenerator.js       → export a PDF (jsPDF, 3 páginas con gráficos)
    importFile.js            → import desde XLSX/CSV propio (límite 10MB, 50k filas)
  context/
    AuthContext.jsx          → proveedor de auth, trial tracking, signOut
  lib/
    supabase.js              → cliente Supabase (isSupabaseConfigured check)

api/
  mp-webhook.js              → recibe notificaciones MP, activa/desactiva plan
  verify-subscription.js     → verifica suscripción activa en MP y activa plan
  admin/
    promote.js               → endpoint admin para activar plan manualmente
  _lib/
    email.js                 → sendEmail() + proActivationEmail() con Resend

server/
  supabase-schema.sql        → CREATE TABLE user_data + RLS policies (ya ejecutado ✅)

public/
  terminos.html              → Términos y Condiciones (ley 25.326)
  privacidad.html            → Política de Privacidad

landing/
  index.html                 → landing page pública
  checklist-lanzamiento.html → checklist de lanzamiento
  checklist-lanzamiento.pdf  → PDF del checklist (88/100)
  informe-lanzamiento.html   → proyección financiera 3 años
```

---

## Base de datos Supabase

### Tabla `user_data` (cloud sync) — ✅ creada con RLS
```sql
user_id           uuid  (FK → auth.users, unique, cascade delete)
transactions      jsonb
budgets           jsonb
custom_categories jsonb
updated_at        timestamptz
```

**RLS policies activas:**
- `users_select_own` — SELECT where auth.uid() = user_id
- `users_insert_own` — INSERT check auth.uid() = user_id
- `users_update_own` — UPDATE where auth.uid() = user_id
- `users_delete_own` — DELETE where auth.uid() = user_id
- `Users can manage their own data` (policy anterior que también existe)

### user_metadata (Supabase Auth)
```json
{
  "plan": "trial" | "paid" | "expired",
  "trial_started_at": "ISO date",
  "mp_preapproval_id": "id de la suscripción MP",
  "pdf_count": 0
}
```

---

## Flujo de suscripción MercadoPago

1. Usuario clickea "Suscribirme" en LicenseGate
2. Redirige a MP con `external_reference = user.id`
3. MP llama al webhook `POST /api/mp-webhook`
4. Webhook verifica firma HMAC-SHA256 con `MP_WEBHOOK_SECRET`
5. Si `status = 'authorized'` → `plan = 'paid'` en user_metadata
6. Se envía email de activación vía Resend
7. Botón "Ya me suscribí" → llama a `POST /api/verify-subscription` con Bearer JWT

---

## Auditorías de código completadas

### Audit 1 (Opus) — 8 fixes aplicados
- IDOR en verify-subscription (usaba user_id del body → ahora valida JWT)
- Rules of Hooks en AuthGate (useState antes del early return)
- Toast timer reset (estado {id, msg} con key incremental)
- handleFiles deps vacíos → [user, webTrackPDF]
- handleShare setTimeout(300) → doble requestAnimationFrame
- Cloud sync "cloud wins" → merge por txKey (evita pérdida de datos)
- AuthContext getSession sin .catch() → pantalla en blanco en red lenta
- CORS * en admin/promote → eliminado (server-to-server only)

### Audit 2 (Opus) — 10 fixes aplicados
- XLSX injection: sanitizeCell() en todas las celdas de texto
- División por zero en reportGenerator y exportXLSX (totalDebits = 0)
- Memory leaks OCR: canvas.width=0 post-OCR, pdf.destroy(), worker idle timer 5min
- DoS en importFile: límite 10MB y 50k filas, validación serial Excel
- InsightsPanel crash: guard f.transactions?.[0], excluir créditos de concentración %
- cloudStorage errores silenciosos → ahora throw (callers usan .catch())
- O(n²) en categorizer.detectUnnecessary → normDescCache Map
- BudgetPanel: Number(budgets[c]) coerce desde cloud
- TransactionList ARIA: columnheader, aria-sort, Escape en SourceFilter
- supabase-schema.sql: tabla user_data + RLS policies

---

## Emails con Resend

- **From:** `EasyResumen <noreply@easyresumen.com.ar>`
- **Cuándo se envía:** al activar plan (webhook MP + verify-subscription)
- **Template:** HTML branded en español, dark theme
- **Archivo:** `api/_lib/email.js`

> ⚠️ Pendiente: verificar dominio easyresumen.com.ar en Resend (DNS TXT/DKIM)

---

## Estado de bloqueadores pre-lanzamiento

| Ítem | Estado |
|---|---|
| Variables Vercel (4 nuevas) | ✅ Configuradas |
| Tabla user_data + RLS en Supabase | ✅ Ya existía + policies verificadas |
| Test pago end-to-end en producción | ⏳ Pendiente |
| Verificar dominio en Resend (DNS) | ⏳ Pendiente |
| Configurar Zoho Mail (MX records) | ⏳ Pendiente |

---

## Próximos pasos

### Inmediatos
1. **Test de pago:** suscribirse en producción → verificar `plan="paid"` en Supabase → confirmar email llegó
2. **DNS Resend:** agregar TXT/DKIM en nic.ar para que los emails no caigan en spam
3. **Zoho Mail:** MX records para soporte@easyresumen.com.ar

### Post-lanzamiento
4. Lanzamiento en redes (imágenes y textos ya preparados para Instagram)
5. Programa de referidos (1 mes gratis por referido)
6. Plan contador / profesional (tier superior)
7. App móvil (Android/iOS) — Año 1 Q3-Q4

---

## Comandos útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Deploy (push a main = deploy automático en Vercel)
git push origin main

# Promover usuario a plan paid manualmente
curl -X POST https://easyresumen.com.ar/api/admin/promote \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","secret":"TU_ADMIN_SECRET"}'
```

---

## Contexto de sesiones Claude anteriores

- Se usó **Opus 4.7** para auditorías de código (análisis profundo)
- Se usó **Sonnet** para aplicar los fixes (rápido y preciso)
- Rama de trabajo: `claude/dreamy-dijkstra-iIlSf` (mergeada a main el 8/6/2025)
- Historial completo en: `.claude/projects/-home-user-pruebaapk/`
