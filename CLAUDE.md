# SkyLog Manager — CLAUDE.md

## Qué es este proyecto

**BitaFly** es una plataforma SaaS de gestión de operaciones con drones para Colombia (RAC 100 / Aerocivil / UAEAC).

- **Stack**: Next.js 14 App Router, Supabase (PostgreSQL + Auth), ePayco, Resend, Tailwind CSS
- **Deploy**: Vercel — ver Vercel MCP para logs de runtime
- **DB**: Supabase — ver Supabase MCP para queries directas

---

## Estructura src/

```
app/
├── api/
│   ├── auth/          ← register, login, reset-password, activate-pending, validate-join, join-org
│   ├── flights/       ← authorize, [id]/replay
│   ├── pilots/        ← CRUD
│   ├── fleet/         ← aircraft, batteries, tech
│   ├── logbook/       ← import-dji, [id] (PATCH pilot_id + mission_id)
│   ├── flight-plans/  ← GET/POST/DELETE planeaciones guardadas
│   ├── maintenance/   ← attachment_path incluido
│   ├── epayco/        ← webhook, verify, checkout
│   ├── subscription/  ← cancel
│   ├── socio/         ← me, grants (GET/POST/DELETE), advisors, reports, logo, account, invite-info (panel escuelas/asesores)
│   ├── cron/          ← free-grants (expiración y purga de perfiles gratis)
│   ├── sora/ · sms/ · reports/ · dashboard/
│   ├── search/         ← GET /api/search?q= — búsqueda global (flights/aircraft/pilots, acotada a la org)
│   ├── audit-log/      ← GET — log de acciones de usuario (ver Auditoría de acciones)
│   ├── billing-history/ ← GET — historial de pagos informativo (ver Historial de facturación)
│   ├── app/version/   ← GET público — versión actual del APK (OTA updates)
│   └── admin/master/  ← superadmin + epayco-subscriptions + partners + commissions + releases
└── dashboard/         ← páginas client-side
    ├── batteries/      ← ruta propia (extraída de fleet, Fase 4 del rediseño — ver Sistema de Diseño)
    └── weather/        ← ruta propia (Meteorología como página, reutiliza WeatherWidget)

components/
├── DjiRcSync.js        ← importación DJI
├── FlightReplayModal.js ← replay GPS animado
├── AddMaintenancePanel.js ← drag-drop upload adjuntos
├── AircraftCard.js     ← overflow-hidden en imagen, NO en root (evita cortar dropdowns). IconTile (64px) es el
│                          elemento principal desde el rediseño; la foto real (image_url) es miniatura secundaria
├── WeatherWidget.js    ← widget de clima reutilizable (ver sección Módulo de Clima)
├── AppUpdateBanner.js  ← OTA update banner/modal (solo Capacitor Android)
├── PageHero.js         ← banner navy compartido (eyebrow/title/description/metric/cta) — encabezado de página
├── KPIStrip.js         ← grilla de KPICard reutilizable (icon/label/value/trend)
├── IconTile.js         ← tile de icono 64px/radio 18px, variantes default/navy/solid
├── GlobalSearch.js     ← input de búsqueda del header, consume /api/search con debounce
├── authorizations/     ← BasicForm, AerocivilForm, MapPickerModal (acepta initialCenter/initialZoom)
└── landing/ · settings/

lib/
├── supabaseServer.js   ← createClientSSR() + createAdminClient()
├── apiAuth.js          ← getOrgContext()
├── roles.js            ← PERMISSIONS (fuente única)
├── planLimits.js       ← PLAN_CONFIG, canAddResource()
├── checklistDefaults.js ← CHECKLIST_DEFAULTS + buildChecklistRows()
├── djiParser.js        ← parseDjiTxtBuffer() — requiere DJI_API_KEY
├── appUpdate.js        ← checkForUpdate() + downloadAndInstall() — bridge JS para OTA
├── epaycoActivation.js ← activatePlanForUser() — idempotente
├── emailHelpers.js     ← escHtml() + emailHeader()/emailFooter()/bitaflyLogoUrl() (branding correos con logo BitaFly + logo del socio)
├── rateLimiter.js      ← checkRateLimit() + getClientIp()
├── partnerReferral.js  ← attributeCommission() — atribución recurrente de comisiones a socios
├── auditLog.js         ← logAudit() — fire-and-forget, ver Auditoría de acciones
└── smsCase.js          ← logCaseEvent() — fire-and-forget, ver Seguimiento de casos SMS/VOR/MOR
```

---

## Abstracciones clave

| Función | Archivo | Descripción |
|---|---|---|
| `createClientSSR()` | `supabaseServer.js` | Cliente Supabase SSR — usar en TODOS los API routes |
| `createAdminClient()` | `supabaseServer.js` | Service role — para operaciones privilegiadas / conteos confiables |
| `getOrgContext()` | `apiAuth.js` | Extrae `user`, `orgId`, `role`, `subscription_plan` del JWT (la clave es `subscription_plan`, no `plan`) |
| `PERMISSIONS.canXxx` | `roles.js` | Fuente única de permisos — NUNCA arrays inline de roles |
| `activatePlanForUser()` | `epaycoActivation.js` | Activa plan en profiles + limpia pending_subscriptions (idempotente) |
| `canAddResource()` | `planLimits.js` | Verifica límites de flota/pilotos/baterías/tech por plan |
| `checkRateLimit()` | `rateLimiter.js` | Rate limiting en memoria por IP |
| `escHtml()` | `emailHelpers.js` | Escapa HTML antes de interpolar en templates de email |

**Regla antes de tocar cualquier API route**: leer `supabaseServer.js` + `apiAuth.js`.  
**Regla de conteo**: usar `createAdminClient()` con `.select('id')` + `.length` — NO `{ count: 'exact', head: true }` (PostgREST puede ignorar filtros RLS).

---

## Base de datos

Tablas principales:
- `profiles` — users, tiene `organization_id`, `role`, `subscription_plan`, `epayco_subscription_id`, `subscription_expires_at` (NO existe `org_id` ni `plan`; `organizations` no tiene columna de plan)
- `organizations` — tenant. Tiene `enable_health_check`, `enable_preflight`, `enable_briefing`, `enable_inventory_checklist` (toggles protocolos, ver **Inventario de Operación**). Registro AeroCivil: `dan_number` (N° Explotador), `operator_number` (N.º de operador UAS), `registration_expiry` (vigencia del registro), `authorized_operations jsonb` (chips de autorizaciones activas, texto libre) — ver **Organización rediseñada**.
- `pilots` · `aircraft` · `batteries` · `battery_logs`. `pilots.invitation_status` 'pending'/'accepted'/'rejected'/null · `pilots.profile_id` se vincula al aceptar invitación · `pilots.avatar_url`/`aerocivil_additions` (jsonb)/`notes`
  - `aircraft` mantenimiento: `maintenance_interval_hours` (default 200), `maintenance_interval_days` (default 180), `operational_status` ('disponible'/'en_mantenimiento', CHECK, NOT NULL), `last_status_change`. Ver sección **Mantenimiento de Aeronaves**. La foto va en `image_url` (bucket público `fleet-images`, ver Convenciones).
- `flights` — además de los campos de PATCH: `total_time` (double precision, **horas**) es la duración real del vuelo. La bitácora muestra duración desde `total_time` (fallback takeoff/landing); el import DJI lo calcula de `duracion_s/3600`.
- `invitations` — invitación de tripulante: `email`, `role`, `organization_id`, `status`, `token` (UNIQUE, para enlaces), `pilot_id`, `invited_by`, `name`, `accepted_at`
- `flights` — `pilot_id` + `mission_id` editables vía PATCH. `replay_path` nullable. `plan_id` FK → flight_plans. Constraint `uq_flights_org_aircraft_date_time` UNIQUE NULLS NOT DISTINCT `(organization_id, aircraft_id, flight_date, takeoff_time)`.
- `maintenance_logs` — tiene `attachment_path TEXT` (bucket `maintenance-docs`, signed URL 1h)
- `flight_plans` — planeaciones guardadas. `status` 'active'/'archived' (soft-delete). RLS por org.
- `flight_authorizations` — misiones programadas. `plan_data jsonb` guarda la planeación (op_name, geo_type, points, radius, altitude, takeoff_time, notes) para regenerar KMZ/PDF en Programación Activa.
- `sms_reports` — `severity` (incidente/incidente_grave/accidente), `status` ('abierto' default desde 2026-07-03, antes 'borrador'), `updated_at` (agregada 2026-07-03, con trigger `set_updated_at()` — necesaria para medir tiempo de cierre de casos) · `sora_assessments` · `daily_health_checks` · `pilot_endorsements`
- `form_definitions` (campos de formulario por aeronave — los checklists se generan combinando esto con `lib/checklistDefaults.js`) · `inventory_items` · `mission_inventory_logs` · `mission_types` · `colombia_geo` (sin coordenadas — solo Código/Nombre Departamento/Municipio)
- `vor_mor_definitions` · `vor_mor_submissions` (reportes VOR/MOR) — `severity` y `aerocivil_notified_at` agregadas 2026-07-03 (ver **Seguimiento de casos SMS/VOR/MOR**); `reported_severity` (autoevaluación del reportante, distinta de `severity`) y `related_barrier_id` FK → `safety_barriers` agregadas 2026-07-03 (ver **Editor de formato VOR/MOR rediseñado**) · `emergency_contacts` · `insurance_policies` · `leads`
- `safety_barriers` — barreras de seguridad (mitigaciones/controles) reales, reemplaza la vista de solo lectura sobre `form_definitions`. `category` CHECK 4 valores, `hazard` (riesgo que mitiga, texto libre), `sora_assessment_id` FK opcional a `sora_assessments`, `responsible` (texto libre), `status` CHECK 3 valores. RLS: solo `admin`/`superadmin`/`gerente_sms` (mismo `canManageSMS`) leen/escriben.
- `sms_case_actions` / `sms_case_events` — seguimiento de casos SMS/VOR/MOR (acciones correctivas + línea de tiempo). Cada fila referencia exactamente uno de `sms_report_id`/`vor_mor_id` (CHECK `num_nonnulls(...) = 1`). Ver **Seguimiento de casos SMS/VOR/MOR**.
- `pending_subscriptions` — intents ePayco (filas huérfanas = webhook no corrió)
- `pending_registrations` — registro pre-pago (expira 3h, service_role only)
- `processed_webhook_refs` — idempotencia webhook (`ref_payco PK`)
- `epayco_plan_config` — configuración planes: `replay_retention_days`, `replay_max_flights`. Editable desde `/admin/master`.
- `audit_log` — log append-only de acciones (`organization_id`, `actor_id`, `actor_name`, `action`, `module`, `entity_label`, `metadata jsonb`, `created_at`). RLS: managers de la org leen, solo service role escribe. Ver **Auditoría de acciones**.
- `protocols` — biblioteca libre de procedimientos (`organization_id`, `name`, `category` CHECK 5 valores, `description`, `icon`, `steps jsonb`, `created_by`). RLS: solo `admin`/`superadmin`/`gerente_sms` de la org leen/escriben. Ver **Protocolos**.
- `billing_history` ⚠️ **migración creada, NO aplicada aún** (`supabase/migrations/20260702_billing_history.sql`) — historial de pagos informativo (no factura fiscal). RLS: cada usuario ve el suyo, solo service role escribe. Ver **Historial de facturación**.

**Regla `total_hours`**: actualizar siempre vía RPC `increment_aircraft_hours(p_id, p_hours)` — nunca read-calculate-write.

---

## Roles y planes

**Roles públicos**: `admin`, `gerente_sms`, `jefe_pilotos`, `piloto`  
**Rol interno**: `superadmin` — NO mostrar en UI pública ni documentación

**Límites por plan** (`planLimits.js`):

| Recurso | piloto | escuadrilla | flota | enterprise |
|---|---|---|---|---|
| Drones | 1 | 3 | 15 | ∞ |
| Pilotos | 1 | 4 | 15 | ∞ |
| Baterías | 3 | ∞ | ∞ | ∞ |
| Tech/Payloads | 3 | ∞ | ∞ | ∞ |

**Conteo de tripulantes** (`crewCountsForLimit(pilotRole)` en `planLimits.js`): **Gerente General y Gerente SMS NO cuentan** contra el límite de "Pilotos"; sí cuentan Piloto, Jefe de Pilotos y Observador. Aplicado en: import onboarding, `POST /api/pilots`, medidor de uso en `/api/subscription`.

**Gerente General fuera del roster** (`isGerenteGeneral(pilotRole)` en `planLimits.js`): el GG es el dueño/representante legal, no tripulación operativa. La página de Tripulación (`/dashboard/pilots`) **filtra** las filas `pilots` con `pilot_role` "Gerente General" (o rol de sistema `admin`) — no aparecen en la lista ni en el contador "N miembros". Valor canónico de `pilot_role` = "Gerente General" (ver `AddPilotPanel`/`EditPilotPanel`).

### Piloto Independiente (role=`admin` + plan=`piloto`)

- Se registra como `type='solo'` → crea su propia org. Auto-login directo al dashboard.
- **⚠️ Siempre role=`admin` en BD** — las RLS de `aircraft`, `batteries`, `inventory_items`, `maintenance_logs` usan `private.can_manage_ops()` que requiere `admin|jefe_pilotos|superadmin`. `role='piloto'` bloquea INSERTs.
- `canManageOps` incluye `'piloto'` en `roles.js` (UI/JS), pero la BD necesita `admin`. **`canManageFleet` ya NO incluye `'piloto'`** (el piloto de org es solo-lectura; el independiente conserva todo por ser `admin`).
- **Despacho simplificado**: no requiere orden de vuelo ni batería. Pide `mission_type` + aeronave + hora de despegue. Baterías se sincronizan al importar DJI.
- **⚠️ Detección del piloto independiente**: TODOS los miembros de una org tienen `profile.subscription_plan='piloto'` (el plan de pago vive en el perfil del **admin**; `organizations` no tiene columna de plan). Por eso el "piloto autónomo" se detecta como **`subscription_plan==='piloto' && role==='admin'`** — usado en `layout.js` (`isPilotoPlan`) y en `logbook/new` (`pilotPlan`). NO usar solo el plan: confundiría a piloto/jefe/gsms con el independiente.
- **Auto-piloto DJI**: si no existe registro en `pilots` al importar, se crea automáticamente con datos del perfil.
- **Planeaciones**: guarda en `/plan-vuelo`, selecciona antes de volar desde `/logbook/new`.
- **Unirse a org**: desde `/dashboard/subscription`, ingresa NIT, elige rol → `POST /api/auth/join-org` transfiere toda la data (aircraft, batteries, flights, pilots, flight_plans, etc.) al nuevo org y actualiza `profiles.organization_id + role`. La org origen queda marcada como `[Migrada]`.
- OnboardingBanner NO se muestra al piloto independiente.

### Piloto dentro de Organización (role=`piloto`)

Miembro de una org ajena (se unió por NIT o invitación). `profile.subscription_plan='piloto'` pero NO es independiente.

