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
│   ├── sora/ · sms/ · reports/ · dashboard/
│   └── admin/master/  ← superadmin (middleware protege /api/admin/*) + epayco-subscriptions (listar/cancelar)
└── dashboard/         ← páginas client-side

components/
├── DjiRcSync.js        ← importación DJI
├── FlightReplayModal.js ← replay GPS animado
├── AddMaintenancePanel.js ← drag-drop upload adjuntos
├── AircraftCard.js     ← overflow-hidden en imagen, NO en root (evita cortar dropdowns)
├── WeatherWidget.js    ← widget de clima reutilizable (ver sección Módulo de Clima)
├── authorizations/     ← BasicForm, AerocivilForm, MapPickerModal (acepta initialCenter/initialZoom)
└── landing/ · settings/

lib/
├── supabaseServer.js   ← createClientSSR() + createAdminClient()
├── apiAuth.js          ← getOrgContext()
├── roles.js            ← PERMISSIONS (fuente única)
├── planLimits.js       ← PLAN_CONFIG, canAddResource()
├── checklistDefaults.js ← CHECKLIST_DEFAULTS + buildChecklistRows()
├── djiParser.js        ← parseDjiTxtBuffer() — requiere DJI_API_KEY
├── epaycoActivation.js ← activatePlanForUser() — idempotente
├── emailHelpers.js     ← escHtml()
└── rateLimiter.js      ← checkRateLimit() + getClientIp()
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
- `organizations` — tenant. Tiene `enable_health_check`, `enable_preflight`, `enable_briefing` (toggles protocolos)
- `pilots` · `aircraft` · `batteries` · `battery_logs`. `pilots.invitation_status` 'pending'/'accepted'/'rejected'/null · `pilots.profile_id` se vincula al aceptar invitación
- `invitations` — invitación de tripulante: `email`, `role`, `organization_id`, `status`, `token` (UNIQUE, para enlaces), `pilot_id`, `invited_by`, `name`, `accepted_at`
- `flights` — `pilot_id` + `mission_id` editables vía PATCH. `replay_path` nullable. `plan_id` FK → flight_plans. Constraint `uq_flights_org_aircraft_date_time` UNIQUE NULLS NOT DISTINCT `(organization_id, aircraft_id, flight_date, takeoff_time)`.
- `maintenance_logs` — tiene `attachment_path TEXT` (bucket `maintenance-docs`, signed URL 1h)
- `flight_plans` — planeaciones guardadas. `status` 'active'/'archived' (soft-delete). RLS por org.
- `flight_authorizations` — misiones programadas. `plan_data jsonb` guarda la planeación (op_name, geo_type, points, radius, altitude, takeoff_time, notes) para regenerar KMZ/PDF en Programación Activa.
- `sms_reports` · `sora_assessments` · `daily_health_checks` · `pilot_endorsements`
- `form_definitions` (campos de formulario por aeronave — los checklists se generan combinando esto con `lib/checklistDefaults.js`) · `inventory_items` · `mission_inventory_logs` · `mission_types` · `colombia_geo` (sin coordenadas — solo Código/Nombre Departamento/Municipio)
- `vor_mor_definitions` · `vor_mor_submissions` (reportes VOR/MOR) · `emergency_contacts` · `insurance_policies` · `leads`
- `pending_subscriptions` — intents ePayco (filas huérfanas = webhook no corrió)
- `pending_registrations` — registro pre-pago (expira 3h, service_role only)
- `processed_webhook_refs` — idempotencia webhook (`ref_payco PK`)
- `epayco_plan_config` — configuración planes: `replay_retention_days`, `replay_max_flights`. Editable desde `/admin/master`.

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

**Conteo de tripulantes** (`crewCountsForLimit(pilotRole)` en `planLimits.js`): **Gerente General y Gerente SMS NO cuentan** contra el límite de "Pilotos"; sí cuentan Piloto, Jefe de Pilotos y Observador. Aplicado en: import onboarding, `POST /api/pilots`, `AddManualPilotPanel`, medidor de uso en `/api/subscription`.

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
- **Despacho** (`/logbook/new`): usa el flujo CON orden de vuelo; solo ve las misiones donde es el PIC asignado (`visibleAuths` filtra `resources.auths` por su `pilots.id`).
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
4. Inserta vuelo + actualiza `total_hours` vía RPC + actualiza `batteries.cycles` si mayor
5. Plan `piloto`: auto-crea registro en `pilots` si no existe (evita "Sin asignar")
6. `parseDjiTxtBuffer()` requiere `DJI_API_KEY` en env (WASM, server-side)

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

---

## Planeación, Programación y Despacho

**Planear Vuelo** (`/dashboard/plan-vuelo`): visible para el **piloto independiente** (`pilotOnly`) y para el **piloto de org** (entrada extra `roles:['piloto']`+`pilotHidden`). Usa `components/FlightPlanner.js` (mapa + zona + KMZ + PDF + guardar planeación). Si quien guarda es `role==='piloto'`, `POST /api/flight-plans` notifica al Jefe de Pilotos y GG.

**Programación** (`/dashboard/authorizations`, roles admin/jefe_pilotos): crear misión. Pestañas **Misión Básica** y **Apéndice 13**.
- **Misión Básica** = `BasicForm` unificado: datos de misión (PIC, UAS, tipo RAC 100, depto/municipio, fecha, hora) + zona en mapa (geo_type, altitud) + descargas KMZ/PDF, todo en un solo form.
- Al elegir municipio se geocodifica `"Municipio, Depto, Colombia"` vía **Nominatim** (sin API key) para centrar el `MapPickerModal` (`initialCenter`/`initialZoom`). Falla → Bogotá.
- KMZ/PDF se generan con `lib/flightPlanDocs.js` (`GEO_TYPES`, `getZoneSummary`, `downloadFlightKMZ`, `generateFlightPlanPdf`) — fuente única compartida con FlightPlanner.
- Al autorizar, envía `plan_data` (zona/altitud/notas) para guardarlo en `flight_authorizations`.

**Programación Activa** (`/dashboard/programacion-activa`, sección propia en nav): lista misiones autorizadas con descarga **KMZ/PDF por misión** (regeneradas desde `plan_data`). Misiones viejas sin `plan_data` descargan sin geometría.

**Despacho** (`/dashboard/logbook/new`):
- Sin selector de batería (se actualiza al subir DJI). 
- Rol `piloto` solo ve órdenes donde es el PIC asignado (filtra `auths` por su `pilots.id`); managers ven todas.
- ⚠️ `pilotPlan` (despacho simplificado) = `subscription_plan==='piloto' && role==='admin'` — el piloto de org (role `piloto`) usa el flujo CON orden de vuelo, NO el simplificado.
- Desplegable "Detalles de la programación" al pie muestra el `plan_data` + campos de la misión seleccionada.

**Auto-match al importar DJI** (`import-dji` paso 7): por cada vuelo, busca una `flight_authorization` no cancelada cuya fecha coincida con `parsed.fecha`; **prefiere la que coincide con `aircraft_id`** y copia `mission_id` + `pilot_id` al vuelo automáticamente. Así, al sincronizar varios vuelos, cada uno queda emparejado con su misión y piloto programados.

**Edición de PIC en bitácora**: en `/dashboard/logbook` la columna Piloto (PIC) es editable inline para admin/jefe_pilotos (`PilotCell` → desplegable con la tripulación de `/api/pilots` → `PATCH /api/logbook/[id]`). También el N° de misión es editable inline.

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

## Convenciones de código

- **API routes**: siempre `createClientSSR()` + `getOrgContext()`. Auth guard: `if (!user) return 401` antes de usar `user.id`.
- **Permisos**: `PERMISSIONS.canXxx` — nunca hardcodear `['superadmin','admin','jefe_pilotos']`
- **Mass-assignment**: nunca `insert([{ ...body }])` — siempre campos explícitos
- **Rate limiting**: todo endpoint público sin auth usa `checkRateLimit()`
- **Emails**: todo campo de usuario en HTML de Resend pasa por `escHtml()`
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

## Pendientes de infraestructura

- [ ] Agregar `DJI_API_KEY` a Vercel env vars
- [ ] Agregar `NEXT_PUBLIC_APP_URL` a Vercel env vars
- [ ] Agregar `AEROCIVIL_SALT` a Vercel env vars → remover fallback en `src/app/api/aerocivil/credentials/route.js` (buscar `TODO`)
- [ ] Habilitar `auth_leaked_password_protection` → Supabase > Authentication > Settings > Password Strength
- [x] `EPAYCO_P_KEY` agregada a Vercel (firma del webhook)

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
