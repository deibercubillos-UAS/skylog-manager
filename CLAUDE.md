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
dji-parser/            ← módulo independiente: parsea archivos .dat DJI
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
| `activatePlanForUser()` | `src/lib/epaycoActivation.js` | Activa plan en profiles + borra pending_subscriptions (idempotente) |
| `parseDjiTxtBuffer()` | `src/lib/djiParser.js` | Parsea log .txt DJI; extrae serial_aeronave, serial_bateria, ciclos, horas |
| `createAdminClient()` | `src/lib/supabaseServer.js` | Cliente admin (service role) para operaciones privilegiadas |

**Regla**: Antes de tocar cualquier API route, leer `src/lib/supabaseServer.js` y `src/lib/apiAuth.js`.

---

## Base de datos (Supabase)

Tablas principales:
- `profiles` — usuarios (vinculado a auth.users, tiene org_id, role, plan, epayco_subscription_id, epayco_ref, subscription_expires_at)
- `organizations` — organizaciones (tenant principal)
- `pilots` — pilotos registrados por org
- `aircraft` — aeronaves (fleet); campo `total_hours` se actualiza automáticamente al importar vuelos DJI
- `flights` — bitácora de vuelos; campo `pilot_id` editable por admin/jefe_pilotos
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

---

## Roles y planes

**Roles públicos** (4, los que ven los usuarios): `admin`, `gerente_sms`, `jefe_pilotos`, `piloto`
**Rol interno**: `superadmin` — NO mostrar en documentación ni UI pública

**Permisos clave por rol**:
- `jefe_pilotos` + `admin` + `superadmin`: pueden editar el piloto (PIC) de cualquier vuelo vía `PATCH /api/logbook/:id`
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

---

## Grafo de conocimiento

Ejecutar `/graphify C:\Users\PC\Documents\skylog-manager` para regenerar.
Ver `graphify-out/graph.html` para exploración visual interactiva.
