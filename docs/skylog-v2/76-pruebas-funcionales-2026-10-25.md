# Pruebas funcionales por perfil y plataforma — 2026-10-25

Continúa `73-resultados-pruebas.md` (rondas del 16 y 23-oct). Este documento es el **plan y el registro de avance**: se actualiza al cerrar cada fase.
Leyenda: ✅ pasa · ❌ falla · ⬜ pendiente · ➖ no aplica / no ejecutable.

## 0 · Entorno y límites (decididos antes de empezar)

| Tema | Situación |
|---|---|
| Base de pruebas | **Producción** (`bitafly.com`). La base de desarrollo `bqimtkwzayewwubgsaji` no responde (el host no contesta y no está en la cuenta de Supabase conectada), así que `test:integration` no puede correr. |
| Datos | Todo lo que se crea lleva prefijo `QA-20261025`. Cuentas nuevas con correo `qa.<perfil>.1025@bitafly-test.local` (no existe el buzón: los correos salientes no llegan a nadie). |
| Lo que NO se ejecuta | Cobro real en Wompi, eliminar cuentas reales, enviar correos a terceros, tocar organizaciones de clientes. |
| Mantenimientos | No se pueden borrar (retención 5 años): cada mantenimiento de prueba queda en la organización QA. |
| PC | Playwright + Chromium 1366×768 |
| Android | Emulador `Medium_Phone_API_37.0` (Chrome) si arranca; si no, Pixel 7 emulado en Chromium (se declara). |
| iPhone | Safari real en simulador iPhone 17 vía Appium (`~/bitafly-appium`). |

## 1 · Plan por fases

| Fase | Contenido | Estado |
|---|---|---|
| F0 | Entorno: Playwright, cuentas nuevas desde cero (GG por registro; JP, GS, P por invitación/alta) | ⬜ |
| F1 | PC · por perfil (GG, JP, GS, P, PI, Socio): acceso por pantalla, botones, permisos por URL directa, tiempos | ⬜ |
| F2 | PC · funciones nuevas: proveedores (dirección/correo/teléfono), checklist de auditoría, Libro de Mantenimiento (ID MNT-, proveedor, enlace, adjunto, edición), 11 PDF de Reportes, listas en papel | ⬜ |
| F3 | Seguridad: aislamiento entre organizaciones, rutas sin sesión, rol insuficiente, entradas hostiles (XSS en nombres, URL `javascript:`), cabeceras | ⬜ |
| F4 | Rendimiento: tiempo de login y de cada pantalla por perfil, API p50/p95, 5xx | ⬜ |
| F5 | Android (emulador) y iPhone (Safari real): login, navegación, formularios, descarga de PDF, desbordes | ⬜ |
| F6 | Consolidación: hallazgos, correcciones, re-prueba, resumen | ⬜ |

## 2 · Registro de avance

**F0 ✅ Cuentas desde cero (producción, 2026-10-25).** Org A `QA-20261025 Operaciones` (NIT 954121036-1): GG `qa.gg.1025` + JP `qa.jp.1025` (se unió por NIT). Org B (GG `qa.ggb.1025` + GS `qa.gs.1025`) y Org C (GG `qa.ggc.1025` + Piloto `qa.p.1025`). Contraseña `BitaflyQA1025!`. Piloto independiente y Socio: cuentas QA de la ronda anterior (`BitaflyQA2026!`). El alta pública y «unirse por NIT» respondieron 200 en 1,6–3,6 s. **Límite de plan verificado:** la prueba gratuita admite 1 tripulante además del gerente; el 2.º aspirante recibió 409 `limite_plan` con mensaje claro (por eso hay 3 organizaciones).

**F2 ✅ Funciones nuevas por API (GG, org A): 40/40.** Proveedor con dirección/correo/teléfono (crear, editar, validar nombre vacío); 3 criterios de auditoría por categoría; 2 mantenimientos con ID consecutivo (1 → 2); proveedor y enlace en el evento; enlace `javascript:`, sin protocolo, de 600 caracteres, proveedor inexistente y tipo inválido rechazados (400); PATCH asigna/quita proveedor y enlace y **no** altera otros campos; adjunto PDF sube (200, corrección `8caae82d` confirmada), HTML rechazado (400), >4 MB rechazado (413), descarga redirige y quitar funciona; 12 APIs de reportes responden 200 (0,5–4,7 s).

**F3 ✅ Seguridad: todas las comprobaciones pasan.** Sin sesión: 12 GET, 4 escrituras → 401; 5 páginas → `/login?next=`. Piloto (org C), Gerente SMS (org B) y GG de otra organización contra la org A: lectura/escritura de aeronaves, proveedores, criterios, mantenimientos, reportes, miembros, PATCH y adjunto ajeno → 400/403/404, **0 fugas**. Cabeceras HSTS, X-Frame-Options, nosniff, Referrer-Policy, CSP y Permissions-Policy presentes. XSS almacenado (`<script>`, `onerror`, `onload` en nombre/contacto de proveedor) no se ejecuta en Proveedores, Mantenimiento ni Reportes. Roles dentro de su propia organización: Piloto no crea proveedores (403, correcto), Gerente SMS sí (200, correcto: matriz Y2).

## 3 · Hallazgos

| # | Sev. | Dónde | Qué pasa | Estado |
|---|---|---|---|---|
| F-024 | Media | `POST /api/flota/models/seed-dji` (Flota → catálogo DJI) | Elegir **varios** modelos a la vez daba 500 `null value in column "gnss_supported"` (insert en lote con fichas de distinto conjunto de campos). Un solo modelo funcionaba. | ✅ inserta uno por uno (pendiente de desplegar) |
| F-025 | Baja | `/admin` con sesión de gerente | Mostraba un listado de archivos del servidor («Index of /admin/ plataforma, socios…»). Sin sesión sí redirige a login. | ✅ `admin/page.js` redirige; la guardia devuelve a `/inicio` (pendiente de desplegar) |
| F-026 | Baja | `/flota/mantenimiento` como Piloto | Pedía `/api/proveedores/suppliers` y recibía 403 (mi pantalla nueva; mismo caso que F-016). | ✅ no se pide sin permiso Y1 (pendiente de desplegar) |
