# SkyLog Manager — CLAUDE.md

## Qué es este proyecto

**SkyLog Manager** (también llamado **BitaFly**) es una plataforma SaaS de gestión de operaciones con drones para Colombia. Permite a organizaciones registrar vuelos, gestionar flotas, pilotos, baterías, mantenimiento, y cumplir con la regulación colombiana (RAC 100 / Aerocivil / UAEAC).

- **Stack**: Next.js 14 App Router, Supabase (PostgreSQL + Auth), ePayco (pagos Colombia), Resend (emails), Tailwind CSS
- **Deploy**: Vercel (frontend + API routes) — ver Vercel MCP para logs
- **DB**: Supabase — ver Supabase MCP para queries directas

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/           ← Todos los endpoints (Next.js route handlers)
│   │   ├── auth/      ← register, login, reset-password
│   │   ├── flights/   ← authorize (autorizaciones de vuelo)
│   │   ├── pilots/    ← CRUD pilotos
│   │   ├── fleet/     ← CRUD aeronaves
│   │   ├── logbook/   ← bitácora (flights, batteries, inventory, pilots)
│   │   │   └── [id]/  ← PATCH pilot_id en un vuelo (restringido a admin/jefe_pilotos)
│   │   ├── epayco/    ← webhook, verify-on-return, checkout
│   │   ├── subscription/ ← suscripciones ePayco (cancel)
│   │   ├── sora/      ← motor de riesgo SORA
│   │   ├── sms/       ← reportes SMS
│   │   ├── reports/   ← generación de reportes PDF/Excel
│   │   ├── dashboard/ ← KPIs
│   │   └── admin/master/ ← panel superadmin (middleware protege /api/admin/*)
│   └── dashboard/     ← páginas del dashboard (client-side)
│       └── subscription/response/ ← página de retorno post-pago (llama /api/epayco/verify)
├── components/
│   ├── DjiRcSync.js       ← importación DJI: instrucciones por dispositivo, modal crear aeronave
│   ├── LogbookImportPanel.js ← panel de importación (Excel/CSV + DJI RC)
│   ├── FlightReplayModal.js ← modal replay GPS animado (upload .txt + visualización + guardado)
│   ├── authorizations/    ← BasicForm, AerocivilForm, MapPickerModal
│   ├── landing/           ← landing page / marketing
│   └── settings/          ← panels de configuración
├── lib/
│   ├── supabaseServer.js   ← createClientSSR() — GOD NODE (41 edges)
│   ├── planLimits.js       ← PLAN_CONFIG, canAddResource()
│   ├── soraEngine.js       ← motor cálculo SORA/ARC
│   ├── reportGenerators.js ← PDF (jsPDF + autoTable), Excel (ExcelJS)
│   ├── djiParser.js        ← parseDjiTxtBuffer() — server-side, requiere DJI_API_KEY
│   ├── epayco.js           ← listSubscriptions(), cancelSubscription(), cancelSubscriptionsByEmail()
│   └── epaycoActivation.js ← activatePlanForUser(), resolvePendingForUser() — idempotente
dji-parser/            ← módulo independiente: parsea archivos .txt DJI
railway-robot/         ← Playwright automator para sistema externo (Railway)
supabase/migrations/   ← migraciones SQL
graphify-out/          ← grafo de conocimiento del proyecto (graph.html, graph.json)
```

---

## Abstracciones clave (god nodes)

| Función | Archivo | Rol |
|---|---|---|
| `createClientSSR()` | `src/lib/supabaseServer.js` | Cliente Supabase SSR — usado en TODOS los API routes |
| `getOrgContext()` | `src/lib/apiAuth.js` | Extrae orgId + role + subscription_plan del JWT |
| `activatePlanForUser()` | `src/lib/epaycoActivation.js` | Activa plan en profiles + borra pending_subscriptions (idempotente). Valida `planKey` contra whitelist `VALID_PAID_PLANS`. |
| `parseDjiTxtBuffer()` | `src/lib/djiParser.js` | Parsea log .txt DJI; extrae serial_aeronave, serial_bateria, ciclos, horas |
| `createAdminClient()` | `src/lib/supabaseServer.js` | Cliente admin (service role) para operaciones privilegiadas |
| `checkRateLimit()` | `src/lib/rateLimiter.js` | Rate limiting en memoria por IP — usado en auth y endpoints públicos |
| `escHtml()` | `src/lib/emailHelpers.js` | Escapa HTML en variables de usuario antes de interpolar en templates de email |
| `PERMISSIONS` | `src/lib/roles.js` | Fuente única de permisos por rol — usar siempre en lugar de arrays inline |

**Regla**: Antes de tocar cualquier API route, leer `src/lib/supabaseServer.js` y `src/lib/apiAuth.js`.
**Regla de permisos**: Nunca hardcodear `['superadmin','admin','jefe_pilotos']`. Usar `PERMISSIONS.canXxx` de `src/lib/roles.js`.

---

## Base de datos (Supabase)

Tablas principales:
- `profiles` — usuarios (vinculado a auth.users, tiene org_id, role, plan, epayco_subscription_id, epayco_ref, subscription_expires_at)
- `organizations` — organizaciones (tenant principal)
- `pilots` — pilotos registrados por org
- `aircraft` — aeronaves (fleet); campo `total_hours` se actualiza automáticamente al importar vuelos DJI
- `flights` — bitácora de vuelos; campo `pilot_id` editable por admin/jefe_pilotos. Constraint `UNIQUE NULLS NOT DISTINCT (organization_id, aircraft_id, flight_date, takeoff_time)` — previene duplicados. Actualizar `total_hours` siempre vía RPC `increment_aircraft_hours(p_id, p_hours)` (atómica). Campo `replay_path` — ruta en Supabase Storage del replay guardado (nullable).
- `flight_authorizations` — autorizaciones de vuelo (RAC 100 / Aerocivil)
- `batteries` — gestión de baterías; campo `cycles` se actualiza automáticamente al importar vuelos DJI
- `battery_logs` — logs de uso de baterías
- `maintenance_logs` — mantenimiento
- `sms_reports` — reportes SMS (Safety Management System)
- `sora_templates` / `checklist_templates` — plantillas SORA y checklists
- `form_templates` / `form_settings` — formularios personalizables
- `inventory_items` / `mission_inventory_logs` — inventario por misión
- `colombia_geo` — geometría geográfica Colombia (municipios, departamentos)
- `aerocivil_submissions` — solicitudes enviadas a Aerocivil
- `pending_subscriptions` — intents de pago ePayco (reference, user_id, plan_key, billing); el webhook/verify los borra al activar. Filas huérfanas = webhook nunca ejecutó.
- `processed_webhook_refs` — tabla de idempotencia para replay protection del webhook ePayco. Columnas: `ref_payco TEXT PK`, `processed_at TIMESTAMPTZ`.
- `epayco_plan_config` — configuración de planes ePayco. Columnas clave: `plan_key`, `billing`, `amount`, `trial_days`, `replay_retention_days` (días de retención replay, 0=permanente), `replay_max_flights` (máx vuelos con replay, 0=ilimitado). Editable desde `/admin/master`.

---

## Roles y planes

**Roles públicos** (4, los que ven los usuarios): `admin`, `gerente_sms`, `jefe_pilotos`, `piloto`
**Rol interno**: `superadmin` — NO mostrar en documentación ni UI pública

**Permisos clave por rol**:
- `jefe_pilotos` + `admin` + `superadmin`: pueden editar el piloto (PIC) de cualquier vuelo vía `PATCH /api/logbook/:id`
- `admin` + `gerente_sms` + `jefe_pilotos` + `superadmin`: pueden ver y guardar Replay de Vuelo (`PERMISSIONS.canViewFlightReplay`)
- Todos los roles: pueden importar vuelos DJI desde el RC
- `admin` + `superadmin`: gestión completa de organización, flota, suscripción

**Planes** (definidos en `src/lib/planLimits.js`):
- `piloto` — free (plan base al registrarse)
- `escuadrilla`, `flota`, `enterprise` — pagos vía ePayco
- `canAddResource()` verifica límites de aeronaves/pilotos/baterías por plan

---

## Pagos (ePayco)

**Flujo subscription-landing** (el único que se usa):
1. Checkout redirige a `subscription-landing.epayco.co/plan/{planUid}`
2. `redirect_url` y `confirmation_url` se configuran en el **panel de ePayco** (dashboard.epayco.com), NO via API
3. Al volver, `/dashboard/subscription/response` llama a `POST /api/epayco/verify?ref_payco=XXX` como red de seguridad
4. El webhook `POST /api/epayco/webhook` también activa el plan (camino principal)
5. Ambos usan `activatePlanForUser()` de `lib/epaycoActivation.js` — idempotente

**URLs configuradas en panel ePayco**:
- Respuesta: `https://bitafly.com/dashboard/subscription/response`
- Confirmación: `https://bitafly.com/api/epayco/webhook`

**Cancelación**:
- `POST /api/subscription/cancel` — cancela en ePayco y degrada plan a `piloto` en Supabase
- Si `epayco_subscription_id` es null → fallback: `cancelSubscriptionsByEmail()` busca por email en la lista de suscripciones

**Diagnóstico problemas de pago**:
- Revisar `pending_subscriptions` huérfanas (el webhook las borra → filas = webhook no corrió)
- Logs Vercel runtime → buscar `/api/epayco/webhook`
- Validación manual: `secure.epayco.co/validation/v1/reference/{ref_payco}`

---

## Importación DJI (flujo completo)

El componente `src/components/DjiRcSync.js` maneja todo el flujo:

1. **Limitación MTP**: el navegador NO puede leer dispositivos USB/MTP directamente. El usuario debe copiar la carpeta `FlightRecord` al PC primero.
2. **Rutas por dispositivo** (instrucciones en tabs):
   - DJI RC 2: `Este equipo → DJI RC 2 → Almacenamiento interno compartido → Android → data → dji.go.v5 → files → FlightRecord`
   - Android: misma ruta desde el celular (Android 11+ puede bloquear Android/data vía USB)
   - iPhone: iTunes → Archivos → DJI Fly → FlightRecord → Guardar en PC
3. **Auto-navegación**: si el usuario selecciona una carpeta padre, el componente busca `FlightRecord` automáticamente (rutas conocidas + fallback recursivo 6 niveles)
4. **Al importar cada archivo** (`POST /api/logbook/import-dji`):
   - Extrae SN de aeronave del log → busca en `aircraft` de la org
   - Si no existe → responde `{ needs_aircraft: true, serial, modelo }` → frontend abre **modal crear aeronave** pre-llenado, respetando límites del plan
   - Si existe → inserta vuelo + actualiza `aircraft.total_hours`
   - Si hay `serial_bateria` y `ciclos_bateria` → actualiza `batteries.cycles` si el valor es mayor
5. **Edición de piloto post-importación**: en la bitácora, roles `admin`/`jefe_pilotos`/`superadmin` pueden asignar/cambiar el piloto (PIC) con un dropdown inline (`PATCH /api/logbook/:id`)

---

## DJI Parser (lib/djiParser.js)

`parseDjiTxtBuffer(buf)` — server-side, requiere `DJI_API_KEY` en env:
- Retorna: `serial_aeronave`, `fecha`, `hora_despegue`, `hora_aterrizaje`, `ubicacion`
- En `_meta`: `serial_bateria`, `ciclos_bateria`, `duracion_s`, `altitud_max_m`, `modelo_aeronave`, firmwares, GPS, voltajes, etc.
- Usa `dji-log-parser-js` (WASM) con keychains de la API de DJI

---

## Replay de Vuelo (Fases 1-3)

Permite revisar cualquier vuelo cuadro a cuadro: ruta GPS animada, joysticks RC, batería y alertas. Solo archivos `.txt` de DJI (el soporte `.dat` fue descartado).

### Arquitectura

- **Parser**: `dji-log-parser-js` (WASM) — browser-side, no requiere servidor
- **Compresión**: `CompressionStream('gzip')` nativo del browser — sin dependencias externas
- **Storage**: bucket privado `flight-replays` en Supabase Storage. Path: `orgs/{orgId}/replays/{flightId}.json.gz`
- **Tamaño máximo**: 2 MB por replay (JSON telemetría muestreada ~12k puntos → gzip → ~60-150 KB)
- **Signed URL**: 1 hora de validez — se genera en cada descarga
- **Permisos**: `PERMISSIONS.canViewFlightReplay` = `['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos']`

### Cuotas por plan (en `epayco_plan_config`)

| Plan | Días retención | Máx vuelos con replay |
|---|---|---|
| `piloto` | 30 días | 10 vuelos |
| `escuadrilla` | 90 días | 50 vuelos |
| `flota` | 180 días | 200 vuelos |
| `enterprise` | 0 (permanente) | 0 (ilimitado) |

**Enforcement en POST**: si se alcanza `replay_max_flights`, elimina el vuelo más antiguo antes de guardar (sliding window).  
**Enforcement en GET**: si `flight_date` supera `replay_retention_days`, limpia el archivo de Storage y devuelve 404.  
**Limpieza nocturna**: función `cleanup_expired_replays()` vía pg_cron — corre a las 03:00 UTC.

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/components/FlightReplayModal.js` | Modal completo: upload .txt → parse → visualización → guardar en Storage |
| `src/app/api/flights/[id]/replay/route.js` | GET (signed URL + expiración) · POST (enforcement cuota + upload) · DELETE |
| `src/app/api/org/replay-quota/route.js` | GET — devuelve `{ replayCount, maxFlights, retentionDays, isUnlimited, plan }` |
| `src/app/dashboard/logbook/page.js` | Botón 🔴 naranja (tiene replay) / ⚫ gris (no tiene) por fila |
| `src/app/dashboard/sms/page.js` | Botón "Replay" junto al selector de vuelo |

### Landing pages actualizadas

- `src/components/landing/Pricing.js` — fila de replay generada dinámicamente desde `/api/plans/public` (cambia sola cuando el admin edita la cuota)
- `src/components/landing/Features.js` — tarjeta "Replay GPS Animado" con badge NUEVO
- `src/app/comparativa-bitafly-airdata/page.js` — fila `Análisis avanzado telemetría` → ✅

---

## Railway Robot

Módulo en `railway-robot/` — automatizador Playwright para un sistema externo.
- Usa Express + Playwright + Supabase
- Función principal: `_automate()` en `automator.js`
- Corre en Railway (plataforma cloud separada)

---

## Comandos útiles

```bash
npm run dev          # dev server en localhost:3000
npm run build        # build producción
npm run lint         # ESLint (.eslintrc.json — v8, no flat config)
```

---

## Convenciones de código

- **API routes**: App Router (`route.js`), siempre verificar auth con `createClientSSR()` + `getOrgContext()`
- **Componentes**: `.js` (no TypeScript), Tailwind CSS
- **No hay tests** para el frontend Next.js — solo para dji-parser
- **Idioma del código**: mezcla español/inglés (variables/UI en español, código base en inglés)
- **ESLint**: usa `.eslintrc.json` (eslint v8) — NO `eslint.config.mjs` (flat config v9 — incompatible)
- **Superadmin**: rol interno, nunca mostrarlo en UI pública ni documentación
- **Fuente de titulares**: `font-lexend` (var `--font-lexend`) para headings del landing. `font-sans` (Public Sans) para el resto. Ambas declaradas en `layout.js` vía `next/font/google`.
- **Skip link**: usa `focus-visible:` (no `focus:`). Garantiza que solo aparece con navegación por teclado, nunca con clic de mouse.

---

## Grafo de conocimiento

Ejecutar `/graphify C:\Users\PC\Documents\skylog-manager` para regenerar.
Ver `graphify-out/graph.html` para exploración visual interactiva.

---

## Rutas de importación — regla crítica

Los route handlers bajo `src/app/api/public/[feature]/[orgCode]/route.js` están **dos niveles** por debajo de `src/app/api/public/`. El helper `_resolveOrg.js` vive en `src/app/api/public/`. Importar siempre con `'../../_resolveOrg'` (dos niveles), **nunca** `'../_resolveOrg'` (un nivel). Bugs de build en Vercel por este motivo en: `vor/`, `mor/`, `upload/`.

---

## Estado de fases (roadmap)

| Fase | Descripción | Estado |
|---|---|---|
| 5a | Mapas de Restricción UAS — visor ArcGIS Aerocivil (`/dashboard/safety/mapas`) | ✅ Completada |
| 5b | ArcGIS overlay en MapPickerModal (descartada — no intuitiva) | ❌ Revertida |
| 5b alt | Banner de advertencia en Plan de Vuelo → link a `/dashboard/safety/mapas` | ✅ Completada |
| 6 | Mobile UX audit y fixes (4 subphases: nav, sidebar, touch, DJI paths) | ✅ Completada |
| Auditoría | Auditoría completa de seguridad, rendimiento y deuda técnica (39 hallazgos) | ✅ Completada |
| Replay 1 | FlightReplayModal integrado en Bitácora y SMS (modal + botón por vuelo) | ✅ Completada |
| Replay 2 | Almacenamiento persistente en Supabase Storage (gzip, 2MB, signed URL 1h) | ✅ Completada |
| Replay 3 | Cuotas por plan, landing pages dinámicas, master admin, pg_cron nocturno | ✅ Completada |
| UX-3 | VorMorForm.js — stepper 3 pasos, accesibilidad, éxito con "¿Qué pasa después?" | ✅ Completada |
| UX-4 | DashboardClient.js — KPI hero, trend badge, chart accesible (figure/table sr-only) | ✅ Completada |
| UX-5 | subscription/manage — plan card, upgrade CTAs, modal anti-churn, cancelación | ✅ Completada |
| UX-6 | Landing — fuente Lexend, micro-interacciones Hero/Features/Pricing, trust badges | ✅ Completada |
| UX-7 | SORA — progressive disclosure: primer JARUS, leyenda SAIL, filas expandibles, contexto por paso | ✅ Completada |
| 7 | PWA / Android app para controladores DJI Enterprise | ⏳ Pendiente |

### Commits por fase

| Fase | Commit | Descripción |
|---|---|---|
| 5a | `231ec8f` | Visor ArcGIS Aerocivil en Safety |
| 5a fix | `211f240` | URL oficial Aerocivil corregida |
| 5b revert | `90deadd` | Revert modal + banner plan-vuelo |
| 6a | `5b83a29` | Bottom nav: relative, piloto plan, safe-area, FAB label |
| 6a fix | `f134b59` | Sidebar footer tapado por bottom nav |
| 6b | `eff23c6` | Tooltips gráfico touch + dropdown piloto overflow |
| 6c | `9bb683f` | Rutas DJI verticales en mobile |
| Auditoría 1-A | `fade91d` | Auth guards en reports + cross-tenant leak |
| Auditoría 1-B | `f1949ec` | Auth null check, info disclosure, phishing invite |
| Auditoría 1-C | `069d68f` | Mass-assignment allowlists (sms, form-templates) |
| Auditoría 1-D | `14542ff` | HTML escape en emails públicos + emailHelpers.js |
| Auditoría 1-E | `d930000` | XSS notificación VOR/MOR + org guard update + PII log |
| Auditoría 1-F | `5c26fba` | File upload size + MIME validation |
| Auditoría 1-G | `d5f2924` | Timing-safe compare, salt warning, plan_key whitelist |
| Auditoría 2-B | `775dd3e` | Imports atómicos: ON CONFLICT + RPC total_hours |
| Auditoría 2-C | `d7d9dc9` | Ordering correcto en register y delete |
| Auditoría 3-A | `19f96c8` | Webhook replay protection + billing fallback + IDOR batteries |
| Auditoría 4-A | `3a5039f` | Rate limiting endpoints públicos (VOR, MOR, contact) |
| Auditoría 4-B | `901973d` | Rate limiting autenticación (login, register, reset) |
| Auditoría 5-A | `5783508` | Rendimiento + hallazgos bajos (token body, service role, NULL duplicate) |
| Auditoría 5-B | `abb4bc8` | Centralizar permisos en PERMISSIONS + eliminar dead code |
| Replay 1 | `(fase 1)` | FlightReplayModal + botón bitácora + botón SMS + PERMISSIONS.canViewFlightReplay |
| Replay 2 | `819c2bd` | Storage gzip + signed URL + auto-load + botón naranja/gris optimista |
| Replay 3 | `8ea10e8` | Cuotas DB + enforcement API + master admin + Pricing dinámica + Features + comparativa |
| Replay 3-E | `0ff0557` | pg_cron cleanup_expired_replays() — limpieza nocturna 03:00 UTC |
| UX-3 | `5f31c9a` | VorMorForm: stepper, accesibilidad, éxito con timeline "qué pasa después" |
| UX-4 | `1190ae4` | DashboardClient: KPI hero, trend badge, chart figure/figcaption + sr-only table |
| UX-5 | `a337708` | subscription/manage: plan card, upgrade CTAs, anti-churn retention modal |
| UX-6 | `0b8ff35` | Landing: Lexend font, Hero stagger+float+trust badges, Features stagger, Pricing lift |
| UX-7 | `d9bb71a` | SORA: progressive disclosure — primer, SAIL legend, filas expandibles, step context |
| Fix skip-link + logo | `f69b03e` | focus: → focus-visible: en skip link; logo imagen en navbar landing |
| Fix nav documentacion | `35db1fb` | Agregar "Preguntas" y logo al nav de /documentacion |

### Fixes Fase 6 — resumen técnico

| Fix | Archivo | Problema | Solución |
|---|---|---|---|
| `relative` en BottomNavItem | `layout.js` | Indicador activo flotaba fuera del ítem | Añadir `relative` al Link |
| "Planear Vuelo" en bottom nav | `layout.js` | Plan piloto no tenía acceso rápido | Detectar `isPilotoPlan` y mostrar item "Planear" |
| safe-area sidebar footer | `layout.js` | Logout tapado por bottom nav | `pb-20 lg:pb-3` en footer del sidebar |
| safe-area contenido | `layout.js` | `pb-24` insuficiente en iPhone | `pb-28` cubre nav + home indicator |
| FAB label | `layout.js` | Botón `+` sin contexto visual | Añadir label "Nuevo" bajo el ícono |
| Tooltips gráfico touch | `DashboardClient.js` | `group-hover` invisible en mobile | Badge permanente en mobile, tooltip hover en desktop |
| Dropdown piloto overflow | `logbook/page.js` | `left-0` se salía en 375px | `right-0 md:left-0` |
| Rutas DJI mobile | `DjiRcSync.js` | Path horizontal desbordaba pantalla | Vertical list con ícono `subdirectory_arrow_right` en mobile |

### Archivos clave por fase

**Fase 5a/5b:**
- `src/app/dashboard/safety/mapas/page.js` — visor ArcGIS (tabs: Visor / Referencia)
- `src/app/dashboard/safety/page.js` — índice de Seguridad Operacional (5 módulos)
- `src/app/dashboard/plan-vuelo/page.js` — banner ámbar pre-formulario (link a /safety/mapas)
- `src/components/authorizations/MapPickerModal.js` — modal Leaflet LIMPIO (sin ArcGIS)

**Replay de Vuelo (Fases 1-3):**
- `src/components/FlightReplayModal.js` — modal replay (upload + visualización + Storage)
- `src/app/api/flights/[id]/replay/route.js` — GET/POST/DELETE con enforcement de cuota
- `src/app/api/org/replay-quota/route.js` — cuota actual de la org
- `src/components/landing/Pricing.js` — fila replay dinámica desde BD
- `src/components/landing/Features.js` — tarjeta "Replay GPS Animado"
- `src/app/comparativa-bitafly-airdata/page.js` — fila telemetría actualizada
- `supabase/migrations/20260604_replay_quota_and_cron.sql` — columnas cuota + pg_cron

**Ciclo UX (Fases 3-7) — archivos clave:**
- `src/components/public/VorMorForm.js` — formulario público VOR/MOR con stepper 3 pasos
- `src/app/dashboard/DashboardClient.js` — dashboard principal con KPIs accesibles y chart semántico
- `src/app/dashboard/subscription/manage/page.js` — gestión suscripción con plan card, upgrade CTAs y retention modal
- `src/components/landing/Hero.js` — hero con stagger, float, trust badges, shimmer CTA
- `src/components/landing/Features.js` — grid con stagger y Lexend
- `src/components/landing/Pricing.js` — cards con hover lift y precios Lexend + tabular-nums
- `src/app/dashboard/sora/page.js` — SORA con accordions, KPIs, filas expandibles, empty state educativo
- `src/components/sora/SoraWizard.js` — wizard con contexto por paso y tooltip JARUS

**⚠️ Navbars duplicados — regla:**
Las páginas `/documentacion` y otras fuera del landing tienen su propio `<header>` hardcodeado en el archivo `page.js`. Si se agrega un link al nav del landing (`src/app/page.js`), hay que replicarlo manualmente en `src/app/documentacion/page.js`. Pendiente refactorizar a un componente `<LandingNav>` compartido.

**URL ArcGIS oficial Aerocivil:**
```
https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6
```

---

## Pendientes de infraestructura

- [ ] Ejecutar en Supabase SQL:
  ```sql
  UPDATE epayco_plan_config SET amount = 20000, trial_days = 30, updated_at = now() WHERE plan_key = 'piloto' AND billing = 'monthly';
  UPDATE epayco_plan_config SET amount = 200000, trial_days = 30, updated_at = now() WHERE plan_key = 'piloto' AND billing = 'annual';
  ```
- [ ] Agregar `DJI_API_KEY` a variables de entorno de Vercel
- [ ] Agregar `NEXT_PUBLIC_APP_URL` a variables de entorno de Vercel
- [ ] Agregar `AEROCIVIL_SALT` a variables de entorno de Vercel → luego remover el fallback hardcodeado en `src/app/api/aerocivil/credentials/route.js` (buscar el comentario `TODO`)

---

## Seguridad — convenciones post-auditoría

### Patrones obligatorios en API routes
- **Rate limiting**: todo endpoint público sin auth debe usar `checkRateLimit()` de `src/lib/rateLimiter.js`
- **HTML escape en emails**: todo campo de usuario que se interpole en HTML de Resend debe pasar por `escHtml()` de `src/lib/emailHelpers.js`
- **Mass-assignment**: nunca `insert([{ ...body, ... }])`. Siempre definir un objeto con campos explícitos permitidos
- **Auth guard**: después de `getUser()`, siempre verificar `if (!user) return 401` antes de usar `user.id`
- **Permisos**: usar `PERMISSIONS.canXxx` de `src/lib/roles.js`, nunca arrays inline de roles
- **total_hours**: actualizar siempre vía RPC `increment_aircraft_hours(p_id, p_hours)` — nunca read-calculate-write

### Objetos de seguridad en Supabase (aplicados 2026-06-03)
- Constraint `UNIQUE NULLS NOT DISTINCT (organization_id, aircraft_id, flight_date, takeoff_time)` en `flights`
- Tabla `processed_webhook_refs` — idempotencia del webhook ePayco
- Función `increment_aircraft_hours(p_id uuid, p_hours numeric)` — incremento atómico
- Índices: `idx_vor_mor_org_type`, `idx_flights_org_pilot`, `idx_aircraft_serial_trgm`, `idx_batteries_serial_trgm`

### Archivos de seguridad nuevos
| Archivo | Propósito |
|---|---|
| `src/lib/emailHelpers.js` | `escHtml()` — escape HTML para emails |
| `src/lib/rateLimiter.js` | `checkRateLimit()` + `getClientIp()` — rate limiting sin deps externas |
