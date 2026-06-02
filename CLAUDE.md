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
│   │   ├── subscription/ ← suscripciones ePayco
│   │   ├── sora/      ← motor de riesgo SORA
│   │   ├── sms/       ← reportes SMS
│   │   ├── reports/   ← generación de reportes PDF/Excel
│   │   ├── dashboard/ ← KPIs
│   │   └── admin/master/ ← panel superadmin
│   └── dashboard/     ← páginas del dashboard (client-side)
├── components/        ← Componentes React
│   ├── authorizations/ ← BasicForm, AerocivilForm, MapPickerModal
│   ├── landing/       ← landing page / marketing
│   └── settings/      ← panels de configuración
├── lib/
│   ├── supabaseServer.js   ← createClientSSR() — GOD NODE (41 edges)
│   ├── planLimits.js       ← PLAN_CONFIG, canAddResource()
│   ├── soraEngine.js       ← motor cálculo SORA/ARC
│   └── reportGenerators.js ← PDF (jsPDF + autoTable), Excel (ExcelJS)
dji-parser/            ← módulo independiente: parsea archivos .dat DJI
railway-robot/         ← Playwright automator para sistema externo (Railway)
supabase/migrations/   ← migraciones SQL
graphify-out/          ← grafo de conocimiento del proyecto (graph.html, graph.json)
```

---

## Abstracciones clave (god nodes)

| Función | Archivo | Edges | Rol |
|---|---|---|---|
| `createClientSSR()` | `src/lib/supabaseServer.js` | 41 | Cliente Supabase SSR — usado en TODOS los API routes |
| `getOrgContext()` | `src/lib/supabaseServer.js` | 28 | Extrae org_id + rol del usuario autenticado |
| `parseDat()` | `dji-parser/index.js` | 16 | Parsea archivos binarios .dat DJI |
| `createAdminClient()` | `src/lib/supabaseServer.js` | 15 | Cliente admin (service role) para operaciones privilegiadas |

**Regla**: Antes de tocar cualquier API route, leer `src/lib/supabaseServer.js` — es la base de toda la autenticación y autorización.

---

## Base de datos (Supabase)

Tablas principales:
- `profiles` — usuarios (vinculado a auth.users, tiene org_id, role, plan)
- `organizations` — organizaciones (tenant principal)
- `pilots` — pilotos registrados por org
- `aircraft` — aeronaves (fleet)
- `flights` — bitácora de vuelos
- `flight_authorizations` — autorizaciones de vuelo (RAC 100 / Aerocivil)
- `batteries` / `battery_logs` — gestión de baterías
- `maintenance_logs` — mantenimiento
- `sms_reports` — reportes SMS (Safety Management System)
- `sora_templates` / `checklist_templates` — plantillas SORA y checklists
- `form_templates` / `form_settings` — formularios personalizables
- `inventory_items` / `mission_inventory_logs` — inventario por misión
- `colombia_geo` — geometría geográfica Colombia (municipios, departamentos)
- `aerocivil_submissions` — solicitudes enviadas a Aerocivil

---

## Roles y planes

**Roles**: `superadmin`, `admin`, `gerente_sms`, `piloto`

**Planes** (definidos en `src/lib/planLimits.js`):
- `piloto` — free (plan base al registrarse)
- Planes pagos vía ePayco — ver `EPAYCO_PLANS` y `PLAN_CONFIG`

**Límites**: `canAddResource()` en `planLimits.js` verifica si el plan permite agregar más pilotos/aeronaves/etc.

---

## Regulación colombiana (importante)

- **RAC 100**: Reglamento Aeronáutico de Colombia para drones — aplica en autorizaciones de vuelo
- **Aerocivil / UAEAC**: autoridad regulatoria
- **Formato 100 (F100)**: formulario oficial de autorización de vuelo, generado por `generateExcelF100()` en `reportGenerators.js`
- **SORA**: marco europeo de análisis de riesgo para drones, implementado en `src/lib/soraEngine.js` con matrices ARC/GRC/SAIL

El flujo de autorización: `MissionControlClient` → `BasicForm` | `AerocivilForm` → `API /flights/authorize` → `flight_authorizations` table.

---

## Pagos (ePayco)

- Proveedor de pagos colombiano
- Integración vía webhook en `src/app/api/subscription/`
- Cancelación en `src/app/api/subscription/cancel/`
- Histórico reciente de trabajo: redirect_url, webhook robusto, botón cancelar (ver git log)

---

## DJI Parser

Módulo independiente en `dji-parser/` que parsea archivos `.dat` y `.csv` de drones DJI.
- Entrada: archivos binarios de telemetría DJI
- Salida: JSON estructurado con campos de vuelo (fecha, hora, GPS, batería, condición visual, etc.)
- Tests en `dji-parser/test/`

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
npm run lint         # ESLint
```

---

## Convenciones de código

- **API routes**: App Router (`route.js`), siempre verificar auth con `createClientSSR()` + `getOrgContext()`
- **Componentes**: `.js` (no TypeScript), Tailwind CSS
- **No hay tests** para el frontend Next.js — solo para dji-parser
- **Idioma del código**: mezcla español/inglés (variables/UI en español, código base en inglés)

---

## Grafo de conocimiento

Ejecutar `/graphify C:\Users\PC\Documents\skylog-manager` para regenerar.
Ver `graphify-out/graph.html` para exploración visual interactiva.