- **Registro/unión**: el flujo "unirse" (`/registro` o `POST /api/auth/register` con `joinMode`) hace **auto-login** y entra directo al dashboard. Reconcilia la invitación: reutiliza la fila `pilots` existente (vincula `profile_id`/`owner_id`, marca `invitation_status='accepted'`) y pone la `invitation` en `accepted` (sin duplicados, sin "Invitación pendiente" perpetuo).
- **Flota**: solo-lectura. Los botones editar/baja/transferir/eliminar se ocultan vía `canManage` en `AircraftCard`/`BatteryCard`/`TechCard` (`canManageFleet` no lo incluye).
- **Sin Suscripción**: el nav de Suscripción solo aparece para `superadmin`/`admin`.
- **Despacho** (`/logbook/new`): usa el flujo CON orden de vuelo; solo ve las misiones donde es el PIC asignado Y programadas para **hoy** (`visibleAuths` filtra `resources.auths` por su `pilots.id` + `scheduled_at` == fecha actual, 2026-07-02d — antes veía todas sus misiones asignadas sin importar la fecha). No puede adelantar ni atrasar el despacho respecto a la fecha programada. Managers no tienen esta restricción.
- **Mis Vuelos** (`/dashboard/mis-vuelos`): vista solo-lectura de sus misiones programadas (reutiliza `ProgramacionActivaClient` con props `pilotEmail`/`pilotId`/`readOnly`), con descarga KMZ/PDF.
- **Planear Vuelo**: puede planear; al guardar (`POST /api/flight-plans`) si `role==='piloto'` se **notifica por correo al Jefe de Pilotos y GG** (`notifyFlightPlan`).
- **Expediente self-service** (`/dashboard/settings/profile`): sube cédula, diploma UAS, examen teórico, certificado médico (+ vencimiento), CIPU y contacto de emergencia → `PATCH /api/pilots/my-documents` (campos en `pilots`; crea la fila si falta). Al guardar **notifica a GG/JP/GSMS**. Visibles para ellos en Tripulación / `EditPilotPanel`.
- **SORA**: visible para el rol piloto.
- **Dashboard propio** (`PilotDashboard.js`, se renderiza cuando `role==='piloto'`): KPIs propios (horas de vuelo, vuelos realizados, vuelos pendientes), **gráfica de horas mensuales** (últimos 6 meses, suma `flights.total_time` por mes), lista de misiones programadas con botón Despachar, y botones de reporte **VOR**/**MOR** (formularios públicos `/vor/{org}` · `/mor/{org}`).

---

## Pagos (ePayco)

**Suscripción**: una sola página `/dashboard/subscription` (la antigua `/manage` redirige ahí). Maneja upgrade, cancelación, verificar pago, unirse a org y período de gracia.

**Flujo de pago (nueva pestaña + polling)**:
1. `/dashboard/subscription` → `POST /api/epayco/checkout` inserta intent en `pending_subscriptions` (con `plan_key` + `billing` + `user_id`) y devuelve URL `subscription-landing.epayco.co/plan/{uid}`.
2. Abre ePayco en **nueva pestaña** (`window.open` SIN `noopener` — se necesita la referencia para detectar cierre y recibir `postMessage`).
3. El **webhook** (`POST /api/epayco/webhook`) activa el plan server-side vía `activatePlanForUser()`.
4. La página padre hace **polling del perfil cada 4s** (hasta 10 min) y actualiza la UI en cuanto el plan cambia — NO depende de que ePayco redirija.
5. Si ePayco sí redirige a `/dashboard/subscription/response` y la página es popup, envía `postMessage(BITAFLY_PLAN_ACTIVATED)` al padre y se autocierra.
6. **Red de seguridad manual**: panel "Verificar pago" en la misma página → `POST /api/epayco/verify` con el `ref_payco` del correo de ePayco (requiere sesión).

**⚠️ Webhook de ePayco — reglas críticas (todas verificadas en prod):**
- **Body es JSON**, NO form-urlencoded. `URLSearchParams` devuelve `{}` silenciosamente → parsear con `JSON.parse` (detectar por `content-type`).
- **Firma = 6 campos** (NO incluir `x_transaction_state`): `sha256(p_cust_id_cliente ^ p_key ^ x_ref_payco ^ x_transaction_id ^ x_amount ^ x_currency_code)`. Key desde `EPAYCO_P_KEY` (fallback `EPAYCO_PRIVATE_KEY`).
- **`x_extra1/2/3` NO son nuestros valores** en subscription-landing — ePayco los rellena con UIDs internos suyos. Solo aceptar `x_extra1` si es plan válido, `x_extra2` si es `monthly|annual`, `x_extra3` si es **UUID** (nuestros `user.id`). Si no, resolver por email (`x_customer_email`) + `pending_subscriptions`.
- **Resolución de plan/usuario** (en orden): extras válidos → `pending_subscriptions` by reference → email → `resolvePendingForUser()` → mapeo `epayco_plan_config.epayco_id`/`epayco_uid`.
- Debe responder **GET 200** (ePayco verifica la URL antes de usarla) — sin GET handler da 405.
- **Idempotencia**: insertar `ref_payco` en `processed_webhook_refs` SOLO tras activar con éxito (no antes — un fallo bloquearía reintentos legítimos).
- `redirect_url` y `confirmation_url` se configuran en el **panel de ePayco**, NO via API.

**Flujo pago-antes-cuenta** (`/registro` planes de pago):
- `POST /api/auth/register-pending` → guarda en `pending_registrations`, devuelve URL ePayco
- `POST /api/auth/activate-pending` — polling manual (rate limit 10/hr, sin auth)
- Webhook también detecta `x_customer_email` en `pending_registrations` y crea la cuenta.

**Flujo unirse a org** (empleados): `GET /api/auth/validate-join?nit=&role=` → `POST /api/auth/register` con `joinMode: true`.

**Cancelación**: `POST /api/subscription/cancel`. Si `epayco_subscription_id` es null, busca por email (⚠️ la API de ePayco NO devuelve email — `cancelSubscriptionsByEmail()` siempre retorna `matched: 0`). Para cancelar por código: **panel Master `/admin/master` → tab Suscripciones** (`/api/admin/master/epayco-subscriptions` lista y cancela por `_id`, y degrada el perfil a piloto).

**Diagnóstico**: logs Vercel `/api/epayco/webhook` (muestra `contentType`, `keys`, firma) · `pending_subscriptions` huérfanas · `secure.epayco.co/validation/v1/reference/{ref}`.

---

## Importación DJI

`DjiRcSync.js` + `POST /api/logbook/import-dji`:
1. Navegador NO puede leer USB/MTP — usuario debe copiar los logs `.txt` al PC
2. El componente busca una subcarpeta `FlightRecord` (rutas conocidas + fallback recursivo 6 niveles); **si no la encuentra, escanea directamente la carpeta seleccionada** — el usuario puede tener los `.txt` en cualquier carpeta, no es obligatorio que se llame `FlightRecord`. En mobile, selección directa de archivos `.txt`.
3. Extrae SN aeronave → si no existe en la org → `{ needs_aircraft: true }` → modal crear aeronave
4. Inserta vuelo (guarda `total_time` en horas) + actualiza `total_hours` vía RPC + actualiza `batteries.cycles` si mayor
5. Plan `piloto`: auto-crea registro en `pilots` si no existe (evita "Sin asignar")
6. `parseDjiTxtBuffer()` requiere `DJI_API_KEY` en env (WASM, server-side)
7. **Vuelos de 0 minutos se omiten** (`durationHours <= 0` → `{ skipped: true }`, HTTP 200). `DjiRcSync` los marca con estado `skipped` ("Vuelo de 0 min — omitido"), cuenta en `skipped`, NO los inserta ni incrementa horas.

**Auto-sincronización** ("elegir carpeta una vez → cargue automático"):
- **Escritorio Chrome/Edge (y RC vía PC)**: File System Access API. El handle de la carpeta se persiste en IndexedDB (`idbHandleStore`, key `dji-flightrecord`). Toggle "Auto-sincronización" (pref en `localStorage` `bitafly_dji_autosync`) activa un **sondeo cada 20s** (`AUTOSYNC_INTERVAL_MS`) que detecta `.txt` nuevos (dedup vs BD con `/import-dji/check`) y los importa solos vía `uploadFile`. Pausa si la pestaña está oculta o hay import manual en curso. Si el permiso del handle expiró, pide pulsar "Sincronizar" una vez (gesto de usuario para `requestPermission`).
- **Android Chrome**: NO soporta `showDirectoryPicker`. Usa `<input webkitdirectory>` para elegir la carpeta FlightRecord completa de una vez → auto-importa lo nuevo en esa pasada. No hay vigilancia en segundo plano (limitación de la plataforma web).
- **iOS Safari**: NO soporta selección de carpeta → `<input multiple>` de archivos `.txt`, con auto-import tras seleccionar.
- `handleImport(explicitList?)` acepta una lista explícita para la auto-importación tras escaneo.

---

## Mantenimiento de Aeronaves

Configuración de mantenimiento mayor por aeronave, con cambio de estado automático y bloqueo de despacho.

- **Columnas** (`aircraft`): `maintenance_interval_hours` (cada N horas, default 200), `maintenance_interval_days` (cada N días, default 180), `operational_status` ('disponible'/'en_mantenimiento'), `last_status_change`.
- **UI** (`EditAircraftPanel`): sección "Configuración de Mantenimiento" con inputs de intervalo (horas/días), indicador de cuánto falta para el próximo mantenimiento, y toggle manual Disponible / En mantenimiento. `AircraftCard` muestra badge "EN MANTENIMIENTO".
- **API** (`PATCH /api/fleet/[id]`): acepta los 3 campos nuevos. Si el cliente NO manda `operational_status`, `calcAutoStatus()` evalúa los umbrales contra `total_hours`/`last_maintenance_*` y puede auto-marcar `en_mantenimiento`. Si manda `disponible` manualmente, lo respeta y sella `last_status_change`.
- **Guard de despacho** (`logbook/new`): el selector de aeronaves filtra `.neq('operational_status', 'en_mantenimiento')`. `AddMaintenancePanel` SÍ las incluye (es para registrarles mantenimiento).
- **Cron** (`check_aircraft_maintenance_due()`, `30 13 * * *` = 8:30 AM Colombia): evalúa todas las aeronaves disponibles, marca `en_mantenimiento` las que superan umbral y notifica a GG+JP (`notifications` tipo `maintenance_due`). `SECURITY DEFINER`, EXECUTE revocado a PUBLIC. Migraciones: `20260613_aircraft_maintenance_config.sql` + `20260613_aircraft_maintenance_cron.sql`.

### Flota + Baterías rediseñadas (2026-07-02f) — dos páginas separadas con enlaces cruzados

Termina la extracción pendiente de la Fase 4.3 del plan de rediseño: Baterías ya no vive
embebida en `/dashboard/fleet`, son dos páginas independientes con `PageHero`/`KPIStrip`
franja/barra de filtros, y enlaces cruzados reales ("Ver baterías" en Flota, "Ver flota" en
Baterías) — tal como muestran los mockups.

- **`AircraftCard.js`**: grid-card (antes fila horizontal) — foto/ícono + badge de estado
  arriba, modelo/serie/chips de batería/horas + últ. mantenimiento abajo. Misma lógica de
  editar/dar de baja/transferir/trazabilidad de componentes, solo cambió el layout visual.
- **Chips de batería por aeronave** (dato real, no fabricado): se derivan de `battery_logs`
  — mismo patrón que ya usa `/dashboard/batteries` en sentido inverso para calcular "última
  aeronave" de cada batería, aquí agrupado por `aircraft_id` en vez de por `battery_sn`.
  Coloreados por `health_status` real (el mockup mostraba "% de carga", que no existe en el
  esquema de `batteries` — no se fabricó ese dato).
- **Baterías**: pasa de grid de tarjetas a tabla (ID/serie, modelo, ciclos, barra de salud,
  última aeronave, estado). Umbral de retiro = **200 ciclos** (mismo que `BatteryCard.js` y
  el escáner de alertas del dashboard) — no los 400 del mockup, para no introducir una regla
  de negocio nueva inconsistente con el resto de la app.
- **`AddAircraftPanel.js`/`AddBatteryPanel.js`**: restyleados al layout de 2 columnas de los
  mockups "Nueva Aeronave"/"Nueva Batería" (mismo patrón que `MissionFormPanel`: hero navy +
  card blanca). Solo campos reales del esquema — se omitieron del mockup: Categoría, MTOW*,
  Fecha de adquisición, Payload/sensor instalado y Póliza de seguro por aeronave, "ID
  interno" y "Estado inicial: En servicio/Disponible" por batería (no existen como campos
  distintos en `aircraft`/`batteries`; el `mtow` si es real y sí se incluyó).
  `POST /api/fleet` ahora también acepta `maintenance_interval_days` y `operational_status`
  en la creación (antes solo editables desde `EditAircraftPanel`); `POST /api/fleet/batteries`
  acepta `last_maintenance`. El "Estado inicial" del batería se omitió (siempre nace
  `Operativo`, ya era el comportamiento hardcodeado del servidor — no hay un valor real
  distinto de "disponible/sin uso" en `batteries.status`).
- Se eliminó `components/BatteryCard.js` (quedó sin usar tras el rediseño de Baterías a tabla).

### Tripulación rediseñada (2026-07-02g)

`dashboard/pilots/page.js`: pasa de tabla/tarjetas-mobile a grid de tarjetas (2/3/4 columnas
según viewport) fiel al mockup, con `PageHero` (slot derecho "Certificaciones por vencer" +
CTA "Nuevo piloto"), `KPIStrip variant="strip"` (Total pilotos / Activos / Horas PIC totales /
Por vencer — las 4 son datos reales) y barra de filtros (búsqueda + rol + estado).

- **Horas PIC totales** (nuevo, real): se suman desde `flights` filtrando por `pilot_id`
  (mismo criterio que `PilotDashboard.js` — prefiere `total_time`, si no calcula desde
  `takeoff_time`/`landing_time`). No existía antes como agregado en esta página.
- **Tarjeta de piloto**: avatar (`avatar_url` si existe, si no iniciales) + punto de estado
  (`is_active`) + rol + badge de invitación pendiente/aceptada/rechazada (si aplica) +
  licencia + Horas PIC + estado de certificación médica (`medical_expiry`, mismo cálculo
  Vigente/Vence/Vencida que ya existía). Se quitó el contador de documentos (4/4) del mockup
  original de esta tarjeta por espacio — sigue visible al editar el piloto.
- **`AddPilotPanel.js`**: restyleado al layout de 2 columnas (mismo patrón que
  `AddAircraftPanel`/`MissionFormPanel` — hero navy + card blanca), **conservando intactos**
  los dos modos ya existentes ("Registro completo" que crea el piloto y envía invitación vía
  `POST /api/invite`, y "Solo invitación" que únicamente invita) — el mockup solo mostraba un
  formulario único, pero quitar el modo "Solo invitación" habría sido una regresión funcional
  no pedida. Las "Adiciones vigentes" (Aerocivil) pasan de checkboxes en lista a chips
  seleccionables (mismo dato real `aerocivil_additions`). Se agregó `is_active` (real, ya
  existía en el esquema pero no se exponía al crear) como toggle "Estado inicial".
  Se omitieron del mockup los campos sin respaldo real: foto de perfil en la creación (el
  avatar se completa vía el expediente self-service del piloto, no en este flujo admin),
  "Vigencia de licencia" (no existe columna separada de `medical_expiry`), "Horas de vuelo al
  momento de inscripción" y "Certificado de formación (institución)" (no son columnas de
  `pilots`), y "Parentesco" del contacto de emergencia (no existe esa columna).

### Mantenimiento rediseñada (2026-07-02h)

`dashboard/maintenance/page.js`: `PageHero` (slot derecho "Vencidos" + CTA "Registrar
mantenimiento"), `KPIStrip variant="strip"` (Mantenim. este año / Al día / Próximos /
Vencidos — **por aeronave**, no por intervención: se calculan sobre un fetch adicional de
`aircraft` de la org, no solo sobre las intervenciones ya cargadas) y barra de filtros
(búsqueda + estado + aeronave + tipo + "Ver flota"). Tabla: Aeronave / Tipo / Última
realizada / Próxima prevista / Técnico / Estado, más una columna "Evidencia" (Adjunto /
Recibo / Detalle) que no está en el mockup pero preserva funcionalidad real existente
(streaming de adjuntos, recibo PDF, checklist de recibo, componentes cambiados — nada de
eso se quitó).

- **`dueStatus(aircraft)`** (helper local, misma fórmula que `AircraftCard.js`): calcula
  `isDue`/`finalProgress` desde `total_hours`/`last_maintenance_hours`/`last_maintenance_date`
  vs. `maintenance_interval_hours`/`_days` — un solo criterio de vencimiento en toda la app.
  El bucket (`ok`/`soon`/`overdue`) es una propiedad de la **aeronave actual**, no de cada
  registro histórico — todas las filas de una misma aeronave muestran el mismo Estado
  (evita el absurdo de marcar "Vencido" un mantenimiento de hace un año que ya fue resuelto
  por uno posterior).
- **"Próxima prevista"**: usa `aircraft.next_maintenance_date` si el técnico la registró
  explícitamente; si no, se **estima** como `last_maintenance_date + maintenance_interval_days`
  (marcado "(estimado)" en la tabla) — no se inventa una proyección desde el intervalo en
  horas de vuelo porque no hay una tasa de uso real para convertirlo a fecha calendario.
  `aircraft.next_maintenance_date` es una columna real que existía sin usar; ahora
  `POST /api/maintenance` la actualiza si el formulario la trae.
- **`AddMaintenancePanel.js`** restyleado al layout de 2 columnas (hero navy + card blanca,
  mismo patrón que `AddAircraftPanel`/`AddPilotPanel`), agregando 3 campos reales que antes
  no se pedían: **Fecha realizada** (`maintenance_date`, iba a NULL, ahora se guarda), **Próxima
  fecha prevista** (opcional, ver arriba) y **Estado tras servicio** (toggle
  Operativo/Sigue en mantenimiento → `aircraft.operational_status`, antes solo editable desde
  Flota). Se conservan intactos el checklist de recibo, el roster de componentes y los dos
  drop-zones de archivo (adjunto + recibo PDF) — son funcionalidad real más completa que el
  mockup, que solo tenía "Piezas o repuestos utilizados" (texto libre, sin columna real:
  reemplazado por el sistema de componentes ya existente, no se agregó el campo del mockup).
- `POST /api/maintenance`: acepta `maintenance_date` (default hoy), `next_maintenance_date`
  (opcional) y `operational_status` (validado contra el mismo CHECK que `/api/fleet`) sin
  tocar el comportamiento existente de reinicio de `last_maintenance_date`/`_hours`.

### Reportes rediseñado + reportes personalizados por alcance (2026-07-02i)

`dashboard/reports/page.js`: `PageHero` + grilla de tarjetas de formato (click para
expandir un panel de generación debajo, fiel al mockup) en vez de la lista vertical de
tarjetas fijas que había antes. Cada tarjeta abre un panel con: código de formato editable,
selector de periodo (Este mes/trimestre/año/Personalizado con rango de fechas) y, cuando
aplica, un selector de **alcance** — esto es lo nuevo pedido explícitamente por el usuario
("solo aeronaves, solo mantenimiento, solo mantenimiento de una aeronave").

- **6 formatos** (`REPORT_DEFS` en `page.js`): Operaciones (`F-OPS-002`, ya existía),
  **Mantenimiento** (`F-MNT-006`, nuevo — toda la flota o una sola aeronave via selector),
  Baterías (`F-MNT-003`, ya existía), **Flota** (`F-FLT-007`, nuevo — inventario de
  aeronaves, snapshot sin rango de fechas, con el mismo selector "todas / una sola aeronave"
  para poder sacar la ficha de un solo dron), Bitácora de Piloto (`F-HUM-005`, ya existía,
  tripulante obligatorio) y Expediente de Tripulante (ya existía, sin código de formato).
  Se omitió del mockup el bloque "Personalizar formato — secciones a incluir" (checkboxes
  tipo "Mapa de zonas operadas", "Alertas registradas en vuelo") porque los generadores de
  PDF actuales producen una sola tabla fija por formato — no hay secciones modulares reales
  que activar/desactivar; en su lugar se implementó el alcance real que sí pidió el usuario
  (selector de aeronave/tripulante), que es la forma honesta de "personalizar" con los datos
  que existen.
- **Nuevos endpoints**: `GET /api/reports/maintenance?from&to&aircraftId` (historial de
  `maintenance_logs`, `aircraftId` opcional) y `GET /api/reports/fleet?aircraftId` (roster de
  `aircraft`, sin rango de fechas — es un inventario, no un histórico — `aircraftId`
  opcional). Mismo patrón `getOrgContext()` + validación de fecha que el resto de
  `/api/reports/*`.
- **Nuevos generadores** en `lib/reportGenerators.js`: `generateMaintenanceReport()` y
  `generateFleetReport()`, mismo layout jsPDF (encabezado con logo/versión/fecha/código +
  tabla + firmas) que los formatos existentes — ninguna plantilla nueva, solo columnas reales
  de cada tabla.
- **Códigos de formato — solo 3 persisten**: `form_code_master`/`_batteries`/`_pilots` ya
  existían como columnas de `organizations` (editables en esta pantalla desde antes, aunque
  nunca se guardaban — el input solo afectaba la sesión actual, comportamiento que se
  conserva). `F-MNT-006` (mantenimiento) y `F-FLT-007` (flota) son formatos nuevos sin
  columna propia — su código por defecto es local a la página, editable en pantalla pero no
  persistente entre sesiones; no se agregaron columnas nuevas a `organizations` para esto
  sin que el usuario lo pidiera.
- **Se omitió "Reportes generados recientemente"** (tabla del mockup con historial de PDFs
  generados): no existe una tabla que registre cada generación — los reportes se generan
  100% client-side (jsPDF) y se descargan directo al navegador, sin persistir en Supabase.
  Agregar esa tabla implicaría una migración nueva (mismo patrón inerte que `audit_log`/
  `billing_history`) que no fue pedida; se documenta aquí como pendiente si se quiere en el
  futuro en vez de fabricar la tabla en la UI.

### Reportes — logo, versión/fecha individuales, nota de trazabilidad, Libro de Vuelo (2026-07-04)

Ajustes pedidos por el usuario sobre los 6 formatos PDF de `dashboard/reports/page.js`
(Libro de Vuelo, Mantenimiento, Baterías, Flota, Bitácora de Piloto, Expediente de
Tripulante) — el Excel del reporte AeroCivil mensual y el Formato 100 (plantilla UAEAC) se
dejaron fuera de este alcance porque no tienen la estructura clásica de
encabezado+logo+firmas que los 6 anteriores comparten (son exports de datos regulatorios,
no "formatos" con letterhead).

- **Bug real corregido — el logo nunca salía en los PDF**: `orgData.logo_url` guarda un
  *path* del bucket privado `documents` (ver **Bucket `documents` privado**), no una URL
  pública — `jsPDF.addImage()` no puede descargar una URL/path remoto, necesita los bytes
  ya cargados. Se pasaba el path crudo directo a `addImage()`, que fallaba en silencio
  (atrapado por el `try/catch` de cada generador). Corregido con
  `fetchLogoDataUrl()` (nuevo, `lib/docUrl.js`): descarga vía `/api/documents/open` (mismo
  endpoint que ya resuelve el bucket privado en el resto de la app) y convierte a data URL
  base64 embebible, detectando PNG/JPEG real del `blob.type` (antes hardcodeado a `'PNG'`
  sin importar el archivo subido). `reports/page.js` lo resuelve una vez por descarga y lo
  pasa como `config.logo` (objeto `{dataUrl, format}`) a los generadores — reemplaza el
  campo `logoUrl` crudo en los 6 generadores de `reportGenerators.js` (nuevo helper interno
  `addLogo()`, `try/catch` conservado para logos corruptos).
- **Versión y fecha del formato — ahora individuales por formato**: antes eran un único
  control compartido en la cabecera de la página (`config.version`/`config.reportDate`
  aplicaba a los 6 formatos a la vez). Se quitó ese control global; cada tarjeta expandida
  tiene su propio par Versión/Fecha (`configs[def.key]`, estado por `key`), junto al campo
  "Código de formato" ya existente. El Expediente de Tripulante también gana campo Versión
  editable (antes tenía `"VERSIÓN: 1.0"` hardcodeado en el PDF, ignorando cualquier config).
- **Nota de trazabilidad antes de firmas** (nuevo, los 6 formatos): línea itálica gris justo
  después de la tabla y antes del bloque de firmas — "Periodo de la información: ..." +
  "Descargado el: ...". `addFooterNote()` (nuevo helper en `reportGenerators.js`). El lapso
  se arma en `page.js` según el tipo de formato: `${from} a ${to}` para los que tienen
  selector de periodo, "Instantánea (sin rango de fechas)" para Flota (inventario snapshot)
  y "Instantánea — expediente vigente a la fecha de descarga" para el Expediente. La fecha
  de descarga es `new Date().toLocaleString('es-CO', {...})` real al momento del click, no
  el campo "Fecha del formato" editable (que es la fecha *del documento*, no de la
  descarga — son dos conceptos distintos y se muestran ambos).
- **"Reporte de Operaciones" → "Libro de Vuelo" + alcance por aeronave(s)**: renombrado en
  `REPORT_DEFS` (mismo `code` `F-OPS-002`, mismo endpoint, solo cambia el nombre visible y
  el título impreso en el PDF). Antes descargaba siempre toda la flota sin poder acotar.
  Ahora tiene un selector de **una o varias aeronaves** (`needsAircraftMulti`, checklist con
  atajos "Todas"/"Ninguna" — distinto del `<select>` de una sola aeronave que ya usan
  Mantenimiento/Flota, porque aquí se pidió explícitamente poder elegir varias a la vez).
  `GET /api/reports/master` acepta `aircraftIds` (csv) y filtra con `.in('aircraft_id', ...)`;
  dejar el checklist vacío sigue trayendo toda la flota (comportamiento previo intacto). El
  PDF muestra "AERONAVE(S): ..." o "TODAS LAS AERONAVES" bajo el título, mismo patrón que ya
  usaba Mantenimiento para su selector de una sola aeronave.
- **Bug real corregido — "Todas" en Libro de Vuelo solo traía una aeronave**: al marcar
  todos los checks (equivalente a "Todas"), el código igual mandaba el filtro `aircraftIds`
  con la lista completa — `.in('aircraft_id', ids)` en SQL excluye cualquier vuelo cuyo
  `aircraft_id` no calce exactamente con esa lista (NULL, aeronave dada de baja/eliminada,
  etc.), aunque la intención de "Todas" era no filtrar nada. Corregido: una selección
  "todas" o "ninguna" (`selectedAircraftIds.length === 0 || === aircraftList.length`) ya no
  envía el filtro — solo se aplica en una selección parcial real de aeronaves específicas.
- **Bug real corregido — logo estirado/deformado**: se dibujaba forzado al ancho/alto fijo
  de la caja del encabezado (`doc.addImage(..., w, h)` sin relación de aspecto).
  `fetchLogoDataUrl()` (`lib/docUrl.js`) ahora también captura `width`/`height` naturales del
  archivo (vía `Image().naturalWidth/Height`), y `addLogo()` calcula un ajuste tipo
  "contain" centrado dentro de la misma caja — mismo helper, los 6 generadores se
  benefician sin cambios adicionales.

### Registro de Baterías rediseñado — snapshot por batería (2026-07-04)

El formato "Registro de Baterías" era una fila por vuelo/misión (S/N batería + dron usado +
ciclos acumulados en vivo + vuelo/ubicación/condición de ESE vuelo) — el usuario pidió que
fuera, en cambio, una fila por batería con columnas de inventario: **S/N, Marca, Ciclos
totales (hasta la fecha seleccionada), Última aeronave usada, Salud, Estado** — el mismo
resumen que ya muestra `/dashboard/batteries`, ahora también descargable en PDF.

- **`GET /api/reports/batteries`** reescrito: antes consultaba `flights` (una fila por
  vuelo); ahora consulta `batteries` (una fila por batería) + `battery_logs` para derivar
  dos columnas reales con fecha de corte:
  - **Ciclos totales "hasta la fecha"**: si el corte es hoy o futuro, se usa
    `batteries.cycles` (contador vigente, exacto — igual a lo que muestra la página de
    Baterías). Si el corte es una fecha **pasada** real, se reconstruye como
    `MAX(battery_logs.cycle_number)` con `created_at <= corte` — dato real y fechado, no
    inventado. Sin registros previos a esa fecha se reporta `0` (sin uso conocido hasta ese
    corte), nunca se rellena con el valor vigente para no fingir precisión histórica que no
    existe.
  - **Última aeronave usada (hasta la fecha)**: el log más reciente de `battery_logs` con
    `created_at <= corte` para ese `battery_sn`, mismo criterio que ya usa
    `dashboard/batteries/page.js` para su columna "Última aeronave" (en sentido inverso).
  - **Salud y Estado**: siempre el valor **vigente** de `batteries.health_status`/`status` —
    no existe una tabla de historial de salud/estado por fecha en el esquema (son campos
    editables directamente, no eventos), así que fecharlos retroactivamente sería fabricar
    un dato que no se puede reconstruir con lo real disponible; se documenta esta limitación
    en vez de aparentar precisión histórica.
- **UI**: el formato pasa de un selector de periodo (Este mes/trimestre/año/Personalizado,
  que no aplicaba bien a un inventario snapshot) a un único campo **"Fecha de corte"**
  (`needsCutoffDate`, default hoy, máximo hoy) — coherente con que "ciclos hasta la fecha
  seleccionada" es un corte puntual, no un rango. La nota de trazabilidad del pie muestra
  "Periodo de la información: Corte al {fecha}".
- **PDF** (`generateBatteryReport`): título gana una segunda línea "CORTE AL: {fecha}" (mismo
  patrón que el "AERONAVE(S): ..." de Libro de Vuelo/Mantenimiento) y la tabla cambia a las
  6 columnas pedidas (`S/N BATERÍA / MARCA / CICLOS TOTALES (CORTE) / ÚLTIMA AERONAVE USADA /
  SALUD / ESTADO`).

### Seguridad SMS — hub con tabs en vivo (2026-07-02j, revisado 2026-07-02k)

`dashboard/safety/page.js`: primera versión restyleó el hub como lista de tarjetas con
badges de conteo (ver commit `a2977bd`), pero el usuario pidió mayor fidelidad al mockup
("no me gustó como quedó, quiero que seas más fiel al diseño, que es más limpio"). Segunda
vuelta: el hub ahora es una **página con tabs en vivo reales** (estado `tab` en cliente,
igual que el mockup), no una lista de enlaces — pero sin duplicar los ~1800 líneas de
wizard/CRUD/mapa de las páginas dedicadas:

- **SORA**: reutiliza directamente `components/sora/SoraWizard` (`dynamic import`, el mismo
  componente que usa `/dashboard/sora`) — el botón "Nueva evaluación" del hero lo abre en un
  modal, sin reescribir el wizard. La tabla (Operación/Fecha/Aeronave/GRC/ARC/SAIL/Estado) y
  la franja de KPIs (Evaluaciones/SAIL promedio/Completadas/En borrador) se alimentan de
  `GET /api/sora/assessments`, mismos datos que la página dedicada.
- **Barreras**: grid de tarjetas (categoría + descripción) desde `form_definitions`
  (`form_type='sora'`) — sin el campo de estado Activa/En revisión del mockup (no existe esa
  columna; ver sección anterior). "Nueva barrera" enlaza a `/dashboard/safety-config` (CRUD
  completo, no se duplicó el formulario).
- **Reportes SMS**: tabla real desde `sms_reports` (antes esta tabla solo se usaba para
  crear o exportar, nunca se listaba en una UI) — Suceso/Severidad/Fecha/Estado, con franja
  de KPIs real (Reportes este año, Incidentes, Incidentes graves, Accidentes, contados por
  `severity`). El mockup mostraba un consolidado VOR+MOR+SMS en una sola tabla con
  severidad — se separó de VOR/MOR porque `vor_mor_submissions` no tiene columna de
  severidad (fusionar habría obligado a inventar una). "Nuevo reporte" enlaza a
  `/dashboard/sms` (formulario completo existente).
- **VOR/MOR**: tabla real desde `GET /api/vor-mor` (Reporte/Tipo/Estado con los mismos 4
  estados reales que ya usa `/dashboard/vor-mor`: recibido/en_investigación/cerrado/
  archivado) + las 2 tarjetas explicativas VOR/MOR del mockup (contenido regulatorio
  estático, real). Se omitió la columna "Enviado a AeroCivil" del mockup — no existe esa
  columna en `vor_mor_submissions`. "Nuevo reporte VOR/MOR" enlaza a `/dashboard/vor-mor`.
- **Mapas**: mismo iframe ArcGIS que `/dashboard/safety/mapas` (URL duplicada a propósito,
  es una constante de referencia no lógica) embebido a menor altura + una lista corta de
  tipos de restricción real (mismo contenido regulatorio estático de la página dedicada) en
  vez de la "distancia a zona" fabricada del mockup (no hay cálculo geoespacial real de
  proximidad implementado). "Abrir visor completo" enlaza a la página dedicada.
- Cada pestaña tiene un enlace "Ver módulo completo / Gestionar X" al pie que lleva a la
  página dedicada para todo lo que el hub no reimplementa (edición, detalle, filtros,
  paginación) — el hub es un panorama de lectura + creación rápida, no un reemplazo.

### Seguimiento de casos SMS/VOR/MOR + Barreras reales + consolidación (2026-07-03)

El usuario trajo 3 mockups (`Seguridad_SMS`, `Seguimiento_SMS`, `Nueva_Barrera`) pidiendo
"pequeños cambios" a la pestaña de seguridad, pero los 3 mockups en realidad describían
funcionalidad nueva sustancial (gestión de casos con acciones correctivas + línea de tiempo,
una entidad real de barreras con categoría/estado/riesgo, y fusión de Reportes SMS + VOR/MOR
en una sola tabla) — nada de esto existía. Se confirmó el alcance completo con el usuario
(`AskUserQuestion`, 3 preguntas) antes de construir, en vez de asumir que "pequeños cambios"
significaba solo ajustes visuales.

- **Barreras — entidad real** (reemplaza la vista de solo lectura sobre `form_definitions`):
  tabla `safety_barriers` (migración `20260703_sms_case_tracking.sql`, aplicada). CRUD vía
  `GET/POST /api/safety/barriers` + `PATCH/DELETE /api/safety/barriers/[id]`, mismo patrón
  `ALLOWED_FIELDS`/permisos (`canManageSMS`) que el resto de la app. `components/safety/
  AddBarrierPanel.js` (mismo shell hero+card que `AddProtocolPanel`) — categoría y estado
  como chips seleccionables (4 y 3 opciones fijas respectivamente, igual al mockup),
  "Riesgo/peligro que mitiga" y "Responsable" como texto libre (no hay catálogo de riesgos
  ni tabla de personal para forzar un select real — el mockup los mostraba con apariencia de
  dropdown pero sin datos reales detrás), "Evaluación SORA relacionada" **sí** es un select
  real poblado desde `GET /api/sora/assessments` (dato real existente). El grid de Barreras
  en el hub (`dashboard/safety/page.js`) ahora es clicable → abre el panel en modo edición.
- **Seguimiento de casos** (`dashboard/safety/case/[id]/page.js`, nueva ruta, `?source=sms|
  vormor` en la URL porque el mismo caso puede venir de `sms_reports` o de
  `vor_mor_submissions`): checklist de acciones correctivas (agregar/marcar hecho, con
  responsable y vencimiento — tabla `sms_case_actions`, referencia exactamente una de
  `sms_report_id`/`vor_mor_id`) + línea de tiempo (`sms_case_events`) + "Marcar como cerrado"
  + notificación a AeroCivil para casos MOR (`vor_mor_submissions.aerocivil_notified_at`,
  nuevo). **La línea de tiempo es 100% derivada de eventos reales, nunca narrativa
  fabricada**: se inserta con `lib/smsCase.js` → `logCaseEvent()` (mismo patrón
  fire-and-forget que `lib/auditLog.js`, usa `createAdminClient()` porque `sms_case_events`
  no tiene política de INSERT para usuarios) desde cada punto real de cambio de estado —
  creación del reporte (incluye los formularios públicos `/vor/{org}` y `/mor/{org}`),
  cambio de estado, acción correctiva agregada, notificación AeroCivil. API: `GET/PATCH
  /api/safety/case` (detalle + cambio de estado), `POST/PATCH /api/safety/case/actions`
  (crear acción / marcar hecha), `POST /api/safety/case/notify` (marcar notificado a
  AeroCivil, valida `type='MOR'`).
- **Severidad real para VOR/MOR**: `vor_mor_submissions.severity` (nueva columna) usa el
  **mismo vocabulario RAC 100** que ya usaba `sms_reports` (`incidente`/`incidente_grave`/
  `accidente`) — el mockup mostraba una escala Baja/Media/Alta/Crítica de 4 niveles, pero se
  descartó a propósito para no tener dos vocabularios de "severidad" distintos conviviendo en
  la misma tabla consolidada (la clasificación RAC 100 de 3 niveles ya es la fuente de verdad
  usada en las franjas de KPI del hub desde antes). Sin retroclasificación: los reportes
  VOR/MOR existentes quedan "Sin clasificar" hasta que un gerente SMS les asigne severidad
  desde el modal de gestión en `/dashboard/vor-mor` (nuevo selector "Severidad", junto a
  Estado/Asignado a — usa el mismo `PATCH /api/vor-mor/[id]`, extendido para aceptar el
  campo).
- **Reportes SMS + VOR/MOR consolidados** (decisión confirmada con el usuario, revierte la
  separación documentada en la sección anterior): la pestaña "Reportes SMS" del hub ahora
  fusiona `sms_reports` y `vor_mor_submissions` en una sola tabla ordenada por fecha, con
  chip de clasificación por fila (SMS gris / VOR naranja / MOR rojo), severidad, estado y
  enlace "Ver" → Seguimiento de caso. Las 2 tarjetas explicativas VOR/MOR (contenido
  regulatorio estático) se conservan arriba de la tabla. La pestaña VOR/MOR independiente del
  hub **se eliminó** (4 tabs en vez de 5, igual al mockup) — pero `/dashboard/vor-mor` sigue
  existiendo como página dedicada completa (configuración de formularios, QR, gestión
  detallada), enlazada desde el pie de la tabla ("Gestionar VOR/MOR").
- **Franja de KPI de Reportes SMS actualizada** al set del mockup (Reportes este año /
  Cerrados / Tiempo prom. de cierre / Abiertos-en análisis), reemplazando el set anterior
  (Incidentes/Incidentes graves/Accidentes). "Tiempo prom. de cierre" promedia
  `(updated_at - fecha_reporte)` de los casos cerrados/archivados — requirió agregar
  `sms_reports.updated_at` (no existía; `vor_mor_submissions` ya lo tenía con trigger
  `set_updated_at()`, se replicó el mismo trigger para `sms_reports`).
- `sms_reports.status` default cambia de `'borrador'` a `'abierto'` (POST `/api/sms`) — un
  reporte SMS recién creado no es un "borrador" sin terminar, es un caso abierto que entra al
  flujo de seguimiento. Vocabulario completo: `abierto`/`en_analisis`/`cerrado`.
- **Bug real corregido de paso**: el email de notificación a gerentes SMS (`POST /api/public/
  vor/[orgCode]` y `.../mor/[orgCode]`) enlazaba a `/dashboard/seguridad-operacional?
  tab=reportes`, una ruta que nunca existió (la página real siempre fue `/dashboard/safety`,
  y el query param `tab` tampoco se leía) — corregido a `/dashboard/safety` en ambos. De paso
  `dashboard/safety/page.js` ahora sí lee `?tab=` de la URL para preseleccionar pestaña al
  llegar desde un enlace externo.

### Editor de formato VOR/MOR rediseñado + campos reales nuevos (2026-07-03)

El usuario trajo 2 mockups (`Editar_Formato_VOR`, `Editar_Formato_MOR`) pidiendo mejorar la
pestaña de edición de cada formato. El mockup mostraba una lista plana de campos que el
reportante llenaría, incluyendo varios sin respaldo real hoy (`Severidad`, `Riesgo/peligro
identificado`, `Barrera de seguridad relacionada`, `N.º de radicado AeroCivil`, `Cierre/lección
aprendida` — la severidad y el radicado ya existen pero como gestión **interna** del equipo SMS
después de recibir el reporte, no como algo que indica el reportante). Se confirmó el alcance
con el usuario (`AskUserQuestion`): rediseño visual **+** construir 2 de esos campos como reales
(severidad percibida y barrera relacionada); radicado AeroCivil y "lección aprendida" se
omitieron por tener ya equivalentes reales internos (`aerocivil_notified_at`,
`investigation_summary`) — agregar un segundo campo para lo mismo habría sido redundante, no
"completar el mockup".

- **Campos nuevos en el formulario público** (`lib/vorMorFields.js`, sección `safety` nueva):
  - `reported_severity` (select, mismo vocabulario RAC 100 que la clasificación oficial:
    incidente/incidente_grave/accidente) — la **autoevaluación del reportante**, guardada en
    `vor_mor_submissions.reported_severity` (columna nueva, separada de `severity` a propósito:
    `severity` es la clasificación regulatoria que asigna el equipo SMS después de investigar,
    `reported_severity` es solo la percepción de quien reporta — no se conflan para no dejar que
    un reportante anónimo fije la clasificación oficial).
  - `related_barrier_id` (tipo especial `barrier_select` — único campo base cuyas opciones NO
    son estáticas: se resuelven en vivo contra `safety_barriers` activas de la organización,
    pasadas como prop `barriers` desde el fetch server-side de `/vor/[orgCode]` y
    `/mor/[orgCode]`). Columna `vor_mor_submissions.related_barrier_id uuid → safety_barriers`.
  - Ambos son `hideable` (la org puede ocultarlos desde el editor si no los quiere) y viven en
    el mismo modelo de campos base + overrides que ya existía — no se creó un modelo paralelo.
  - Migración `20260703_vor_mor_reported_fields.sql` (aplicada en Supabase).
  - API pública (`/api/public/vor|mor/[orgCode]`): el `GET` ahora también devuelve
    `barriers: [{id,name}]` (solo `status='Activa'` de la org); el `POST` valida
    `reported_severity` contra el vocabulario RAC 100 y verifica que `related_barrier_id`
    pertenezca a la misma org antes de guardarlo (nunca confía en el id que manda el cliente).
  - Panel de gestión en `/dashboard/vor-mor`: el modal de detalle muestra ambos como chips de
    solo lectura ("Reportado como: ...", nombre de la barrera) — distintos visualmente del
    selector "Severidad" de gestión interna que ya existía, para no confundir las dos escalas.
- **Rediseño visual del editor** (`dashboard/vor-mor/page.js`, pestaña "Configuración & QR" +
  `_FormBuilder.js`): fiel al mockup — selector de formato VOR/MOR, hero navy con
  título/descripción editables inline + botón "Guardar cambios", y layout de 2 columnas
  (editor de campos a la izquierda, panel de enlace + QR a la derecha) en vez del formulario
  vertical de una sola columna que había antes. **Se conservó intacto el modelo de datos real**
  (campos base con mostrar/ocultar/renombrar/obligatorio + campos personalizados tipados
  texto/fecha/select/checkbox) — el mockup mostraba una lista plana más simple sin tipos, pero
  reemplazarla habría sido una regresión funcional (perder select/fecha/checkbox y edición de
  placeholder), así que solo cambió la presentación, no el modelo. `_FormBuilder.js` quedó
  reducido a la columna de campos (sin su propio `<form>`, type-toggle ni botón guardar — todo
  eso vive ahora en el shell del padre).
- **"Imprimir para hangar"** (real, no decorativo): abre una ventana nueva con el QR en tamaño
  póster y dispara `window.print()` del navegador — pensado literalmente para colgar en la pared
  del hangar. "Descargar QR" (ya existía) se conservó.

### Recibo post-mantenimiento + trazabilidad de componentes + PDF de recibo (2026-06-25)

Registrado todo desde `AddMaintenancePanel` (web y APK; el APK toma los cambios por remote URL). Migraciones: `20260625_maintenance_return_checklist.sql`, `20260625_maintenance_components.sql`, `20260625_maintenance_return_doc.sql` (las 3 aplicadas en Supabase).

- **Checklist de recibo** (personalizable por org, espacio mínimo): nuevo `form_type='maintenance_return'` en `form_definitions` (modelo `'General'`) — se personaliza en el Editor de Protocolos (`FormSettingsClient`, pestaña "RECIBO MTTO", **sin** columna de activación en `organizations`, siempre disponible). Plantilla en `lib/checklistDefaults.js` (`maintenance_return`). El resultado se guarda **compacto** como `maintenance_logs.return_checklist jsonb` = `{ "field_number": true/false }` — el texto NO se duplica, se dereferencia contra `form_definitions` al mostrar. Mismo patrón que los `results_*` de despacho.
- **Trazabilidad de componentes** (eventos): tabla `maintenance_components` (`organization_id`, `maintenance_log_id` FK CASCADE, `aircraft_id`, `component_type`, `action` CHECK `instalado|removido|reemplazado`, `part_old`, `part_new`, `notes`, `created_at`). RLS espejo de `maintenance_logs`. Log inmutable de cambios.
- **Vida útil por componente** (roster vivo, 2026-06-25): tabla `aircraft_components` (`organization_id`, `aircraft_id`, `component_type`, `name`, `serial`, `installed_at`, `installed_at_aircraft_hours`, `status` activo/retirado, `retired_at`, `retired_at_aircraft_hours`, `maintenance_log_id`). RLS espejo de `maintenance_logs`. Migración `20260625_aircraft_components.sql`.
  - **Horas de uso** = `aircraft.total_hours - installed_at_aircraft_hours` (derivado del odómetro; cero escrituras por vuelo, reutiliza `increment_aircraft_hours`). **Días de uso** = `now() - installed_at`.
  - **Auto-siembra**: trigger `trg_seed_standard_components` (`SECURITY DEFINER`) en `AFTER INSERT ON aircraft` crea los componentes estándar (Hélices, Motores, ESC) en CUALQUIER alta de aeronave (fleet/DJI/onboarding/import). Backfill aplicado a la flota existente. Los originales se siembran con `installed_at_aircraft_hours = 0` e `installed_at = aircraft.created_at` → su uso refleja la **vida completa** de la aeronave (used_hours = total_hours). Migración correctiva `20260625_components_use_total_hours.sql`.
  - **Reinicio individual**: al registrar mantenimiento (`AddMaintenancePanel`), por cada componente del roster con acción `reemplazado` → se retira el saliente (congela horas en `retired_at_aircraft_hours`) y se inserta una nueva instancia activa con `installed_at_aircraft_hours = total_hours` actual (contador en cero, **solo ese componente**). `removido` solo retira. "Agregar componente" crea nuevas instancias (tipo estándar o personalizado). Cada cambio también deja evento en `maintenance_components`.
  - **Lectura**: `GET /api/maintenance/components?aircraft_id=` → `{ active: [...con used_hours...], history: [...eventos...] }`. Modal "Trazabilidad de componentes" en `AircraftCard` muestra activos (horas/días) + historial.
- **PDF de recibo / puesta en servicio** (opcional, R2): campo dedicado `maintenance_logs.return_doc_path` (separado de `attachment_path`). Sube al bucket privado `maintenance-docs` (path `orgs/{orgId}/recibo/...`) vía `sign-upload` → PUT prefirmado. Se abre/limpia con `GET|DELETE /api/maintenance/attachment?path=` (valida prefijo `orgs/{orgId}/`).
- **API** (`/api/maintenance`): `POST` acepta `return_checklist` (normalizado a `{n:bool}`), `components[]` (insertados en `maintenance_components`) y `return_doc_path`; `GET` los trae (componentes vía join anidado `components:maintenance_components(...)`). Visualización en `dashboard/maintenance/page.js` (indicadores + modal de detalle).

---

## Onboarding Express (Excel) + Invitación de tripulantes

**Plantilla** (`lib/onboardingTemplate.js`, `GET /api/onboarding/template`): genera/descarga un .xlsx con hojas por sección (`🏢 Organización`, `👥 Tripulación`, `✈️ Flota`, `🔋 Baterías`, `📋 Pólizas RCE`, `🚨 Contactos Emergencia`, `📒 Bitácora`). Se **pre-llena con los datos actuales de la org** si existen; si una sección está vacía muestra ejemplos. Bitácora nunca se pre-llena.

**Import** (`POST /api/onboarding/import`): lee cada hoja por nombre exacto (con emoji).
- ⚠️ **Las columnas obligatorias llevan ` *` en el encabezado** (`Serial / S/N *`). `readSheet()` quita el ` *` al leer para que las claves coincidan con los nombres limpios — NO romper esto.
- ⚠️ **`owner_id` viene de `ctx.user.id`** (NO `ctx.userId`, que no existe en `getOrgContext`). Si es null, todo insert falla por NOT NULL.
- ⚠️ **Celdas con hipervínculo** (Excel auto-enlaza emails) llegan como `{text, hyperlink}` — `getCellValue()` devuelve `.text`, si no parsea como `[object Object]`.
- ⚠️ **`batteries` NO tiene columna `aircraft_id`** — no insertar ese campo. "Serial Aeronave Asignada" del Excel es informativo.
- Dedup: aeronaves/baterías por serial, pilotos por **cédula O email**, pólizas por número, contactos por (nombre+teléfono). Re-subir es idempotente.
- Nunca se auto-invita: filas con el email del propio importador se omiten.

**Tripulantes con invitación**: al importar la hoja Tripulación, cada fila con email crea el piloto con `invitation_status='pending'` y dispara `createCrewInvitation()` (`lib/invitations.js`):
- Registra fila en `invitations` (token único) y envía correo (Resend, `escHtml`).
- Si el email YA tiene cuenta Bitafly → ve banner en su dashboard (`InvitationsBanner` ← `GET /api/invitations/pending` por email). Si no → correo a `/registro`.
- **Aceptar** (`POST /api/invitations/accept {token}`): une al invitado a la org con el rol asignado; si es dueño único de su org actual, transfiere su data (mismo patrón que join-org) y marca la origen `[Migrada]`. Vincula `pilots.profile_id` y marca `accepted`. **Rechazar**: `POST /api/invitations/reject`.
- Badges en `/dashboard/pilots`: "Invitación pendiente" / "Aceptado" / "rechazada".

**⚠️ Reglas críticas de invitación por correo (verificadas en prod):**
- **Resend NO lanza excepción en errores de API** — retorna `{ data, error }`. Hay que inspeccionar `error` o el envío falla en silencio (Resend "no recibe nada"). Aplicado en `/api/invite` (devuelve 502 si `error`) y `lib/invitations.js` (`sendInvitationEmail` hace `throw`).
- **El rol llega como label textual**: `AddPilotPanel` envía `pilot_role` = "Piloto"/"Jefe de Pilotos"/"Gerente SMS"/"Gerente General". `/api/invite` los normaliza con `roleFromPilotRole()` ANTES de validar contra `ASSIGNABLE_ROLES` — sin esto daba **400 antes de llegar a Resend**. `roleFromPilotRole` mapea "general"→`admin`, "jefe"→`jefe_pilotos`, "sms"/"gerente"→`gerente_sms`, resto→`piloto`; acepta también roles de sistema tal cual.
- El correo muestra una etiqueta amigable (`ROLE_LABEL`), no el rol de sistema crudo.

---

## Planeación, Programación y Despacho

**Planear Vuelo** (`/dashboard/plan-vuelo`): visible para el **piloto independiente** (`pilotOnly`) y para el **piloto de org** (entrada extra `roles:['piloto']`+`pilotHidden`). Usa `components/FlightPlanner.js` (mapa + zona + KMZ + PDF + guardar planeación). Si quien guarda es `role==='piloto'`, `POST /api/flight-plans` notifica al Jefe de Pilotos y GG.

**Programación** (`/dashboard/authorizations`, roles admin/jefe_pilotos, `MissionControlClient.js`): el calendario
(mismo componente que Programación Activa, ver abajo) es la vista principal — `PageHero` +
botón **"Nueva misión"** que abre `MissionFormPanel.js` en un panel deslizable (desde la
derecha en desktop, desde abajo en mobile; `dynamic(..., { ssr:false })`), sin navegar a otra
página. Al crear con éxito se cierra y fuerza al calendario a re-consultar (`key` incremental
sobre `ProgramacionActivaClient`).
- **Pestaña Apéndice 13 oculta (2026-07-02c, a pedido del usuario)**: `MissionFormPanel.js`
  solo renderiza `BasicForm` — el selector de pestañas Misión Básica/Apéndice 13 se quitó del
  panel. `AerocivilForm.js` (Formato 100 UAEAC) sigue intacto y sin importar desde ningún
  lado; reactivarlo es solo volver a importarlo y restaurar el selector en `MissionFormPanel`.
- **`BasicForm` restyleado** (fiel al mockup "Nueva misión"): hero navy compacto + banner de
  conflicto de horario (real, `scheduleConflict`) + 2 columnas en fondo blanco/inputs claros
  ("Datos de la misión" / "Asignación de recursos") + sección "Zona de operación" (3
  `GEO_TYPES` reales: polígono/lineal/circunferencia — el mockup mostraba 4 modos incluyendo
  "Punto", que no existe en el sistema de zonas; no se fabricó) + barra de exportación KMZ/PDF.
  El indicador "Checklist pre-vuelo" es de solo lectura y refleja `organizations.enable_preflight`
  real (no un toggle nuevo — cambiarlo se hace desde Protocolos). No se agregaron los campos
  del mockup sin respaldo real: "Duración estimada", "Piloto de respaldo" y "Autorización
  AeroCivil (F-OPS-001)" no existen en el esquema de `flight_authorizations`.
- **Misión Básica** = `BasicForm` unificado: datos de misión (PIC, UAS, tipo RAC 100, depto/municipio, fecha, hora) + zona en mapa (geo_type, altitud) + descargas KMZ/PDF, todo en un solo form.
- Al elegir municipio se geocodifica `"Municipio, Depto, Colombia"` vía **Nominatim** (sin API key) para centrar el `MapPickerModal` (`initialCenter`/`initialZoom`). Falla → Bogotá.
- KMZ/PDF se generan con `lib/flightPlanDocs.js` (`GEO_TYPES`, `getZoneSummary`, `downloadFlightKMZ`, `generateFlightPlanPdf`) — fuente única compartida con FlightPlanner.
- Al autorizar, envía `plan_data` (zona/altitud/notas) para guardarlo en `flight_authorizations`.

**Programación Activa** (`/dashboard/programacion-activa`, sin entrada propia en el sidebar —
ver **Consolidación de entradas duplicadas**): mismo componente `ProgramacionActivaClient.js`
que Programación incrusta (`embedded`), pero como página completa con su propio encabezado.
Sigue existiendo como ruta independiente porque las notificaciones de "vuelo programado"
(`flights/authorize` POST, `flight-plans` POST) enlazan aquí para JP+GG. Lista misiones
autorizadas con descarga **KMZ/PDF por misión** (regeneradas desde `plan_data`). Misiones
viejas sin `plan_data` descargan sin geometría.

**Despacho** (`/dashboard/logbook/new`):
- Sin selector de batería (se actualiza al subir DJI). 
- Rol `piloto` solo ve órdenes donde es el PIC asignado (filtra `auths` por su `pilots.id`); managers ven todas.
- ⚠️ `pilotPlan` (despacho simplificado) = `subscription_plan==='piloto' && role==='admin'` — el piloto de org (role `piloto`) usa el flujo CON orden de vuelo, NO el simplificado.
- Desplegable "Detalles de la programación" al pie muestra el `plan_data` + campos de la misión seleccionada.

**Auto-match al importar DJI** (`import-dji` paso 7): por cada vuelo, busca una `flight_authorization` no cancelada cuya fecha coincida con `parsed.fecha`; **prefiere la que coincide con `aircraft_id`** y copia `mission_id` + `pilot_id` al vuelo automáticamente. Así, al sincronizar varios vuelos, cada uno queda emparejado con su misión y piloto programados.

**Edición de PIC en bitácora**: en `/dashboard/logbook` la columna Piloto (PIC) es editable inline para admin/jefe_pilotos (`PilotCell` → desplegable con la tripulación de `/api/pilots` → `PATCH /api/logbook/[id]`). También el N° de misión es editable inline.

### Despacho — indicador de progreso + correcciones (2026-07-03)

`app/dashboard/logbook/new/page.js` es un wizard de pantalla completa (`fixed inset-0`),
deliberadamente fuera del layout del dashboard — no se le aplicó `PageHero`/`KPIStrip` del
resto del rediseño porque no encaja el patrón de "página", sino un flujo kiosko de pasos.

- **Indicador de progreso real** (`StepProgress`, header pasa de blanco a navy `#1A202C`):
  muestra todos los pasos activos del wizard (Operativa + los de seguridad habilitados por
  la org) con su estado hecho/actual/pendiente — reemplaza el texto suelto "Fase: X" que
  no daba ninguna noción de cuánto faltaba. Los pasos varían según
  `enable_health_check`/`enable_preflight`/`enable_briefing` de la org, igual que antes.
- **Barra de progreso del checklist por paso** (`stepDoneCount`/`dynamicLabels.length`):
  cuántos ítems del paso actual ya se marcaron Sí/No.
- **Bug real corregido — hueco de cumplimiento**: el botón "Siguiente Protocolo" de los
  pasos intermedios (Salud, Pre-vuelo) no tenía `disabled` — solo el ÚLTIMO paso
  (Aprobar Vuelo) exigía tener todos los ítems marcados. Un piloto podía saltarse Salud o
  Pre-vuelo sin responder un solo ítem y el vuelo se aprobaba igual (los resultados quedaban
  guardados como `{}` vacío en `results_health`/`results_preflight`). Ahora `stepComplete`
  se exige en **todos** los pasos, no solo el último.
- **Bug real corregido — checklist de pre-vuelo del piloto independiente**: el filtro de
  `form_definitions` por modelo de aeronave (`aircraft_model`) solo se resolvía desde
  `selectedAuth.aircraft.model` (flujo con orden de vuelo). El piloto independiente no tiene
  `selectedAuth` — su checklist de Pre-vuelo caía siempre a `'General'` sin importar qué
  aeronave eligiera, así que nunca veía el checklist configurado específicamente para su
  dron. Ahora también resuelve el modelo desde `form.aircraft_id` (la aeronave elegida en
  el paso Datos) cuando no hay orden de vuelo.
- **Bug real corregido — input de hora sin controlar**: el campo "Hora Despegue" del flujo
  con orden de vuelo no tenía `value={form.takeoff_time}` (a diferencia del mismo campo en
  el flujo de piloto independiente, que sí lo tenía) — quedaba desincronizado del estado de
  React tras la primera escritura.
- **Prellenado de hora de despegue**: al elegir una orden de vuelo, se prellena
  `takeoff_time` desde `plan_data.takeoff_time` de la misión programada (mismo criterio que
  ya usaba el flujo de piloto independiente al elegir una planeación guardada) — antes había
  que volver a escribirla a mano aunque ya estuviera definida en la programación.
- **Widget de clima para el piloto independiente**: antes `<WeatherWidget compact>` solo se
  mostraba en el flujo con orden de vuelo (`selectedAuth.plan_data.points[0]`). El piloto
  independiente no tiene orden de vuelo pero sí puede elegir una planeación guardada
  (`flight_plans.points`, misma estructura) — ahora también muestra el clima de la zona si
  la planeación elegida tiene geometría.

### Cierre de Vuelo — corrección de bugs reales (2026-07-03)

`app/dashboard/logbook/finalize/page.js` — 3 bugs reales corregidos, sin tocar el layout:

- **Inputs sin controlar**: "Hora de Aterrizaje" y "Observaciones Finales" no tenían
  `value={form.landing_time}` / `value={form.notes}` — quedaban desincronizados del estado
  de React tras la primera escritura (mismo patrón de bug ya corregido en Despacho).
- **Estado residual al cambiar de vuelo**: el selector "Cambiar Vuelo" no reseteaba
  `landing_time`/`safety_report`/`notes` — si el usuario escribía datos para un vuelo y
  luego cambiaba de vuelo en el desplegable, esos datos quedaban aplicados por error al
  vuelo recién seleccionado en vez de partir en blanco.
- **Vuelos nocturnos que cruzan medianoche**: la validación "aterrizaje posterior a
  despegue" comparaba solo horas del día (`HH:MM`, sin fecha) — un vuelo NIGHT real
  despegado a las 23:xx y aterrizado pasada la medianoche daba una diferencia negativa y
  el cierre quedaba bloqueado como "hora inválida" pese a ser una operación legítima (la
  condición NIGHT ya existe como opción real en Despacho). Ahora, si el resultado directo
  es negativo pero asumir que el aterrizaje fue al día siguiente da una duración ≤ 6h (muy
  por encima de la autonomía real de cualquier batería de dron), se interpreta como cruce
  de medianoche en vez de rechazarse — sin enmascarar errores de captura genuinos (una
  hora de aterrizaje anterior por error grande sigue devolviendo una duración implausible
  y se sigue bloqueando).

### Inventario de Operación — nuevo checklist antes de Pre-vuelo (2026-07-05)

Nueva pestaña de sidebar **"Inventario"** (`/dashboard/inventory-checklist`, grupo
Cumplimiento): checklist de equipo/insumos (baterías cargadas, botiquín, extintor,
chalecos, etc.) que se diligencia en el Despacho **antes del checklist de Pre-vuelo**,
mismo patrón `form_definitions` + `results_<tipo>` que Salud/Pre-vuelo/Briefing (ver
`lib/checklistDefaults.js`, nuevo `form_type: 'inventory'`).

- **Por qué pestaña propia y no una tarjeta más en Protocolos**: el usuario pidió que el
  checklist lo puedan **crear/editar Gerente General + Gerente SMS + Jefe de Pilotos**, y lo
  pueda **ver/diligenciar cualquiera**. La página `Protocolos` (`/dashboard/settings/forms`,
  donde viven los otros 4 checklists operativos) está gateada completa a
  `canViewFinance` (`superadmin/admin/gerente_sms` — **sin** `jefe_pilotos`), y ampliar ese
  guard habría dado a JP acceso a todo lo demás de Protocolos (biblioteca de protocolos
  libres, enlaces a formatos VOR/MOR) sin que se pidiera. Se creó en cambio una página
  dedicada con su propio permiso, sin tocar el guard de Protocolos.
- **Permisos nuevos** (`lib/roles.js`): `canManageInventoryChecklist` (superadmin+admin+
  gerente_sms+jefe_pilotos — crear/editar ítems y activar/desactivar) y
  `canViewInventoryChecklist` (+ `piloto` — ver la página, incluye a quien la diligencia en
  Despacho). El layout de la ruta (`inventory-checklist/layout.js`) gatea con el segundo
  (view); el componente cliente oculta los controles de edición si el rol no tiene el
  primero, mostrando en su lugar la lista ya configurada en modo solo-lectura.
- **Migración `20260705_inventory_checklist.sql`** (aplicada en Supabase): columna
  `organizations.enable_inventory_checklist boolean DEFAULT false` (a diferencia de
  `enable_health_check`/`enable_preflight`/`enable_briefing`, que ya nacieron en `true` —
  este es un tipo nuevo, así que por defecto **no** aparece en el Despacho de ninguna
  organización existente hasta que un manager lo active desde la nueva pestaña) + tabla
  `results_inventory` (`flight_id`, `checks jsonb`, `organization_id`), RLS `tenant_isolation`
  idéntica a `results_health`/`results_briefing`/`results_preflight`.
- **Despacho** (`app/dashboard/logbook/new/page.js`): el wizard ahora reconoce un 4º paso de
  seguridad `inventory`, insertado en `safetySteps` entre `health` y `preflight` — orden final
  **Salud → Inventario → Pre-vuelo → Briefing** (los pasos desactivados siguen
  saltándose, igual que antes). Usa exactamente la misma infraestructura genérica de
  `dynamicLabels`/`checks[step]`/`stepComplete` que ya alimentaba los otros 3 pasos — no hubo
  que tocar esa lógica, solo agregar `inventory` a `stepNames`/`stepIcons` y a la lista de
  tablas `results_*` que se insertan en `handleFinalize`. Al igual que Briefing/Salud, el
  checklist de Inventario es `aircraft_model='General'` (no varía por modelo de aeronave).

---

## Reporte Operacional Mensual UAS (AeroCivil, 2026-07-04)

Circular AeroCivil (Radicado 2026351070026944, Dirección de Operaciones de Navegación Aérea
— Grupo Gestión Operacional UAS): exige a los explotadores UAS remitir mensualmente, dentro
de los primeros 5 días del mes vencido, un Excel a `gouas@aerocivil.gov.co` con 8 columnas
por vuelo: ID Autorización, Nombre empresa, Fecha de vuelo, Tiempo volado, RUAS, Tipo de
línea de vista (VLOS/EVLOS/BVLOS), Tipo de operación ejecutada, Condición de vuelo. Antes de
construir se confirmaron con el usuario 4 decisiones de mapeo/alcance (`AskUserQuestion`) —
ninguna se inventó.

- **ID Autorización** (`flight_authorizations.aerocivil_auth_number`, nuevo): AeroCivil lo
  asigna por misión aprobada — no se puede derivar de nada existente (no es el
  `dan_number`/`operator_number` de la org, que son a nivel organización, no por misión).
  Se captura manualmente en **Programación Activa** (columna nueva "N° Autorización
  AeroCivil", edición inline tipo `PilotCell`, solo visible para managers vía
  `PATCH /api/flights/authorize` — que pasó de reemplazar siempre los 5 campos a actualizar
  solo los que vengan en el body, para poder tocar únicamente este campo sin reenviar
  pilot_id/aircraft_id/etc.). Queda vacío para vuelos del piloto independiente (despacho
  simplificado, sin `flight_authorizations`) — limitación real documentada, no oculta.
- **Línea de vista** (VLOS/EVLOS/BVLOS, tampoco existía): nueva columna en
  `flight_authorizations`, `flight_plans` y `flights` (`src/lib/missionTypes.js` exporta
  `LINE_OF_SIGHT_TYPES`, fuente única). Se captura al planear — `BasicForm.js`
  (Programación) y `FlightPlanner.js` (Planeación de Vuelo) tienen el selector nuevo — y se
  copia al vuelo en Despacho: flujo con orden de vuelo desde `selectedAuth.line_of_sight`;
  piloto independiente desde la planeación elegida o, si es vuelo libre sin planeación, un
  selector directo obligatorio en el paso Datos (no había de dónde prellenarlo).
- **Tipo de operación ejecutada** — decisión confirmada con el usuario: **reemplazar**, no
  mantener un segundo campo paralelo. Se descubrieron **dos** vocabularios viejos e
  independientes conviviendo en `mission_type` (nunca sincronizados entre sí): las 9
  categorías libres de Despacho piloto-independiente (`logbook/new/page.js`) y las 17
  categorías de estilo RAC 100 propias de `BasicForm.js` (Programación) — el flujo con orden
  de vuelo ni siquiera copiaba `mission_type` al vuelo al despachar (por eso el reporte
  también resuelve el tipo de operación desde `flight_authorizations.mission_type` vía join
  cuando el vuelo no lo trae directo). Ambas listas se reemplazaron por las 10 categorías
  oficiales de la circular (`MISSION_TYPES` en `src/lib/missionTypes.js`, única fuente para
  `BasicForm.js` y `logbook/new/page.js`), con migración de datos histórica en 2 archivos:
  `20260704_aerocivil_monthly_report.sql` (las 9 de Despacho) y
  `20260704_aerocivil_mission_type_basicform.sql` (las 17 de Programación, corrección
  encontrada después de aplicar la primera). Mapeos sin equivalente 1-a-1 exacto quedaron
  documentados en el SQL (ej. "Agricultura de precisión"/"Aspersión y Dispersión Agrícola" →
  `Aspersión`, por ser el uso dominante real en el mercado colombiano; "Recreativo"/"Otra
  operación especial" → `Captura imágenes/datos` como categoría genérica de respaldo).
  El bulk-import de bitácora por Excel (`/api/logbook/import`) escribe texto libre del
  archivo del usuario — no se intentó remapear retroactivamente valores arbitrarios ahí.
- **Condición de vuelo** (DIURNO/NOCTURNO/MIXTO) — decisión confirmada: **derivarla**, no
  pedirla ni mapearla. AeroCivil clasifica por hora del día; BitaFly guarda
  `visual_condition` (VMC/IMC/NIGHT, reglas de vuelo — otro concepto). Se deriva en el
  generador del reporte (`deriveFlightCondition()` en `lib/reportGenerators.js`) a partir de
  `takeoff_time`/`landing_time` reales con una convención horaria fija 06:00–18:00 = diurno
  (no orto/ocaso real por ubicación, que exigiría una llamada externa por vuelo — se
  documenta como convención, no como precisión astronómica).
- **Generación del Excel**: nueva tarjeta "Reporte Operacional UAS (AeroCivil)" en
  **Reportes**, con selector de mes (`type="month"`, precargado al mes anterior — "mes
  vencido") en vez de los botones de periodo genéricos (`REPORT_DEFS` gana un flag
  `needsMonth` + `format: 'xlsx'`, que cambia el ícono/label de "Descargar PDF" a "Descargar
  Excel"). `GET /api/reports/aerocivil-monthly?month=YYYY-MM` arma las filas (join
  `aircraft.ruas` + `flight_authorizations` para el fallback de tipo de operación/línea de
  vista/N° autorización); `generateAerocivilMonthlyExcel()` en `lib/reportGenerators.js`
  arma el `.xlsx` con `exceljs` (ya usado para el Formato 100) y los 8 encabezados exactos
  de la circular. El archivo se genera 100% al momento de descargar, igual que el resto de
  Reportes — no se persiste.
- **Rastro de envío real** (no fabricado): tabla nueva `aerocivil_monthly_reports`
  (`organization_id`, `period` 'YYYY-MM', `sent_at`, `sent_by`, RLS mismo patrón que
  `safety_barriers` — superadmin/admin/gerente_sms). Botón "Marcar como enviado" en el panel
  del reporte (`POST /api/aerocivil-report/status`) dejando constancia real de quién y
  cuándo — útil ante una eventual verificación de AeroCivil, y apaga el recordatorio del
  cron una vez marcado.
- **Alerta mensual** (`GET /api/cron/aerocivil-report-reminder`, cron diario en
  `vercel.json`, mismo patrón `CRON_SECRET` que `/api/cron/free-grants`): si el día del mes
  es ≤ 5 y la org no ha marcado el período anterior como enviado, notifica (campana) a
  **Gerente SMS** (responsable) + **Gerente General** (copia) vía `roles: ['gerente_sms',
  'admin']`, con los días restantes. Nuevo tipo de notificación `aerocivil_report_due`
  (agregado al CHECK de `notifications.type` y a `NOTIFICATION_TYPES` en `lib/notify.js` —
  este archivo tenía su propia lista desincronizada del CHECK real de la tabla, hay que
  actualizar ambos lados al agregar un tipo).

---

## Replay de Vuelo

- **Parser**: `dji-log-parser-js` WASM — browser-side
- **Storage**: bucket privado `flight-replays`, path `orgs/{orgId}/replays/{flightId}.json.gz`, 2MB máx
- **Signed URL**: 1 hora. Cuotas en `epayco_plan_config` (`replay_retention_days`, `replay_max_flights`)
- **Limpieza**: pg_cron `cleanup_expired_replays()` a las 03:00 UTC
- **Permisos**: `PERMISSIONS.canViewFlightReplay`

| Plan | Retención | Máx vuelos |
|---|---|---|
| piloto | 30 días | 10 |
| escuadrilla | 90 días | 50 |
| flota | 180 días | 200 |
| enterprise | permanente | ilimitado |

---

## Manuales de la Empresa

Repositorio de manuales corporativos con versionado y notificación a toda la org. Aplica a **organizaciones** (oculto para el piloto independiente vía `pilotHidden`).

### Datos (Supabase)

- `company_manuals` — manual + versión vigente: `title`, `category` (CHECK: `MO|SMS|MANTENIMIENTO|ORGANIZACION|SOP|OTRO`), `current_version`, `current_effective_date`, `current_file_path`, `current_version_id` (FK → manual_versions, versión vigente robusta), `status` (`active|archived`), `created_by`. RLS por org.
- `manual_versions` — historial inmutable: `manual_id` (FK ON DELETE CASCADE), `version`, `effective_date`, `file_path`, `comments`, `uploaded_by`. RLS por org.
- `manual_acknowledgments` — acuse de lectura por versión: `manual_id`, `version_id`, `organization_id`, `profile_id`, `acknowledged_at`. UNIQUE `(version_id, profile_id)`. RLS: SELECT todos los miembros; INSERT/DELETE solo como sí mismo (`profile_id = auth.uid()`). El acuse se ata a la **versión**: al publicar una nueva, todos deben volver a confirmar.
- **Bucket** privado `company-manuals` (25 MB, PDF/Word/Excel), path `orgs/{orgId}/manuals/{manualId}/{ts}-{archivo}`. Signed URL 1h.
- **RLS**: lectura para todos los miembros (`private.user_org_id()`); insert/update/delete solo managers (`private.user_is_manager()` = admin/superadmin/gerente_sms/jefe_pilotos). Mismas reglas en las 3 políticas de `storage.objects`.

### Permisos (`roles.js`)

- `canManageManuals` = GG + GSMS + JP (+ superadmin) — cargar/actualizar/eliminar.
- `canViewManuals` = todos los roles (incluye piloto) — consultar/descargar.

### API (`/api/manuals`)

| Ruta | Método | Quién | Descripción |
|---|---|---|---|
| `/api/manuals` | GET | todos | Lista manuales activos de la org |
| `/api/manuals` | POST | managers | Crea manual + 1ª versión (multipart) + notifica. Crea la fila primero para obtener `id`; si la subida falla hace rollback de la fila huérfana |
| `/api/manuals/[id]` | GET | todos | Detalle + historial de versiones |
| `/api/manuals/[id]` | PATCH | managers | Edita título/categoría/estado |
| `/api/manuals/[id]` | DELETE | managers | Borra manual + versiones + archivos del bucket |
| `/api/manuals/[id]/versions` | POST | managers | Publica nueva versión (multipart) + actualiza `current_*` + notifica |
| `/api/manuals/[id]/download` | GET | todos | Signed URL 1h — vigente o `?versionId=` del historial |
| `/api/manuals/[id]/acknowledge` | POST/DELETE | todos | Confirma/retira lectura de la versión vigente (idempotente vía upsert) |
| `/api/manuals/[id]/acknowledgments` | GET | managers | Roster de la versión vigente: todos los perfiles de la org con leído/pendiente + `read`/`total` |

- `GET /api/manuals` incluye `acknowledged` (bool) del usuario actual sobre la versión vigente de cada manual.

- **Subida**: `lib/manualStorage.js` (`uploadManualFile`, valida tamaño/MIME, sanitiza nombre). Usa `createAdminClient()` (bypassa RLS; el gate es el permiso a nivel de API).
- **Notificación**: `lib/manualNotify.js` (`notifyManualChange`) — Resend + `escHtml`, correo a TODOS los miembros de la org (excepto el actor) en cada carga/versión. Fire-and-forget.

### UI (`/dashboard/manuales`)

`page.js` (client) lista los manuales agrupados por categoría en cards (versión vigente + fecha), con descarga, modal de historial (descarga por versión + comentarios) y, para managers, "Cargar Manual" / "Nueva versión" / eliminar. `layout.js` hace guard server-side con `canViewManuals`. Ítem de nav "Manuales" (`library_books`).

**Acuse de lectura**: cada card muestra chip Leído/Pendiente del usuario + botón "He leído esta versión". Managers tienen botón "Seguimiento" → modal `AckRosterModal` con barra de progreso (`read/total`) y lista de miembros con fecha de lectura o "Pendiente".

**Acta de lectura PDF** (`lib/manualActaPdf.js`, `generateAckActaPdf`): botón "Acta PDF" en el panel de Seguimiento genera client-side (jsPDF + jspdf-autotable) un acta de divulgación y constancia de lectura — datos del manual + versión vigente + resumen leído/total + tabla de miembros (rol/estado/fecha) + nota legal. Evidencia documental para auditorías RAC 100 / SMS.

---

## Notificaciones (campana)

Campana in-app en el header del dashboard. Una notificación por destinatario, dirigida por rol.

### Datos + helper

- Tabla `notifications` (una fila por destinatario): `organization_id`, `profile_id`, `type` (CHECK: `flight_scheduled|flight_dispatched|manual_published|drone_alert|maintenance_due|invitation|document_updated|vor_mor|announcement|system`), `title`, `body`, `link`, `actor_id`, `metadata jsonb`, `read_at`, `created_at`. Índices: `(profile_id, created_at DESC)`, parcial `WHERE read_at IS NULL`, `(organization_id)`.
- **RLS**: cada usuario solo SELECT/UPDATE/DELETE de las suyas (`profile_id = auth.uid()`). **Sin política de INSERT** → solo el service role crea notificaciones.
- **`lib/notify.js`** `createNotifications({ orgId, roles?, profileIds?, type, title, body, link, actorId, metadata, includeActor })`: resuelve destinatarios por rol y/o ids (validados contra la org, sin cross-tenant), excluye al actor por defecto, fan-out con `createAdminClient()`. Fire-and-forget.

### API

| Ruta | Método | Descripción |
|---|---|---|
| `/api/notifications` | GET | Lista del usuario (`?limit`) + `unreadCount` |
| `/api/notifications/read` | POST | `{ id }` una · `{ all: true }` todas; devuelve `unreadCount` |
| `/api/notifications/[id]` | DELETE | Descarta una propia |
| `/api/notifications/announce` | POST | Anuncio a la org (managers, `canSendAnnouncements`); `{ title, body?, roles? }` |

### UI

`components/NotificationBell.js` (en el header, prop `canAnnounce`): ícono + badge numérico de no leídas; panel con lista (ícono por tipo, no leídas resaltadas, leídas apagadas), "Marcar todo leído", descartar por ítem, clic → marca leída + navega al `link`. **Polling cada 45 s** (pausado si la pestaña está oculta). `components/AnnouncementComposer.js`: modal para managers (título/mensaje/roles destino).

### Fuentes de eventos (`createNotifications` en flujos existentes)

| Evento | Origen | Destinatarios |
|---|---|---|
| Manual cargado / nueva versión | `manuals` POST · versions | todos |
| Vuelo programado | `flights/authorize` POST | JP+GG (Programación Activa) + PIC piloto (Mis Vuelos) |
| Alerta de dron | `import-dji` (`hasAlerts`) | JP+GG+GSMS |
| Invitación aceptada/rechazada | `invitations/accept`·`reject` | GG+JP |
| Expediente actualizado | `pilots/my-documents` PATCH | GG+JP+GSMS |
| Anuncio | `notifications/announce` | roles elegidos |

### Tiempo real, mantenimiento y retención (pg_cron)

- **Realtime**: `notifications` está en la publicación `supabase_realtime` (REPLICA IDENTITY FULL). La campana se suscribe a `postgres_changes` filtrado por `profile_id` → actualización instantánea. El polling baja a 120 s como red de seguridad.
- **`notify_maintenance_due()`** (cron `0 13 * * *`): notifica a GG+JP cuando una aeronave alcanza el umbral del dashboard (`hours_since ≥ 180` o `days_since ≥ 165`; crítico en 195h/175d). Dedup de 7 días por aeronave/usuario para no repetir a diario.
- **`cleanup_old_notifications()`** (cron `0 4 * * *`): borra leídas >60 días y cualquiera >180 días.
- ⚠️ Ambas funciones son `SECURITY DEFINER` con `EXECUTE` **revocado** a `PUBLIC/anon/authenticated` (solo el cron las ejecuta) — no exponerlas vía `/rest/v1/rpc`.

---

## Sistema de Diseño (rediseño 2026-07-02)

Refinamiento visual del dashboard sobre la misma identidad de marca (naranja `#ec5b13` /
navy `#1A202C` ya existían en `tailwind.config.mjs` — no fue un rebrand). Origen: proyecto
de Claude Design importado y ejecutado en fases (ver `docs/plan-mejora-diseno-bitafly.md`,
documento de control con el detalle fase por fase). Rama `claude/project-scope-review-xity40`.

### Componentes compartidos

- **`PageHero.js`** — banner navy redondeado, encabezado estándar de página. Props
  `{ eyebrow, title, description, metric, cta }`. Adoptado en las 12 páginas principales
  del dashboard (Dashboard, Flota, Bitácora, Tripulación, Mantenimiento, Seguridad/SORA,
  Reportes, Protocolos, Perfil, Organización, Suscripción, Programación).
- **`KPIStrip.js`** — grilla `grid-cols-2 md:grid-cols-4` de `KPICard` (exportado también
  suelto). Reemplazó el `KPICard` que antes vivía inline en `DashboardClient.js`. Cada
  módulo pasa su propio array de `items` calculado **desde los datos ya cargados** — sin
  queries nuevas.
- **`IconTile.js`** — tile de icono 64px/radio 18px, variantes `default` (orange-50) /
  `navy` / `solid`. Usado en `AircraftCard` como elemento principal, con la foto real
  (`image_url`) como miniatura circular secundaria superpuesta (decisión de producto: no
  se oculta la foto subida por el usuario).

### Sidebar reagrupado

`dashboard/layout.js`: cada `navLink` tiene un campo `group` (`'Operación'` /
`'Flota & Equipo'` / `'Cumplimiento'`) **puramente de presentación** — el array
`NAV_GROUPS` define el orden de render. El filtrado real por rol/plan/período de gracia
(`filteredLinks`) no cambió. Pie del sidebar: tarjeta de usuario (avatar iniciales +
nombre + rol) + widget "Plan {plan} / Mejorar" (oculto en Enterprise, visible solo para
quien también ve el link Suscripción).

**Consolidación de entradas duplicadas (2026-07-02)**: "Programación Activa", "SORA" y
"Manuales" se accedían tanto desde el sidebar como desde un enlace/tarjeta dentro de otra
página (Programación → "Ver programación activa", Seguridad SMS → tarjeta SORA).
Se quitó la entrada de sidebar para los roles que ya llegan por la página padre, y se
conservó (o agregó) para los que no la tienen en su nav:
- **Programación Activa**: sin entrada propia — mismos roles que Programación
  (`superadmin/admin/jefe_pilotos`). Inicialmente se pensó como link dentro de Programación;
  con el rediseño de calendario (ver **Vista calendario semanal en Programación**) quedó
  incrustada directamente — Programación ES el calendario ahora, no solo un link hacia él.
- **SORA**: sin entrada para `superadmin/admin(org)/gerente_sms` (llegan por la tarjeta en
  Seguridad SMS). Dos entradas nuevas cubren a quien NO tiene esa página: una para
  `jefe_pilotos`/`piloto` (org) y otra `pilotOnly` para el piloto independiente (su
  Seguridad SMS está `pilotHidden`).
- **Manuales**: sin entrada para `superadmin/admin(org)/gerente_sms` — se agregó un link
  "Ver manuales" dentro de Protocolos (`FormSettingsClient.js`, oculto si
  `showManualsLink` es falso). Se conserva entrada directa solo para `jefe_pilotos`/`piloto`
  (org), que no tienen Protocolos en su nav. El piloto independiente sigue sin acceso a
  Manuales (aplica solo a organizaciones, sin cambio de comportamiento).

**Fidelidad al mockup de arquitectura de navegación (`Bitafly__Layout`, 2026-07-03)**: el
mockup documenta (no pide construir de cero) la arquitectura ya implementada — 3 grupos
fijos en el sidebar (Operación/Flota & Equipo/Cumplimiento) + "Cuenta" (Perfil/Organización/
Suscripción) como popover bajo el avatar, no fija en el nav — que ya existía desde la
Corrección 1. Al comparar item por item contra el mockup aparecieron 4 desalineaciones
reales, corregidas en `navLinks`:
- **Nombre desactualizado**: el link decía `'Seguridad Operacional'` pero la página (tras su
  rediseño a hub con tabs) ya se titula "Seguridad SMS" en su propio `PageHero` — el nav
  nunca se actualizó. Renombrado a `'Seguridad SMS'` para que coincida con el título real.
- **Nombre inconsistente entre sidebar y nav inferior móvil**: el sidebar decía `'Mi Flota'`
  mientras `bottomNavLinks` (barra inferior en mobile) ya usaba `'Flota'` para el mismo
  link — dos etiquetas distintas para la misma página. Unificado a `'Flota'` (el título de
  la página en sí, `PageHero title="Mi Flota"`, no cambió — es un encabezado de página
  distinto de la etiqueta compacta del nav).
- **Orden de "Flota & Equipo"**: Mantenimiento y Tripulación estaban invertidos respecto al
  orden del mockup (Flota, Baterías, Mantenimiento, Tripulación) — reordenado.
- **Orden de "Operación" y "Cumplimiento"**: Bitácora aparecía después de Programación
  (mockup: Dashboard, Bitácora, Programación, Meteorología) y Reportes aparecía antes de
  Seguridad SMS/Auditoría (mockup: Seguridad SMS, Auditoría, Reportes, Protocolos) —
  reordenados los elementos del array `navLinks` (el orden de render sigue la posición en
  el array dentro de cada `group`, no hay campo de orden explícito).

### Baterías y Meteorología como rutas propias

- `/dashboard/batteries` — extraída de la sección embebida en `/dashboard/fleet` (que
  **se conserva** por ahora — la extracción completa, punto 4.3 del plan, quedó
  pendiente de QA visual). Reutiliza `BatteryCard` + `AddBatteryPanel`/`EditBatteryPanel`.
  La columna "aeronave asignada" se resuelve **client-side**: consulta directa a
  `battery_logs` (más reciente por `battery_sn`) — no hay columna `aircraft_id` en
  `batteries` (son intercambiables por diseño, ver **Base de datos**) ni endpoint nuevo.
- `/dashboard/weather` — reutiliza `WeatherWidget` + `/api/weather/current` existentes,
  con geolocalización del navegador (fallback Bogotá).

### Búsqueda global

`GET /api/search?q=` — busca en `flights`/`aircraft`/`pilots` acotado a `organization_id`
vía `getOrgContext()`, máx. 5 resultados por categoría. `components/GlobalSearch.js`
conecta el input del header con debounce de 300ms + dropdown navegable. ⚠️ El término se
sanitiza (se quitan `,` y `()`) antes de interpolarlo en `.or()` de PostgREST — esos
caracteres son separadores de su sintaxis y rompían el filtro.

### Conflicto de agenda del PIC

`GET /api/flights/conflicts?pilot_id=&scheduled_at=` — avisa (no bloquea) si el piloto ya
tiene una misión no cancelada **el mismo día calendario**. ⚠️ Granularidad por día, no por
hora: `flight_authorizations.scheduled_at` guarda solo la fecha (el form usa
`<input type="date">`; la hora de despegue vive en `plan_data.takeoff_time`), así que una
ventana horaria fina nunca coincidiría con datos reales. `POST /api/flights/authorize`
repite el mismo chequeo server-side (best-effort, nunca bloquea la creación) y devuelve
`conflictWarning` en la respuesta. `BasicForm.js` muestra el aviso en vivo con debounce.

### Vista calendario semanal en Programación (rediseño 2026-07-02b)

`ProgramacionActivaClient.js` es el único componente de calendario — lo usan 3 pantallas:
`/dashboard/authorizations` (`embedded`, Programación), `/dashboard/programacion-activa`
(página completa) y "Mis Vuelos" (`readOnly`, solo lectura). Props nuevas:
- `embedded` — oculta el `<header>` propio (título/contador/Nueva misión) porque el padre
  ya trae su `PageHero`; el resto del calendario es idéntico.
- `onCreateMission` — si se pasa, "Nueva misión" dispara este callback (abre
  `MissionFormPanel`) en vez de navegar con un `<Link>` a `/dashboard/authorizations`.

Contenido:
- **Franja de KPIs** (`KPIStrip variant="strip"`, datos reales de la semana calendario
  actual, fija — no cambia al navegar el calendario): Misiones esta semana, Aeronaves
  asignadas, Pilotos asignados, Conflictos de horario. No incluye "horas programadas" del
  mockup original porque `flight_authorizations` no guarda una duración estimada por
  misión — no se fabricó ese dato.
- **Toggle Semana/Lista** (se quitó "Mes" del mockup — no hay vista mensual implementada,
  por honestidad no se agregó una pestaña sin funcionalidad real detrás).
- **Vista Semana**: grilla de 7 días (lunes-domingo) con navegación (anterior/siguiente/hoy),
  encabezados de día con la columna de "hoy" resaltada, tarjetas de misión con borde
  izquierdo naranja. Las que caen en **conflicto de agenda** (mismo `pilot_id` + mismo día
  calendario, misma convención que `/api/flights/conflicts`) se resaltan en rojo con ícono
  de advertencia — calculado client-side desde las misiones ya cargadas, sin queries nuevas.
- **Vista Lista**: tabla (desktop) / tarjetas (mobile) sin cambios de fondo, ya existente.

**Panel "Nueva misión"** (`components/authorizations/MissionFormPanel.js`, Fase 2026-07-02b):
antes, `/dashboard/authorizations` era una página de formulario independiente
(`MissionControlClient.js`) con las pestañas Misión Básica/Apéndice 13 a la vista. Ahora esa
página muestra el calendario como pantalla principal (igual que Programación Activa) y las
pestañas viven dentro de este panel deslizable, invocado por el botón "Nueva misión" del
`PageHero`. `BasicForm`/`AerocivilForm` no cambiaron — mismo `loadData` callback tras crear,
que aquí cierra el panel y fuerza un refresco del calendario.

### Bitácora rediseñada (2026-07-02d)

`dashboard/logbook/page.js` (`LogbookPage`) fiel al mockup: `PageHero` con slot derecho
("Sin piloto asignado: N" + botón **"Nuevo registro"** → `/dashboard/logbook/new`, el mismo
flujo de despacho/carga manual que ya existía — se conservó explícitamente, no se tocó) +
`KPIStrip variant="strip"` (Vuelos registrados / Horas totales / Este mes / Sin piloto — se
mantuvo "Sin piloto", **no** se fabricó un "Pendientes de firma" del mockup porque no existe
flujo de firma digital en el esquema) + barra de filtros unificada + tabla recortada.

- **Búsqueda unificada** (`search`, reemplaza los filtros sueltos `mission_id`/`serial`):
  un solo input filtra por N° misión, modelo/serie de aeronave y nombre de piloto a la vez
  (`filteredFlights`, client-side sobre los datos ya cargados).
  Se eliminó la fila de filtros por columna dentro del `<thead>` (duplicaba la barra superior).
- **Filtros restantes** (fecha, modelo, tipo de misión, condición visual, piloto) viven en la
  misma barra, junto con "Limpiar" — antes estaban repartidos entre un bloque solo-mobile y
  la fila de filtros de la tabla desktop; ahora es una única barra para ambos.
- **Tabla desktop recortada**: de 8 columnas a 6 (N° Misión, Fecha, Aeronave, Piloto,
  Condición, Duración) + Alerta/Replay/Eliminar — "Tipo Op" y "Serie" salen de la tabla visible
  (siguen filtrables) siguiendo el layout del mockup. La celda Aeronave usa el mismo patrón
  que Programación Activa (chip de ícono + modelo + serie como subtexto).
- **"Importar vuelos" (DjiRcSync) intacto** — sigue siendo el toggle que muestra el panel de
  importación DJI/Excel, sin cambios de lógica.
- **Sin exportación**: el botón "Exportar F-OPS-002" (CSV) del mockup se implementó y luego
  se quitó a pedido explícito del usuario — no hay export de la tabla en esta pestaña.

### Auditoría de acciones (activa desde 2026-07-03)

Log de acciones de usuario (`audit_log`, append-only) — **distinto** del panel de
cumplimiento que ya existía en `/dashboard/audit` (aeronavegabilidad de flota + vigencia
de documentos de tripulación, `AuditCard`/`score`), con el que **convive** como pestaña
separada ("Registro de acciones"), no lo reemplaza.
- `lib/auditLog.js` → `logAudit({ orgId, actorId, actorName, action, module, entityLabel, metadata })`:
  fire-and-forget, nunca lanza ni bloquea la operación instrumentada; falla en silencio
  si la tabla no existe todavía.
- Instrumentado en creación de: flota (`POST /api/fleet`), pilotos (`POST /api/pilots`),
  autorización de vuelo (`POST /api/flights/authorize`). Todas con `action: 'create'` —
  todavía no hay instrumentación de `update`/`delete`/accesos fallidos/exportaciones.
- **`actorName` corregido (2026-07-03)**: los 3 call sites llamaban a `logAudit()` sin pasar
  `actorName` → toda fila quedaba con `actor_name = null` y la columna "Usuario" siempre
  mostraba "—". `getOrgContext()` (`lib/apiAuth.js`) ahora también trae `profiles.full_name`
  (campo `fullName`), y los 3 call sites lo pasan como `actorName: fullName || user.email`.
- `GET /api/audit-log` (+ export CSV) — degrada a lista vacía (`pending: true`) si la
  tabla falta.
- RLS: managers (`admin`/`superadmin`/`gerente_sms`/`jefe_pilotos`, mismos roles que
  `PERMISSIONS.canViewAudit`) leen su org; solo service role escribe.
- **Migración `20260702_audit_log.sql` aplicada en Supabase (2026-07-03)** vía Supabase MCP,
  confirmado con el usuario antes de ejecutarla contra la base de datos en producción.

### Auditoría — pestaña "Registro de acciones" rediseñada (2026-07-03)

`dashboard/audit/page.js` (`ActivityLog`): la pestaña existente ya estaba conectada a
`GET /api/audit-log`, solo le faltaba el lenguaje visual del mockup "Auditoría" — franja de
KPIs + barra de filtros + tabla con avatar/iniciales y badge de tipo por color.

- **Franja de KPIs real** (`KPIStrip variant="strip"`, solo visible si hay eventos):
  Eventos registrados / Este mes / Usuarios activos / Módulos con actividad — las 4 se
  calculan sobre los mismos `entries` ya cargados (sin queries nuevas). Se sustituyeron los
  dos stats fabricados del mockup ("Cambios de configuración", "Accesos fallidos") por
  "Usuarios activos" y "Módulos con actividad": no existe instrumentación de cambios de
  configuración ni de intentos de acceso fallidos todavía, así que se reemplazaron por
  categorías que sí se pueden calcular con datos 100% reales.
- **Barra de filtros**: búsqueda (usuario/módulo/acción/detalle) + selects de módulo/usuario/
  tipo de evento, poblados dinámicamente desde los valores distintos presentes en `entries`
  (no listas hardcodeadas) + "Exportar CSV" (ya existía, sin cambios).
- **Tabla**: Usuario (avatar con iniciales + nombre) / Acción (frase construida con
  `ACTION_META[action].verb` + `MODULE_PHRASE[module]` + `entity_label`, ej. "Creó una
  aeronave: Matrice 350 · SN-0142") / Módulo (ícono + nombre) / Fecha y hora / Tipo (badge
  de color: verde=Creación, índigo=Edición, rojo=Eliminación — los únicos 3 tipos reales
  instrumentados hoy; el mapa queda listo para "Acceso"/"Exportación" cuando se instrumenten).
- El aviso "tabla pendiente de migración" se conserva como fallback defensivo (por si la
  tabla llegara a faltar en otro entorno), aunque ya no debería activarse en producción tras
  aplicar la migración.

### Protocolos — biblioteca libre de procedimientos (2026-07-03)

`dashboard/settings/forms` (nav "Protocolos", antes "Listas de Chequeo") pasó de ser
siempre el editor de slots fijos a una **pantalla de dos capas**: un grid tipo mockup como
landing (`FormSettingsClient.js`, estado `view: 'grid' | 'fixed'`) y el editor de slots
existente detrás de cada tarjeta, intacto.

- **Decisión de alcance confirmada con el usuario**: el mockup permite protocolos con
  nombre/categoría/pasos completamente libres — el sistema real solo tenía 4 tipos fijos
  de checklist (`form_definitions`: salud/pre-vuelo por modelo/briefing/recibo mtto, ya
  wireados al despacho real). Se preguntó explícitamente y el usuario pidió construir el
  catálogo libre del mockup en vez de forzarlo sobre los 4 tipos existentes.
- **Tabla nueva `protocols`** (migración `20260703_protocols.sql`, aplicada en Supabase):
  `organization_id`, `name`, `category` (CHECK: Pre-vuelo/En vuelo/Post-vuelo/Emergencia/
  Mantenimiento — las 5 del mockup), `description`, `icon` (nombre de Material Symbol),
  `steps` (jsonb, array de strings, el orden del array = el orden de los pasos),
  `created_by`, timestamps. RLS: solo `admin`/`superadmin`/`gerente_sms` (mismos roles que
  ya guardaban esta página vía `requirePermission('canViewFinance')`) leen/escriben, acotado
  a su org — es una biblioteca de referencia para managers, no un checklist ejecutable
  paso a paso durante el despacho (eso seguiría siendo trabajo futuro si se pide).
- **API**: `GET/POST /api/protocols`, `PATCH/DELETE /api/protocols/[id]` — mismo patrón
  `getOrgContext()` + `ALLOWED_FIELDS` explícito que el resto de la app.
- **`AddProtocolPanel.js`** (nuevo, mismo patrón 2 columnas hero+card que
  `AddAircraftPanel`/`AddPilotPanel`): Nombre*, Categoría* (select con las 5 reales),
  Ícono (select de Material Symbols curados, con preview), Descripción breve, y un editor
  de pasos dinámico (agregar/quitar, numerados) fiel al panel "Nuevo Protocolo" del mockup.
  Mismo componente sirve para crear y editar (prop `protocol`), con botón Eliminar +
  confirmación inline solo en modo edición.
- **Grid principal** (`FormSettingsClient.js`, vista `'grid'`): 3 secciones —
  1) **"Checklists operativos"**: tarjetas de los 4 tipos reales del sistema (Pre-vuelo
     genera una tarjeta por cada modelo de aeronave de la org, igual que ya hacía el
     selector de modelo) con badge real "N/LIMIT campos configurados" — click abre el
     editor de slots existente (`view: 'fixed'`), sin tocar su lógica interna.
  2) **"Formatos de reporte SMS — editables"**: tarjetas VOR/MOR leídas de
     `vor_mor_definitions` (real, `title`/`description`/`custom_fields.length`) — "Editar
     formato" enlaza a `/dashboard/vor-mor` (pestaña Configuración & QR) en vez de duplicar
     ese editor aquí.
  3) **"Protocolos y procedimientos"**: chips de categoría (Todos + las 5 reales) + grid de
     tarjetas de `protocols` (categoría con color, ícono, nombre, descripción, N pasos,
     fecha de actualización) — click abre `AddProtocolPanel` en modo edición; ícono de
     eliminar aparece al hover.
- El editor de slots fijos (`view: 'fixed'`) conserva **la misma lógica de guardado** —
  mismo toggle ON/OFF, mismo botón "Plantilla básica", mismos slots numerados. Su
  **presentación** cambió el mismo día (ver siguiente punto): pasó de página completa a
  panel deslizable, y el tab-switcher interno se quitó después (ver ronda 3 abajo).
- **Ajuste de fidelidad (2026-07-03, mismo día)** — 2 rondas:
  1. Los campos Categoría e Ícono en `AddProtocolPanel.js` usaban un `<select>` nativo
     suelto (con su propio chevron de navegador) — se envolvieron en un solo contenedor
     estilo "pill" (`inputCls`) con el ícono como prefijo y un `expand_more` como sufijo,
     igual al control falso de dropdown del mockup. Mismo componente sirve para crear y
     editar, así que el ajuste aplica a ambos modos por igual.
  2. El usuario aclaró que la inconsistencia visual real estaba en el **editor de
     checklists operativos** (Salud/Pre-vuelo/Briefing/Recibo Mtto): seguía siendo la
     página completa antigua (sin relación visual con "Nuevo protocolo"). Se convirtió en
     un panel deslizable con el mismo shell que `AddProtocolPanel` (header con breadcrumb +
     cerrar, hero navy, card blanca, footer fijo) — **sin tocar la lógica de guardado**:
     mismo toggle ON/OFF, mismo botón "Plantilla básica" y los mismos slots numerados
     01-LIMIT, ahora con scroll interno del panel.
  3. Ajuste final: el usuario no quería el tab-switcher SALUD/PRE-VUELO/BRIEFING/RECIBO
     MTTO ni el selector de modelo **dentro** del panel — "que en el despliegue solo
     modifique la que seleccione para editar, no necesito que se desplieguen todas". Como
     el grid ya tiene una tarjeta por tipo (y una por cada modelo de aeronave para
     Pre-vuelo), esa navegación ya vive ahí; se quitaron el tab-switcher y el selector de
     modelo internos — el panel abre directo sobre el `type`/`selectedModel` de la tarjeta
     en la que se hizo click, sin forma de saltar a otro checklist sin volver al grid.

### Mi Perfil rediseñado (2026-07-03)

`dashboard/settings/profile/page.js`: pasó de un formulario de 2 columnas genérico (con
`PageHero` estándar) a un hero navy con avatar propio + 2 columnas de tarjetas fiel al
mockup — excepción intencional al uso de `PageHero` en esta página puntual (mismo tipo de
desviación ya aceptada en `AircraftCard`/`IconTile`), porque el mockup pide un hero
específico de identidad (foto + nombre + guardar) que `PageHero` no modela.

- **Hero**: avatar circular (`profiles.avatar_url`, mismo pipeline de subida ya existente
  vía `FileUpload`) con badge de cámara superpuesto — nuevo `variant="avatar"` en
  `FileUpload.js` (misma lógica de validación/subida, solo cambia el render a un botón
  circular pequeño en vez del dropzone grande; los 5 consumidores existentes no pasan la
  prop y no cambian). Nombre, rol (`ROLE_LABELS`, con el mismo caso especial "Piloto
  Independiente" que ya usa `dashboard/layout.js` para admin+plan piloto) y una badge de
  vigencia de **certificado médico** (mismo umbral Vigente/Vence/Vencida — `<30` días — que
  ya usa `dashboard/pilots/page.js`) — el mockup la rotula "Licencia vigente", pero el único
  dato de vigencia real en el esquema es `medical_expiry`, no una fecha de vencimiento de la
  licencia en sí (`license_number` no tiene expiry propio); se rotuló honestamente como
  certificado médico en vez de fingir que la licencia expira. El botón "Guardar cambios" del
  hero envía el `<form id="profile-form">` de abajo vía atributo `form` (mismo patrón que el
  footer de `AddProtocolPanel`).
- **"Datos personales"**: Nombres/Apellidos/Teléfono/Ciudad (ya editables) + Correo
  (deshabilitado, de solo lectura — cambiar el email de auth no está implementado). Se omitió
  "Documento de identidad" del mockup: `profiles` no tiene columna de cédula (solo
  `pilots.id_number`, y no todo perfil tiene una fila `pilots` vinculada — GG/GSMS
  normalmente no la tienen, ver **Gerente General fuera del roster**).
- **"Licencia RPAS"**: N.º de licencia/CIPU + vencimiento de certificado médico (ambos ya
  editables, sin cambios de datos) + **Certificaciones** — nuevo, chips de solo lectura desde
  `pilots.aerocivil_additions` (mismo dato real que ya usa `AddPilotPanel`/`EditPilotPanel`,
  gestionado por managers desde Tripulación). `GET /api/pilots/my-documents` ahora también
  devuelve `aerocivil_additions` (nuevo `READONLY_DISPLAY_FIELDS`, separado de `DOC_FIELDS`
  para que siga sin ser editable por este endpoint self-service). Solo se muestra si el
  usuario tiene una fila `pilots` vinculada con adiciones — si no, la sección no aparece (no
  se fabrica un estado vacío falso).
- **"Contacto de emergencia"**: se preservaron los campos ya existentes en `profiles`
  (distintos de los de la tabla `pilots` en "Documentos del Piloto" más abajo — duplicación
  preexistente entre ambas tablas, no introducida por este rediseño) como tarjeta propia, ya
  que el mockup no los incluye pero eliminarlos habría sido una regresión funcional.
- **"Seguridad de la cuenta"** (reemplaza "Verificación en dos pasos"/"Sesiones activas" del
  mockup, ninguna de las dos existe hoy — no hay MFA de Supabase Auth configurado ni listado
  de sesiones): **Contraseña** → botón "Cambiar" dispara `POST /api/auth/reset-request` (el
  mismo endpoint público y rate-limited que ya usa "Olvidé mi contraseña") con el correo del
  propio usuario — envía el enlace de restablecimiento real, sin inventar un flujo de
  contraseña-actual/nueva que no existe. **Último acceso** → `session.user.last_sign_in_at`
  (dato real de Supabase Auth, disponible client-side sin necesidad de service role) en vez
  del "2 dispositivos conectados" fabricado del mockup.
- **"Resumen de cuenta"** (reemplaza la tarjeta "Preferencias" del mockup — 4 toggles: alertas
  por correo, notificaciones de mantenimiento, resumen semanal, alertas de licencia por
  vencer. Ninguno tiene backing real: no existe un sistema de preferencias por usuario, las
  notificaciones se envían por rol a todos los miembros sin opt-out individual, y "resumen
  semanal" ni "alertas de licencia por vencer" existen como funcionalidad en absoluto — ver
  **Notificaciones**. Construir esa infraestructura — nueva columna + wiring en
  `lib/notify.js` + un cron de resumen semanal — es un alcance nuevo no pedido para un
  rediseño visual de perfil, así que se sustituyó por una tarjeta 100% real: Organización
  (`company_name`/`unique_code`, movida aquí desde donde vivía antes dentro de "Datos
  personales"), Plan (`PLAN_CONFIG[subscription_plan].name`), vencimiento de suscripción si
  aplica (`subscription_expires_at`) y fecha de alta (`created_at`). El botón **Cerrar
  sesión** del mockup (al pie de esta tarjeta) sí es real y se conservó en la misma posición
  — mismo patrón `supabase.auth.signOut()` que ya usa `dashboard/layout.js`.
- Sin cambios en "Documentos del Piloto" (expediente self-service en `pilots`) ni en "Zona de
  peligro" (borrado de cuenta) — se conservan intactos debajo del nuevo layout.

### Organización rediseñada (2026-07-03)

`dashboard/settings/page.js`: mismo patrón hero navy + 2 columnas que Mi Perfil, aplicado
sobre la página de configuración de organización — que además de la parte que muestra el
mockup ("Pestaña completa — Organización": logo, datos de la empresa, registro AeroCivil,
miembros del equipo) ya traía secciones reales sustanciales que el mockup no mostraba
(Onboarding Express, Pólizas de Seguro, Cuenta AeroCivil de automatización) — todas se
conservan intactas debajo del área rediseñada, no se recortó nada.

- **Hero**: logo corporativo (cuadrado redondeado, no circular como el de Mi Perfil — mismo
  `variant="avatar"` de `FileUpload.js`, el badge de cámara es agnóstico a la forma del
  contenedor) + razón social + NIT + badge de vigencia del registro AeroCivil. **Corrige un
  bug preexistente documentado en Pendientes de infraestructura** ("Logo legacy roto"): el
  logo se renderizaba con `<img src={org.logo_url}>` directo aunque `FileUpload` sube al
  bucket privado `documents` y devuelve un *path*, no una URL pública — ahora usa
  `docOpenUrl(org.logo_url)` (mismo helper que ya usan avatares/documentos en el resto de la
  app), consistente con la migración a bucket privado de 2026-06-12.
- **"Datos de la empresa"**: razón social/tipo de identificación+NIT/correo/teléfono/
  representante legal/dirección — mismos campos ya editables, sin cambios de datos. Se omitió
  "Ciudad / sede" del mockup: `organizations` no tiene columna `city` separada de `address`
  (no se fabricó extrayendo una ciudad del texto libre de la dirección).
- **"Registro AeroCivil"** — **decisión de alcance confirmada con el usuario** (`AskUserQuestion`):
  el mockup pedía N.º de operador UAS + vigencia del registro + chips de autorizaciones
  activas, ninguno con respaldo real (`organizations` solo tenía `dan_number`). El usuario
  eligió construir tracking real mínimo en vez de omitir/sustituir. Migración
  `20260703_org_aerocivil_registration.sql` (aplicada en Supabase) agrega `operator_number`,
  `registration_expiry` y `authorized_operations jsonb default '[]'`. `dan_number` (N°
  Explotador, ya existía) se **movió** aquí desde "Datos de la empresa" — es conceptualmente
  un identificador AeroCivil, no un dato societario, y el mockup no lo mostraba por separado.
  **Autorizaciones activas** es un editor de chips de texto libre (agregar/quitar), no una
  lista curada de categorías RAC 100 — no hay una fuente regulatoria autoritativa en el
  esquema para validar contra un catálogo fijo, así que se dejó como texto libre que cada
  organización llena con sus propias autorizaciones vigentes, en vez de inventar una taxonomía
  oficial. El badge de vigencia reutiliza el mismo umbral Vigente/Vence/Vencida que Mi Perfil
  y Tripulación (aquí con corte en 60 días en vez de 30, acorde a un ciclo de registro anual).
  El guardado va en el mismo `handleUpdate`/RLS `organizations_update` (admin/superadmin de la
  org) que ya usaba el resto del formulario — sin API route nueva.
- **"NIT · Código de acceso"** y **"URL pública VOR/MOR"**: cajas oscuras ya existentes,
  reubicadas debajo de Registro AeroCivil en la misma columna — sin cambios de datos ni lógica,
  es funcionalidad real (el código con el que la tripulación se une a la org) que el mockup no
  mostraba pero que no se podía quitar.
- **"Miembros del equipo"** (columna derecha): roster de solo lectura (avatar/nombre/correo/
  badge de rol) desde `GET /api/admin/users` (mismo endpoint que ya usa `/dashboard/users`,
  gate admin/superadmin — coincide con el guard `canEditOrg` que ya protegía esta página). Se
  optó por **no duplicar** la edición de roles aquí (ya existe completa en `/dashboard/users`,
  con validaciones como "no degradar al último Admin") — mismo patrón de hub-que-enlaza-a-
  página-dedicada usado en Seguridad SMS/Protocolos: "Gestionar roles del equipo" al pie enlaza
  a `/dashboard/users`. **"Invitar"** enlaza a `/dashboard/pilots` (el mecanismo real de
  invitación por correo — `AddPilotPanel` modo "Solo invitación" — vive ahí); no se fabricó un
  flujo nuevo de "invitar directamente a `profiles`" que no existe en el sistema.
- El botón "Guardar cambios" del hero envía `<form id="org-form">` vía atributo `form` (mismo
  patrón que Mi Perfil/`AddProtocolPanel`); el botón "ACTUALIZAR IDENTIDAD CORPORATIVA" al pie
  del formulario se retiró por quedar duplicado.

### Suscripción rediseñada (2026-07-03)

`dashboard/subscription/page.js`: reemplaza el `PageHero` genérico + tarjeta de plan por un
hero navy fiel al mockup + franja de medidores de uso + tarjetas de plan/pago +
Historial de facturación, todo en un contenedor `max-w-5xl` (antes `max-w-3xl`). El resto de
la página (grid de planes para actualizar, verificar pago pendiente, unirse a organización,
modales de confirmación/retención) **no estaba en este mockup** y se conserva intacto — solo
se envolvió en un `<div className="max-w-3xl mx-auto">` interno para no perder su ancho de
lectura original dentro del contenedor ahora más ancho.

- **Hero**: plan actual + precio (`PLANS[key].price`, el precio base de referencia — no
  existe una columna que registre el ciclo mensual/anual de la suscripción ya activa, así
  que no se fabricó un precio "exacto del ciclo actual") + vigencia real. Distingue
  honestamente **"Renueva el..."** (si `profile.epayco_subscription_id` existe → suscripción
  recurrente real) de **"Vence el..."** (si no hay `epayco_subscription_id` pero sí
  `subscription_expires_at` → ej. un regalo de socio con expiración, no una renovación
  automática) — el mockup solo mostraba "Renueva", que habría sido falso para ese segundo
  caso real del sistema. Se omitió el chip "Facturación mensual" del mockup: no hay dato
  real que confirme el ciclo (mensual/anual) de una suscripción ya activa. **"Cancelar
  plan"** y **"Mejorar a {siguiente plan}"** son las mismas acciones reales que ya existían
  (`setShowRetention`/`handleUpgrade`) reubicadas en el hero — el botón de mejora apunta al
  siguiente tier inmediato (`nextPlans[0]`), no directo a Enterprise como en el mockup (ahí
  el mockup asumía un caso puntual con Flota como plan actual; para el resto de planes
  saltar tiers habría sido incorrecto). La sección completa de planes para actualizar
  (grid con los 2+ tiers disponibles) se conserva debajo sin cambios para quien quiera un
  tier distinto al inmediato.
- **Medidores de uso**: nuevo bloque `usage` en `GET /api/subscription` — Aeronaves y Pilotos
  ya se calculaban ahí (sin usarse en esta página hasta ahora); se agregó **Vuelos este
  mes** (conteo real de `flights` del mes calendario actual, sin límite — igual que el
  mockup, que marca este medidor como "Ilimitado"). De paso se corrigió el conteo de
  aeronaves/pilotos para seguir la **Regla de conteo** del proyecto (`createAdminClient()` +
  `.select('id')` + `.length`, no `count:'exact',head:true`, que PostgREST puede evaluar sin
  aplicar RLS) — inconsistencia preexistente en ese endpoint, corregida de paso al darle más
  protagonismo visual. El medidor "Pilotos" se etiquetó honestamente así (no "Miembros del
  equipo" como el mockup) porque es literalmente lo que mide el límite del plan
  (`crewCountsForLimit`, excluye GG/GSMS) — llamarlo "miembros del equipo" habría implicado
  medir el roster completo de `profiles`, que es un número distinto.
- **"Incluido en tu plan"**: mismo dato real que ya mostraba la antigua "Feature grid"
  (`plan.features`), filtrado a solo los items incluidos (sin el badge Básico/Avanzado, para
  fidelidad al checklist simple del mockup) — se eliminó el componente `FeatureRow` que
  quedó sin otros usos.
- **"Método de pago" — decisión de alcance confirmada con el usuario** (`AskUserQuestion`):
  el mockup mostraba una tarjeta enmascarada (marca/últimos 4 dígitos/vencimiento) con botón
  "Cambiar". No existe ese dato en el esquema (ePayco gestiona el cobro recurrente de su
  lado, no se guarda ni un fragmento del número de tarjeta) ni un flujo de "cambiar tarjeta"
  (el checkout actual es un re-pago completo, no una actualización de método). El usuario
  eligió **omitir y sustituir** en vez de fabricar datos de tarjeta o investigar la API de
  ePayco para ese fin — la tarjeta "Gestión de pago" ahora explica en texto real cómo
  funciona el cobro (ePayco recurrente) y da un enlace `mailto:` a soporte para cualquier
  cambio, sin inventar ningún dato de tarjeta.
- **Historial de facturación**: ver sección dedicada abajo — activada aplicando la
  migración pendiente, con decisión confirmada por separado vía `AskUserQuestion`.
- Se eliminó la sección "Danger zone" separada (duplicaba el mismo `setShowRetention`
  que ahora dispara "Cancelar plan" en el hero) — el modal de retención sigue intacto y
  explica las consecuencias en detalle, así que no se perdió información.

### Historial de facturación — activo desde 2026-07-03

Comprobante **informativo**, sin validez fiscal DIAN (decisión explícita para no acoplar
facturación electrónica real a este alcance).
- Migración `20260702_billing_history.sql` — tabla + RLS (cada usuario ve su propio
  historial; solo service role escribe). **Aplicada en Supabase (2026-07-03)**, confirmado
  con el usuario al redisañar Suscripción — ver **Suscripción rediseñada**.
- `POST /api/epayco/webhook`: tras `activatePlanForUser()`, insert fire-and-forget de
  `billing_history` (idempotente por `ref_payco`), mismo patrón de guardas que
  `attributeCommission()` — **nunca** rompe la activación del plan ni si la tabla no
  existe.
- `GET /api/billing-history` — degrada a vacío si la tabla falta (defensivo, ya no debería
  activarse en producción tras aplicar la migración).
- Sección "Historial de facturación" en `/dashboard/subscription`: ya no se oculta cuando
  no hay pagos — muestra un estado vacío explicativo ("aparecerán aquí después de tu
  primer cobro") para no dejar un hueco en el layout de 2 columnas.

---

## Convenciones de código

- **API routes**: siempre `createClientSSR()` + `getOrgContext()`. Auth guard: `if (!user) return 401` antes de usar `user.id`.
- **Permisos**: `PERMISSIONS.canXxx` — nunca hardcodear `['superadmin','admin','jefe_pilotos']`
- **Mass-assignment**: nunca `insert([{ ...body }])` — siempre campos explícitos
- **Rate limiting**: todo endpoint público sin auth usa `checkRateLimit()`
- **Emails**: todo campo de usuario en HTML de Resend pasa por `escHtml()`. **Siempre revisar `{ error }` del `resend.emails.send()`** — el SDK no lanza en fallos de API.
- **Storage (todos los buckets en R2)**: la capa `src/lib/storage/index.js` exporta `storagePut`, `storageSignedUrl`, `storageUploadUrl`, `storagePublicUrl`, `storageRemove`, `storageDownload`. NO hay cliente Supabase Storage ni flags `STORAGE_MODE_*` — migración F8 completa (2026-06-20). Signed URLs privadas tienen TTL 1h.
- **Subida de imágenes/documentos (proxy server-side)**: `FileUpload.js` (`documents`), `FleetImageUpload.js` (`fleet-images`) y `AddMaintenancePanel.js` (`maintenance-docs`) suben via **`POST /api/storage/upload`** (multipart, mismo origen → el servidor hace `storagePut`). Evita CORS/URL-prefirmada y es inmune a bloqueos de extensiones del navegador sobre `cloudflarestorage.com`. **Límite 4 MB** (cuerpo serverless Vercel = 4.5 MB). El guard de org acepta `{orgId}/` y `orgs/{orgId}/`. `POST /api/storage/sign-upload` (presigned) sigue existiendo para flujos grandes.
- **Descarga de privados (streaming server-side)**: `GET /api/documents/open`, `GET /api/maintenance/attachment` y `GET /api/flights/[id]/replay` **sirven los bytes desde el servidor** (`storageDownload`) en vez de redirigir a una signed URL de R2 → mismo origen, inmune a extensiones/CORS. **Pendiente**: `GET /api/manuals/[id]/download` aún devuelve signed URL (archivos hasta 25 MB; navegador→R2 directo).
- **⚠️ CORS de R2 (crítico para subidas)**: el PUT prefirmado va **directo del navegador a R2** con `Content-Type` no "simple" → dispara preflight CORS. **Cada bucket R2 debe tener política CORS** que permita `PUT/GET/HEAD` desde los orígenes de producción, o la subida del navegador falla en silencio (no es error visible, simplemente el archivo no llega → la imagen no aparece). Config reproducible en `scripts/set-r2-cors.mjs` (orígenes: `bitafly.com`, `www.bitafly.com`, `localhost:3000`). Re-ejecutar `node scripts/set-r2-cors.mjs` al crear un bucket nuevo o agregar un dominio. Verificar con `--verify`. No expone datos (buckets siguen privados; la URL prefirmada sigue siendo obligatoria).
- **⚠️ Checksum CRC32 del AWS SDK (crítico para subidas)**: `@aws-sdk/client-s3` ≥3.729 añade por defecto `x-amz-checksum-crc32` (del cuerpo VACÍO) a las URLs prefirmadas. El navegador sube el archivo real → el checksum no coincide → R2 responde **400 sin cabeceras CORS** → el navegador lo reporta como "Failed to fetch" / error CORS. El `S3Client` en `storage/index.js` fija `requestChecksumCalculation: 'WHEN_REQUIRED'` + `responseChecksumValidation: 'WHEN_REQUIRED'` para que la URL prefirmada NO incluya el checksum. **No quitar** estas opciones al actualizar el SDK.
- **CDN por bucket público**: `fleet-images` → `cdn.bitafly.com`, `partner-logos` → `logos.bitafly.com`, `app-releases` → `releases.bitafly.com`. Env vars: `R2_PUBLIC_BASE_URL`, `R2_LOGOS_BASE_URL`, `R2_RELEASES_BASE_URL`.
- **Imágenes de flota**: bucket **público** `fleet-images` (NO `documents`). `FleetImageUpload.js` sube via sign-upload y retorna URL pública CDN. Path `{orgId}/drones/{ts}_{slug}.{ext}`. `AircraftCard.resolveImg()` reconoce URLs de `cdn.bitafly.com` y `r2.dev`. El bucket privado `documents` queda solo para documentos sensibles.
- **Componentes**: `.js` (no TypeScript), Tailwind CSS
- **ESLint**: `.eslintrc.json` (v8) — NO `eslint.config.mjs` (v9 flat config, incompatible)
- **Fuentes**: `font-lexend` para headings landing, `font-sans` (Public Sans) para el resto
- **Skip link**: `focus-visible:` (no `focus:`)
- **Superadmin**: nunca mostrarlo en UI pública

**Rutas de importación — regla crítica**: route handlers en `src/app/api/public/[feature]/[orgCode]/route.js` importan `_resolveOrg.js` con `'../../_resolveOrg'` (dos niveles). Un nivel causa build error en Vercel.

**Navbars**: `/documentacion` y similares tienen `<header>` propio hardcodeado — si agregas link al nav del landing (`src/app/page.js`), replicar manualmente.

---

## Módulo de Clima UAV

Integración de condiciones meteorológicas para decisión de vuelo, basada en Open-Meteo (gratis, sin API key) y NOAA Kp (actividad solar).

### APIs

| Ruta | Auth | Descripción |
|---|---|---|
| `GET /api/weather/current?lat=X&lon=Y` | `getOrgContext()` — todos los usuarios | Clima actual compacto: score 0-100, canFly, issues, métricas, Kp |
| `GET /api/weather/historical?lat=X&lon=Y&date=YYYY-MM-DD&hour=0-23` | `getOrgContext()` — todos los usuarios | Clima histórico (Open-Meteo Archive): mismo shape que current + `historical:true`, `flightDate`, `flightHour`. Caché 24h (datos pasados inmutables). |
| `GET /api/admin/master/weather-dev?lat=X&lon=Y` | superadmin | Sandbox completo: hourly 7d + daily 7d + Kp history/forecast |

**Gotcha auth**: `getOrgContext(supabase)` recibe un **cliente Supabase** creado con `createClientSSR()`, NO el objeto `request`. Pasar el request crashea con "Cannot read properties of undefined (reading 'getUser')".

### Score de vuelo (`calcScore`)

Pesos: viento 10m **30%** · ráfagas **22%** · visibilidad **22%** · precipitación **16%** · prob. lluvia **5%** · Kp **5%**  
Umbrales (`THR`): windSpeed 25 km/h · windGusts 35 km/h · visibility 5000 m · precipitation 0.1 mm/h  
**Nubosidad excluida** — la resolución de modelo (~10 km GFS/ECMWF) hace el dato poco confiable para puntos específicos.

### `WeatherWidget` (`components/WeatherWidget.js`)

Props: `{ lat, lon, label?, compact?, className?, date?, hour? }`

- `compact=false` (default): tarjeta completa — gauge SVG + semáforo + issues + 4 tiles (viento, ráfagas, visibilidad, lluvia) + footer Kp/temperatura
- `compact=true`: badge inline APTO/NO APTO + icono clima + viento + temperatura
- `date` + `hour`: activa modo histórico → consulta `/api/weather/historical`. Muestra encabezado "Condiciones al momento del vuelo · DD/MM/YYYY HH:00h"

Maneja estados loading / error / sin coordenadas (retorna null).

### Integraciones

- **Programación** (`components/authorizations/BasicForm.js`): al seleccionar municipio, `geocodeMunicipality()` setea `weatherCoords` con las coords de Nominatim → renderiza `<WeatherWidget>` completo debajo del selector
- **Despacho** (`app/dashboard/logbook/new/page.js`): al seleccionar orden de vuelo, extrae `selectedAuth.plan_data?.points?.[0]` → renderiza `<WeatherWidget compact>` como badge de aptitud
- **Replay GPS** (`components/FlightReplayModal.js`): panel colapsable en esquina superior derecha del modal. Extrae `lat/lon` del primer punto del `flightData.path`, `date` del prop `flightDate` y `hour` del prop `takeoffTime`. Solo aparece si ambos coords y fecha están disponibles. `logbook/page.js` pasa `flightDate` y `takeoffTime` al modal al abrir el replay.

### Meteorología rediseñada (`/dashboard/weather`, 2026-07-02e)

`dashboard/weather/page.js` NO reutiliza `<WeatherWidget>` (ese componente es un card oscuro
compacto, pensado para incrustarse en Programación/Despacho/Replay) — se restyleó fiel al
mockup con su propia UI clara, consultando `/api/weather/current` directamente:
- **Hero con badge GO/NO-GO**: slot derecho de `PageHero`, refleja `weather.canFly` real del
  punto seleccionado (geolocalización del navegador, fallback Bogotá — mismo flujo que antes).
- **6 tarjetas de condiciones actuales** (viento, ráfagas, visibilidad, precipitación,
  temperatura, índice Kp) — mismos campos que ya devolvía el endpoint, coloreadas contra los
  mismos umbrales (`THR`) que usa el score.
- **Pronóstico horario — hoy**: nuevo campo `todayHourly` en `GET /api/weather/current`
  (8 horas siguientes, mismos datos de Open-Meteo ya solicitados — sin llamadas extra), cada
  hora con temperatura/viento/ícono y un estado GO/Precaución/NO-GO calculado con los mismos
  umbrales. El Kp se asume constante durante esas horas (no hay pronóstico horario de Kp sin
  una llamada NOAA adicional — simplificación documentada, no fabricada).
- **Zonas de operación programadas hoy**: sin backend nuevo — el cliente pide
  `GET /api/flights/authorize` (ya existente), filtra las misiones de **hoy** con zona
  definida (`plan_data.points`), y por cada una llama `/api/weather/current?lat=&lon=` en
  paralelo (mismo endpoint del resto de la página). Muestra zona/misión, hora de despegue real
  (`plan_data.takeoff_time`), viento/visibilidad/precipitación del punto y estado GO/Precaución/
  NO-GO. **No se fabricó una "ventana" de horario** (el mockup mostraba un rango tipo
  "08:00–11:00") porque no existe una duración estimada por misión en el esquema — se muestra
  solo la hora de despegue real.

### Sandbox superadmin (`app/admin/master/dev`)

Vista completa de desarrollo con: ScoreGauge SVG · WindCompass SVG · barras de métricas horarias · pronóstico 7 días (cards diarias) · historial Kp 24h + forecast 24h · GPS automático + reverse geocoding Nominatim · debug de hora/modelo.

### NOAA Kp — gotchas

- El endpoint `noaa-planetary-k-index-forecast.json` cambió de arrays `[time, kp, status]` a objetos `{time_tag, kp, observed_kp, noaa_kp}`. `parseKpRow()` maneja ambos formatos.
- `JSON.stringify(NaN) === "null"` — filtrar con `!isNaN(kp)` antes de serializar.
- Las horas en el JSON usan espacio en lugar de `T`: reemplazar con `.replace(' ', 'T')` antes de `new Date()`.

### Open-Meteo — gotchas

- `findIndex(h => h >= now)` devuelve el índice de la PRÓXIMA hora futura, no la actual. Corrección: `futureIdx > 0 ? futureIdx - 1 : 0`.
- Las fechas hourly vienen sin sufijo de zona horaria → el navegador las interpreta como hora local (correcto con `timezone: America/Bogota`).

---

## Programa de Socios (Escuelas / Asesores)

Sistema de referidos B2B: escuelas de formación UAS y asesores independientes pueden regalar perfiles gratis y recibir comisiones recurrentes por ventas de planes pagados.

### Tablas (migraciones `20260613_partners_program.sql` + `20260613_partners_pending_code.sql` + `20260614_partner_program_fixes.sql` + `20260614_partner_invitations.sql` + `20260614_partner_logo_and_bucket.sql`)

| Tabla | Descripción |
|---|---|
| `partners` | Escuela o asesor. `type` (escuela/asesor), `parent_partner_id` (asesor → escuela), `commission_pct`, `free_seats_limit`/`free_seats_used`, `free_days`, `status`, **`logo_url`** (logo del socio para branding de correos/panel) |
| `partner_codes` | Códigos de venta únicos (`code` UNIQUE). Generados como INICIALES-XXXX (ej. EAC-XB12). Cada partner puede tener varios. |
| `partner_members` | Quién accede al panel `/socio`. `role`: `owner` (crea asesores, ve todo) o `asesor` (solo sus datos). Solo service role puede escribir. |
| `partner_invitations` | Invitación a personas **sin cuenta** BitaFly para acceder al panel `/socio`. `email`, `role` (owner/asesor), `token` (UNIQUE), `status` (pendiente/aceptada/expirada), `expires_at` (+7 días). |
| `free_grants` | 1 por email, no renovable. `status`: `enviado→activado→degradado→purgado`. `expires_at` + `purge_after` (expiry + 90 días). `redeemed_org_id` al canjearse. Tiene `updated_at`. |
| `referrals` | 1 por org (`org_id`). Relación org-cliente ↔ partner. `code`, `plan`, `billing`, `status`: `activa/cancelada`. Se cancela al cancelar la suscripción. |
| `referral_commissions` | Una fila por ciclo de pago (recurrente). Idempotente por `ref_payco` (UNIQUE index). `status`: `pendiente/liquidada/anulada`. Tiene `updated_at`. |

**RLS**: SELECT para miembros del socio (`private.user_partner_ids()`); INSERT/UPDATE/DELETE solo service role.

**Bucket** público `partner-logos` (logos de socios). Política: lectura pública; escritura solo service role (gate a nivel de API). `partners.logo_url` guarda la URL pública directa.

### Flujo de comisión
1. Usuario paga con código → `pending_subscriptions.partner_code` → webhook → `attributeCommission()` (`lib/partnerReferral.js`)
2. Si el vendedor es asesor hijo de una escuela, el `%` que aplica es el de la **escuela** (BitaFly paga a la escuela, no al asesor directamente)
3. Cada pago genera 1 fila en `referral_commissions` (idempotente por `ref_payco`)
4. Al cancelar suscripción (self o Master): `referrals.status = 'cancelada'`
5. Master liquida desde el tab **Comisiones** → PATCH `status='liquidada'`

### Perfiles gratis (regalos)
- Escuelas/asesores regalan perfiles piloto con período de gracia (`free_days`, default 90)
- `POST /api/socio/grants { email }`: valida cupo, unicidad global, envía correo branded con link `?email=&grant=<token>`
- `DELETE /api/socio/grants { grant_id }` (solo `owner`): anula el regalo. Si ya fue canjeado (`redeemed_org_id`), **degrada a los perfiles de la org beneficiaria a piloto** (revoca el plan obsequiado); libera el cupo (`free_seats_used--`). Botón 🗑 en la lista de regalos del panel.
- **Registro con `?grant=<token>`** (`registro/page.js`): entra directo al registro de **piloto independiente** (`createStep=2`, `type=solo`, plan piloto), con el **correo pre-llenado y bloqueado**. Al activar: `subscription_expires_at = grants.expires_at`.
- **Cron diario** (`vercel.json`, 13:30 UTC → `GET /api/cron/free-grants`, secured con `CRON_SECRET`):
  - Degrada grants `IN ('activado','enviado')` con `expires_at <= now` → `status='degradado'`, baja perfil a piloto, notifica
  - Purga grants `status='degradado'` con `purge_after <= now` → elimina datos operacionales de la org, notifica
- ⚠️ `CRON_SECRET` debe estar configurado en Vercel env vars

### Onboarding de miembros del panel (con / sin cuenta)
`POST /api/admin/master/partners {action:'add_member'}` y `POST /api/socio/advisors` bifurcan:
- **Tiene cuenta** (`profiles` por email): upsert `partner_members` + notificación in-app (inserción directa — el socio puede ser de cualquier org, **NO** usar `createNotifications` que exige orgId) + correo de bienvenida branded.
- **Sin cuenta**: revoca invitaciones previas pendientes, inserta `partner_invitations`, envía correo branded con link `/registro?socio_invite=<token>`.
- **Registro con `?socio_invite=<token>`**: `GET /api/socio/invite-info?token=` (público, devuelve `email`, `partner_name`, `partner_type`, `role`) → el form salta a datos con **correo pre-llenado y bloqueado**, banner del socio, botón "Crear cuenta y unirme", redirect a `/socio`. En `register` se vincula `partner_members` y se marca la invitación `aceptada`.

### Plan Enterprise para dueños de escuela
El **dueño** (`role='owner`) de un partner `type='escuela'` recibe `subscription_plan='enterprise'` permanente (`subscription_expires_at=null`). Se aplica en: `add_member` (Master), registro vía `socio_invite`, y se **sincroniza al cambiar el estado** de la escuela en `PATCH partners` (activo → enterprise · inactivo → piloto a sus owners). Solo el dueño (no los asesores). El plan operativo de la org se deriva del perfil del admin (`getOrgPlan`), por eso basta tocar el perfil del dueño.

### Rutas del panel de socio (`/socio`)
- **Guard**: `src/app/socio/layout.js` → llama `/api/socio/me`, redirige si 401/403. El header muestra el `logo_url` del socio si existe.
- **Acceso desde el dashboard**: botón **"Panel Socio"** (ícono handshake) en el header de `dashboard/layout.js`, visible solo si hay fila en `partner_members` para el usuario (query `isSocio`).
- `/api/socio/me` — contexto completo (partner con `logo_url`, member con email/name/role, codes, stats, advisors para escuelas)
- `/api/socio/grants` — GET lista regalos, POST regalar, **DELETE anular** (owner)
- `/api/socio/advisors` — GET/POST/DELETE gestión de asesores (solo owner de escuela)
- `/api/socio/reports?months=N` — historial por período, desglose por asesor, detalle de comisiones
- `/api/socio/logo` — POST sube/actualiza logo (owner, bucket `partner-logos`, máx 2MB), DELETE quita logo
- `/api/socio/account` — DELETE el propio usuario borra su cuenta (confirma escribiendo su correo; bloquea si es único owner de escuela con asesores activos)
- `/api/socio/invite-info` — GET público, valida token de `partner_invitations`
- **UI** (`socio/page.js`): tabs **Panel** / **Reportes** / **Perfil**. Perfil: datos de cuenta, subida/cambio de logo (owner) y borrado de cuenta autoconfirmado.

### Rutas Master (`/admin/master`)
- `/api/admin/master/partners` — CRUD de socios: crear, editar (comisión/cupos/días inline), agregar código, vincular miembro/invitar, desactivar. GET incluye `invitations[]` por partner.
- `/api/admin/master/commissions` — GET comisiones agrupadas por partner/período, POST liquida por IDs
- `/api/admin/master/invite` — GET lista de organizaciones (para dropdown) · POST `{ email, role, plan?, name?, orgId?, message? }` envía correo de invitación a cliente; si `orgId` crea/actualiza fila en `invitations` (upsert por org+email). CTA adaptada: existente → dashboard, nuevo+org → registro con NIT, nuevo → registro independiente. Card de plan con precio pero **sin fecha de primer pago**.
- Tab **Socios** (`_SociosTab.js`) — crea escuelas/asesores, jerarquía, miembros, copiar códigos, **invitaciones enviadas** (chips pendiente/aceptada/expirada), **edición inline de condiciones**. Botón "Vincular" con guard anti-doble-envío.
- Tab **Comisiones** (`_ComisionesTab.js`) — filtros pendiente/liquidada, acordeón por socio, "Liquidar todo" o por período
- Tab **Invitaciones** (`_InvitacionesTab.js`) — formulario: email + nombre, selector visual de rol (4 botones), selector de plan sugerido (5 cards), dropdown buscable de org (nombre/NIT), mensaje personalizado, preview resumen, feedback. Siempre verifica `{ error }` de Resend.

### Reglas críticas
- **Código en checkout**: campo opcional en `/dashboard/subscription` → `POST /api/epayco/checkout` → `pending_subscriptions.partner_code`. También en registro libre (`registro/page.js`, campo visible salvo cuando viene por invitación/regalo) → `POST /api/auth/register` crea `referrals` org↔socio (crédito; la comisión real se atribuye al pagar).
- **Atribución en webhook** (`/api/epayco/webhook`): captura `partner_code` del pending, llama `attributeCommission()` en try/catch (nunca rompe la activación)
- **Ser socio ≠ nuevo rol**: se detecta por filas en `partner_members`, no por `profiles.role` → no afecta RLS operacional
- **1 grant por email globalmente**: `free_grants.email UNIQUE` → no se puede renovar aunque expire
- **Asesor independiente vs hijo de escuela**: el `%` de comisión siempre viene del partner de más alto nivel (escuela). Si el vendedor es asesor sin padre, usa su propio `%`
- **Dominio de correos**: el dominio verificado en Resend es **`bitafly.com`** (NO `.co`). Todo `from:`/fallback de URL usa `.com`. El SDK retorna `{ error }` sin lanzar — siempre revisar.
- **Correos branded**: usar `emailHeader({partnerLogoUrl, partnerName})` + `emailFooter()` de `emailHelpers.js` (logo BitaFly desde `/public/logo.png` vía `bitaflyLogoUrl()` + logo del socio). Aplicado en grant, bienvenida, invitación de socio y de asesor.

---

## Pendientes de infraestructura

- [x] **`20260702_audit_log.sql` aplicada en Supabase (2026-07-03)** — tabla `audit_log` + política RLS creadas y verificadas. Auditoría de acciones ya no es inerte; ver **Auditoría rediseñada**.
- [x] **`20260703_protocols.sql` aplicada en Supabase (2026-07-03)** — tabla `protocols` + política RLS creadas y verificadas. Ver **Protocolos**.
- [x] **`20260703_org_aerocivil_registration.sql` aplicada en Supabase (2026-07-03)** — columnas `operator_number`/`registration_expiry`/`authorized_operations` en `organizations`, confirmado con el usuario. Ver **Organización rediseñada**.
- [x] **`20260703_sms_case_tracking.sql` aplicada en Supabase (2026-07-03)** — tablas `safety_barriers`/`sms_case_actions`/`sms_case_events` + columnas `severity`/`aerocivil_notified_at` en `vor_mor_submissions`, confirmado con el usuario. Ver **Seguimiento de casos SMS/VOR/MOR**.
- [x] **`20260703_sms_reports_updated_at.sql` aplicada en Supabase (2026-07-03)** — columna `updated_at` + trigger en `sms_reports`. Ver **Seguimiento de casos SMS/VOR/MOR**.
- [x] **`20260703_vor_mor_reported_fields.sql` aplicada en Supabase (2026-07-03)** — columnas `reported_severity`/`related_barrier_id` en `vor_mor_submissions`. Ver **Editor de formato VOR/MOR rediseñado**.
- [x] **`20260702_billing_history.sql` aplicada en Supabase (2026-07-03)**, confirmado con el usuario al rediseñar Suscripción. Ver **Historial de facturación**.
- [ ] Agregar `DJI_API_KEY` a Vercel env vars
- [ ] Agregar `NEXT_PUBLIC_APP_URL` a Vercel env vars
- [ ] Agregar `AEROCIVIL_SALT` a Vercel env vars (el fallback inseguro ya fue removido — el endpoint lanza error si falta la variable)
- [ ] Agregar `CRON_SECRET` a Vercel env vars (cualquier string aleatorio seguro — protege `GET /api/cron/free-grants`)
- [ ] Habilitar `auth_leaked_password_protection` → Supabase > Authentication > Settings > Password Strength
- [x] **Migraciones del programa de socios aplicadas en Supabase** (2026-06-14): `20260614_partner_program_fixes.sql` (`updated_at` + `'purgado'`), `20260614_partner_invitations.sql` (tabla de invitaciones), `20260614_partner_logo_and_bucket.sql` (`partners.logo_url` + bucket público `partner-logos`)
- [x] **Bucket `documents` privado** (Fase G, 2026-06-12): era PÚBLICO con cédulas/certificados médicos/diplomas accesibles sin auth. Ahora privado; acceso vía `GET /api/documents/open?path=` (valida org → 302 a signed URL 1h). `FileUpload.js` guarda *path*; `lib/docUrl.js` (`docPath`/`docOpenUrl`) resuelve paths y URLs legacy. Consumidores (avatares, links de docs, PDF de expediente) usan el endpoint. URLs públicas en BD migradas a paths (`supabase/migrations/20260612_documents_private.sql`). Nota: el CDN puede servir copias cacheadas de URLs ya accedidas hasta ~1h.
- [x] `EPAYCO_P_KEY` agregada a Vercel (firma del webhook)
- [x] Auditoría 2026-06-12: mass-assignment corregido en `POST /api/pilots`/`POST /api/fleet`, columnas `pilots.avatar_url`/`aerocivil_additions`/`notes` aseguradas, políticas legacy del bucket `documents` (borrado/subida cross-tenant) eliminadas, índices FK + RLS initplan optimizados (`supabase/migrations/20260612_audit_fixes.sql`)
- [x] Auditoría 2026-06-14 (programa de socios): correos de socios usaban dominio `bitafly.co` no verificado → corregido a `.com` en partners/advisors/grants/cron; `add_member` retorna `email_error` para diagnóstico; botón "Vincular" con guard anti-doble-envío; `invite-info` faltaba `email` en el `.select()` (campo de registro vacío); correo de asesores ahora branded con logo + fallback de dominio corregido. `.gitignore` ignora `~$*`/`*.tmp`/`*.patch`.
- [x] **Migración OTA aplicada en Supabase** (2026-06-16): `supabase/migrations/20260616_app_releases.sql` — tabla `app_releases` + bucket público `app-releases`. Fila inicial insertada con APK v1.1.0 (`version_code=2`). Política RLS pública `public_read_current_version` (SELECT WHERE is_current=true) agregada directamente en Supabase. `GET /api/app/version` usa cliente anon (no service role) — funcional en prod.
- [x] **Migración Storage a Cloudflare R2 completa (F8, 2026-06-23)**: todos los buckets migrados a R2. `src/lib/storage/index.js` es R2-only — sin SDK Supabase Storage, sin `bucketMode()`, sin fallback. Componentes usan `POST /api/storage/sign-upload` → presigned PUT directo. `AddMaintenancePanel.js`, `FileUpload.js`, `FleetImageUpload.js` simplificados (sin 409 Supabase). Env vars requeridas: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`, `R2_LOGOS_BASE_URL`, `R2_RELEASES_BASE_URL`, `R2_BUCKET_*` por bucket.
- [x] **Panel Master — Tab Invitaciones (2026-06-23)**: `src/app/admin/master/_InvitacionesTab.js` + `src/app/api/admin/master/invite/route.js`. Envía correo de captación/invitación a clientes con plan sugerido (sin fecha de pago). Guard `assertSuperadmin()`.
- [x] **Migración `pilots.deactivated_at` aplicada (2026-07-01)**: `supabase/migrations/20260606_pilot_deactivated_at.sql` existía pero nunca se había ejecutado contra el proyecto — causaba 400 en `pilots?select=deactivated_at...` (usado por `dashboard/layout.js` para el período de gracia de 30 días). Aplicada y verificada vía Supabase MCP.
- [ ] **Descarga de manuales sin streaming**: `GET /api/manuals/[id]/download` (`dashboard/manuales/page.js`) sigue devolviendo signed URL directa a R2 en vez de streaming server-side — mismo riesgo de bloqueo por extensiones/CORS que ya se corrigió en documentos, replays y adjuntos de mantenimiento. No migrado aún por el límite de tamaño (hasta 25 MB) vs. el límite de respuesta de funciones serverless.
- [x] **Logo legacy roto — resuelto (2026-07-03)**: `dashboard/settings/page.js` renderizaba `org.logo_url` directo (`<img src=...>`), pero `FileUpload` sube al bucket privado `documents` y devuelve un *path*, no una URL pública — roto para logos nuevos y para al menos 1 organización con URL legacy del antiguo bucket Supabase Storage. Se corrigió al rediseñar el hero de Organización: ahora usa `docOpenUrl(org.logo_url)` (mismo helper que ya resuelve paths nuevos y URLs legacy para avatares/documentos). Ver **Organización rediseñada**.

---

## App Android — OTA Updates (sin Google Play)

La app Capacitor corre en **remote URL mode** (`server.url: https://bitafly.com`), por lo que:
- **Cambios web (UI/Next.js)** → instantáneos tras cada deploy a Vercel. **No requieren nuevo APK.**
- **Cambios nativos** (plugins Java, permisos, Capacitor) → requieren nuevo APK + OTA update.

### Arquitectura

| Capa | Archivo | Descripción |
|---|---|---|
| Plugin nativo | `AppUpdatePlugin.java` | Lee versión instalada via `PackageManager`, descarga APK, lanza instalador |
| Bridge JS | `lib/appUpdate.js` | `checkForUpdate()` + `downloadAndInstall(url, onProgress)` |
| Componente | `components/AppUpdateBanner.js` | Banner (no bloqueante) o modal (forzado) en el dashboard |
| API pública | `GET /api/app/version` | Retorna `{ version_name, version_code, apk_url, release_notes, force_update }` |
| API admin | `/api/admin/master/releases` | GET historial · POST publicar · DELETE retirar (solo superadmin) |
| Panel Master | `_ReleasesTab.js` | Tab "App Releases" en `/admin/master` |
| DB | `app_releases` | `version_name`, `version_code`, `apk_url`, `release_notes`, `force_update`, `is_current` |
| Storage | bucket `app-releases` | APKs firmados, público, 100 MB máx |

### Flujo de release nativo (paso a paso)

```
1. Editar android/app/build.gradle → incrementar versionCode y versionName
2. npm run build  →  npx cap sync android
3. ./gradlew assembleRelease        # APK firmado en android/app/build/outputs/apk/release/
4. Subir app-release.apk al bucket "app-releases" en Supabase Storage
5. Copiar la URL pública del archivo subido
6. Ir a /admin/master → tab "App Releases" → publicar nueva versión con la URL
7. Los controles DJI detectan la actualización al abrir la app y ofrecen instalar
```

### Reglas críticas

- **`force_update = true`**: el modal no tiene botón de cerrar — usar solo para versiones que corrigen bugs críticos o breaking changes de API.
- **`versionCode`** debe ser siempre **creciente** (entero). La comparación `serverCode > installedCode` decide si hay update.
- **`PackageManager`** en lugar de `BuildConfig`: `BuildConfig` no es accesible desde plugins en el build setup actual. Usar `pInfo.getLongVersionCode()` (API 28+) / `pInfo.versionCode` (legacy).
- **`REQUEST_INSTALL_PACKAGES`**: declarado en `AndroidManifest.xml`. En Android 8+ el sistema muestra un dialog de confirmación de instalación.
- El APK descargado se guarda en `getExternalFilesDir(null)/bitafly-update.apk` — accesible via `FileProvider` con path `external-files-path`.
- **Progreso**: el plugin emite eventos `downloadProgress { progress: 0-100 }` via `notifyListeners`; el banner muestra una barra de progreso.
- **`GET /api/app/version` usa cliente anon**: es un endpoint público — usa `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`, NO `createAdminClient()`. La tabla `app_releases` tiene una política RLS `public_read_current_version` que permite SELECT WHERE is_current=true sin autenticación.
- **Versión actual en prod**: v1.1.0 / versionCode 2. APK en `app-releases/bitafly-v1.1.0.apk`.

---

## Comandos

```bash
npm run dev      # localhost:3000
npm run build    # build producción
npm run lint     # ESLint
```

```
/graphify C:\Users\PC\Documents\skylog-manager   # regenerar grafo de conocimiento
```
