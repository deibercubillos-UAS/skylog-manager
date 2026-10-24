# BitaFly (Skylog V2.0) — guía del proyecto

Plataforma SaaS de operaciones con drones para Colombia (RAC 100 / RAC 219 SMS / Aerocivil). **Desde el 2026-10-10 la V2 es producción**
(`main` → bitafly.com). La guía de la v1 quedó archivada en `docs/legacy-v1/CLAUDE-v1.md`; no describe el código actual.

## Dónde está cada cosa

- `docs/skylog-v2/00-INDICE.md` — **índice maestro**: normativa, diseño, decisiones (`51-bitacora.md`), matriz de permisos (`70-matriz-de-permisos.md`).
  Todo documento nuevo se registra ahí; ningún `.md` pasa de 500 líneas (regla D1 de `01-reglas.md`).
- `01-reglas.md` — reglas de trabajo vigentes (veracidad V1–V5, datos E1–E6, SMS S1–S4, configurabilidad C1–C5, verificación Q1–Q4).
  Las reglas R1–R6 («producción intocable», sin merge a `main`) eran de la etapa de construcción y **ya no aplican**: ahora `main` es producción.

## Stack

Next.js 15 (App Router, JavaScript, sin TypeScript) · React 19 · Tailwind 3 · Supabase (Postgres + Auth + RLS) · Cloudflare R2 (archivos) ·
Resend (correo) · Wompi (pagos) · Vercel (despliegue). Monorepo con npm workspaces: `packages/domain` (reglas de negocio puras y probadas),
`packages/ui` (componentes base). App móvil: Capacitor (`android/`), carga bitafly.com por URL remota.

## Entornos

| | Supabase | Despliegue |
|---|---|---|
| Producción | `ilozajejhecskmhwxkui` (us-east-1) | Vercel `skylog-manager`, dominio bitafly.com, región iad1 |
| Desarrollo | `bqimtkwzayewwubgsaji` | local (`.env.local`) |

El esquema vive en `supabase/migrations/` (toda migración va al repositorio, nunca a mano en la consola; tabla nueva = RLS + `organization_id` + política
en la misma migración). Las tablas de la v1 quedaron en el esquema `legacy_v1` (no se expone a la API).

## Despliegue

Vercel despliega **solo desde `main`**. Desde 2026-10-24 se trabaja y se sube **directo a `main`** (ya no se usa `develop-v2`):
`git push origin main`. Antes de publicar: `npm run lint`, `npm run build` y `npm run test:domain`.
Trabaja en `~/dev/skylog-manager` (no en la carpeta de Google Drive).

## Estructura de `src/`

- `app/(v2)/` — la aplicación autenticada. Cada módulo es una carpeta con su `page.js`; las APIs están en `app/(v2)/api/`.
  Es un cascarón cliente: carga el contexto de sesión desde `/api/duty/context` (compartido y cacheado 60 s en `lib/v2/dutyContextClient.js`).
- `app/api/` — APIs sin grupo: `auth`, `contact`, `leads`, `plans`, `socio` (panel de socios), `cron/*`, `health`.
- `app/` (raíz) — sitio público, legales, blog, tutoriales, login/registro.
- `lib/v2/` — lógica del servidor de la V2 (`duty.js`, `serviceGates.js`, `planLimits.js`, `rowDocument.js`, reportes PDF, etc.).
- `lib/supabaseServer.js` — `createClientSSR()` (con la sesión del usuario) y `createAdminClient()` (llave de servicio, solo servidor).
- `middleware.js` — protege páginas de la app; verifica el JWT **en local** (`getClaims`), sin llamar a Supabase Auth en cada navegación.

## Roles y permisos

Roles: `admin` (Gerente General), `jefe_pilotos`, `gerente_sms`, `piloto`, `superadmin` (interno, nunca en UI pública). «Gestor» = `isDutyManager`.
Matriz completa y hallazgos pendientes: `docs/skylog-v2/70-matriz-de-permisos.md`.
Planes: piloto, escuadrilla, flota, enterprise (`lib/v2/planLimits.js`). El Gerente General no cuenta contra el límite de pilotos.

## Convenciones

- **Autenticación en cada API**: `createClientSSR()` + `auth.getUser()`; sin sesión → 401. El rol se comprueba en la API, no solo en la interfaz.
- **Campos explícitos** en inserciones y actualizaciones; nunca `insert({ ...body })`.
- **Endpoints públicos** (sin sesión): siempre con `checkRateLimit()` (`lib/rateLimiter.js`).
- **Correos**: todo texto de usuario pasa por `escHtml()`; revisar siempre `{ error }` de `resend.emails.send()` (el SDK no lanza).
- **Archivos**: capa `lib/storage` (R2). Descarga de privados por streaming desde el servidor, nunca URLs directas.
- **Datos**: nunca se fabrican datos operacionales; sin columnas derivadas (se calculan al leer). Lo que se radica ante la Aerocivil conserva su formato exacto;
  lo interno es configurable por la organización.
- **Pagos**: Wompi; el webhook verifica el checksum y es idempotente (`wompi_processed_refs`). Cron de cobro recurrente en `vercel.json`.
- **Cron** (`vercel.json`): todos exigen `CRON_SECRET`.
- ESLint 8 con `.eslintrc.json`; componentes `.js` con Tailwind; fuentes `font-lexend` (títulos landing) y `font-sans`.
- Nombres por función, no por marca (regla N2).

## Variables de entorno

Públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`.
Servidor: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `ADMIN_SECRET`, `DJI_API_KEY`, `WOMPI_API_BASE`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`,
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`, `R2_LOGOS_BASE_URL`, `R2_RELEASES_BASE_URL`, `R2_BUCKET_*`, `BACKUP_ENCRYPTION_KEY` (cifra el respaldo diario; sin ella el respaldo sale sin cifrar).
Plantilla en `.env.example`. Nunca se comitean valores (`.env*` está ignorado).

## Pruebas y verificación

- `npm run test:domain` — 548 pruebas de las reglas de negocio (límites de tiempos de servicio, planes, capacitación, etc.).
- `npm run test:integration` — pruebas de API contra un servidor local (`next dev`) y la base de desarrollo.
- Barrido móvil real: `tools/mobile-sweep/` (Appium + simulador de iPhone). Ver su README.
- `lint` + `build` limpios **no bastan** para lógica regulatoria (regla Q3). Lo que no se pudo probar se declara.

## Rendimiento (lo que ya se hizo y por qué)

El cuello de botella es la latencia, no la base (consultas < 6 ms). Medidas vigentes: JWT verificado en local en el middleware, contexto de sesión
compartido y cacheado, consultas independientes en paralelo, el Dashboard en una sola petición liviana (`/api/inicio/resumen`), `prefetch={false}` en enlaces del shell, índices en llaves foráneas de uso frecuente,
ping de mantenimiento cada 5 min (`tools/ci/keepalive.yml`, hay que copiarlo a `.github/workflows/`) contra `/api/health`.
Instancia de Supabase pequeña: revisar su tamaño antes del 31 de octubre (vence el plan de pago).

## Pendientes conocidos

Ver `docs/skylog-v2/70-matriz-de-permisos.md` §4–5 (cambio de roles) y `docs/skylog-v2/51-bitacora.md` (decisiones y estado). Deuda de dependencias: Next 16 y `jspdf` 5 son
saltos mayores que requieren regresión dedicada.
