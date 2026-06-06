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
| `getOrgContext()` | `apiAuth.js` | Extrae `user`, `orgId`, `role`, `plan` del JWT |
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
- `profiles` — users, tiene `org_id`, `role`, `plan`, `epayco_subscription_id`, `subscription_expires_at`
- `organizations` — tenant. Tiene `enable_health_check`, `enable_preflight`, `enable_briefing` (toggles protocolos)
- `pilots` · `aircraft` · `batteries` · `battery_logs`. `pilots.invitation_status` 'pending'/'accepted'/'rejected'/null · `pilots.profile_id` se vincula al aceptar invitación
- `invitations` — invitación de tripulante: `email`, `role`, `organization_id`, `status`, `token` (UNIQUE, para enlaces), `pilot_id`, `invited_by`, `name`, `accepted_at`
- `flights` — `pilot_id` + `mission_id` editables vía PATCH. `replay_path` nullable. `plan_id` FK → flight_plans. Constraint UNIQUE NULLS NOT DISTINCT `(org_id, aircraft_id, flight_date, takeoff_time)`.
- `maintenance_logs` — tiene `attachment_path TEXT` (bucket `maintenance-docs`, signed URL 1h)
- `flight_plans` — planeaciones guardadas. `status` 'active'/'archived' (soft-delete). RLS por org.
- `flight_authorizations` · `sms_reports` · `sora_templates` · `checklist_templates`
- `form_templates` · `inventory_items` · `mission_inventory_logs` · `colombia_geo`
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

### Piloto Independiente (role=`admin` + plan=`piloto`)

- Se registra como `type='solo'` → crea su propia org. Auto-login directo al dashboard.
- **⚠️ Siempre role=`admin` en BD** — las RLS de `aircraft`, `batteries`, `inventory_items`, `maintenance_logs` usan `private.can_manage_ops()` que requiere `admin|jefe_pilotos|superadmin`. `role='piloto'` bloquea INSERTs.
- `canManageFleet` y `canManageOps` incluyen `'piloto'` en `roles.js` (UI/JS), pero la BD necesita `admin`.
- **Despacho simplificado**: no requiere orden de vuelo ni batería. Pide `mission_type` + aeronave + hora de despegue. Baterías se sincronizan al importar DJI.
- **Auto-piloto DJI**: si no existe registro en `pilots` al importar, se crea automáticamente con datos del perfil.
- **Planeaciones**: guarda en `/plan-vuelo`, selecciona antes de volar desde `/logbook/new`.
- **Unirse a org**: desde `/dashboard/subscription`, ingresa NIT, elige rol → `POST /api/auth/join-org` transfiere toda la data (aircraft, batteries, flights, pilots, flight_plans, etc.) al nuevo org y actualiza `profiles.organization_id + role`. La org origen queda marcada como `[Migrada]`.
- OnboardingBanner NO se muestra al piloto independiente.

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
1. Navegador NO puede leer USB/MTP — usuario debe copiar `FlightRecord` al PC
2. El componente busca `FlightRecord` automáticamente (rutas conocidas + fallback recursivo 6 niveles)
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
