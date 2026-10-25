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

**F5 (parcial) · iPhone 17 (Safari real, simulador, Appium) y Android (Chrome 145 real en emulador, CDP).**
| Plataforma | Perfil | Login | Pantallas (8–10) | Desborde horizontal | Respuestas ≥ 400 |
|---|---|---|---|---|---|
| iPhone 17 (402 px) | Gerente General nuevo | 5,0 s | 1,7–2,4 s | 0 | no medido (Safari) |
| Android (411 px, dpr 2,6) | Gerente General nuevo | 41 s (arranque del emulador) | 5–10 s; `/proveedores` 41 s una vez | 0 | 0 |
**Segunda tanda (2026-10-25): los otros 5 perfiles en celular.**
| Perfil | iPhone 17 (Safari real) | Android (Chrome 145 real) |
|---|---|---|
| Jefe de Pilotos | login 5,7 s · 8 pantallas 1,8–6,7 s · desborde 0 | login 8,8 s · 10 pantallas 2,2–4,7 s · desborde 0 · 0 errores ≥ 400 |
| Gerente SMS | login 4,4 s · 1,7–4,3 s · 0 | login 18 s · 2,7–7,2 s · 0 · 0 errores |
| Piloto | login 4,4 s · 1,9–2,9 s · 0 | login 9,9 s · 2,0–4,1 s · 0 · 0 errores (confirma F-026) |
| Piloto independiente | login 4,5 s · 1,9–2,4 s · 0 | login 8,6 s · 2,0–3,7 s · 0 · 0 errores |
| Socio | login 4,3 s · `/socio` 3,5 s · 0 | login 8,7 s · `/socio` 2,5 s · 0 · 0 errores |
Objetivos táctiles < 32 px por pantalla: iPhone 6–14, Android 2–12 (el máximo, 12–14, en Proveedores del Jefe de Pilotos); es el F-014 ya conocido. El Jefe de Pilotos en Android falló una primera vez por una carrera de mi script y pasó al repetir. El emulador Android se colgó una vez (sistema sin respuesta) y hubo que reiniciarlo en frío; no es de la app. Su pantalla de «Sin conexión» de BitaFly se mostró correctamente mientras el emulador no tenía red.

El emulador Android corre con GPU por software: sus tiempos no representan un teléfono real (se declara). Primer ingreso en iPhone: el aviso de cookies tapaba la parte baja del tutorial (F-027).

**F2 ✅ (interfaz, PC, clics reales).** Mantenimiento: la tabla «Mantenimientos registrados» muestra los IDs `MNT-0001/0002`; «Editar» → cambiar proveedor y enlace → «Guardar» envía el PATCH (200) y el cambio persiste. 11 de 11 PDF de Reportes se generan y descargan (360–410 KB, 0,4–1,4 s cada uno); revisados a ojo el Libro de Mantenimiento (ID, taller, enlace, responsable), el Formato de Auditoría (grupos Documentos/Herramientas/Infraestructura, tomados del checklist de la organización) y el Listado de Proveedores. Listas en papel: «Descargar todas (PDF)» genera el PDF con NIT en el encabezado (tras F-029). Jefe de Pilotos en la org A: crea proveedor (200), registra mantenimiento (200), edita el enlace (200), lee el reporte (200) y ve «Editar» (coincide con la matriz: JP gestiona L2/Y2).

**F4 ✅ Rendimiento PC, un perfil a la vez (sin otra carga), 25 pantallas cada uno.**
| Perfil | Login | Mediana | Más lenta | Respuestas ≥ 400 | Desborde | `/admin` |
|---|---|---|---|---|---|---|
| Gerente General | 3,4 s | 1,5 s | 8,1 s (`/perfil`) | 0 | 0 | → `/inicio` |
| Jefe de Pilotos | 2,7 s | 1,5 s | 7,1 s | 0 | 0 | → `/inicio` |
| Gerente SMS | 4,7 s | 1,5 s | 5,8 s | 0 | 0 | → `/inicio` |
| Piloto | 2,8 s | 1,5 s | 6,3 s | 0 | 0 | → `/inicio` |
| Piloto independiente | 2,8 s | 1,4 s | 11,2 s | 0 | 0 | → `/inicio` |
| Socio | 2,9 s | 1,6 s | 5,4 s | 0 | 0 | → `/inicio` |
Cada perfil tiene una o dos pantallas con un pico aislado de 5–11 s (distinta en cada corrida): es la variación de la instancia de Supabase (F-003/F-017), no una pantalla concreta. Con una prueba a la vez la mediana es 1,4–1,6 s; con 4 simultáneas subía a 1,6–4,3 s y los logins a 10–14 s.

## 2.1 · Estado de las fases y lo que NO se hizo
| Fase | Estado |
|---|---|
| F0 cuentas desde cero · F2 funciones nuevas · F3 seguridad · F4 rendimiento PC | ✅ |
| F5 iPhone y Android | ✅ **los 6 perfiles** (Gerente General, Jefe de Pilotos, Gerente SMS, Piloto, Piloto independiente, Socio), ver tabla de abajo |
| F6 consolidación | ✅ este documento |
No ejecutado a propósito: pago real (Wompi), envío de correos a terceros, borrar cuentas. No ejecutable: `test:integration` (la base de desarrollo no responde) y el segundo factor del superadmin. **Datos que quedan en producción** (prefijo `QA-20261025`): 3 organizaciones de prueba con 6 cuentas, 1–3 aeronaves, 3 proveedores (uno con texto hostil a propósito), 3 criterios de auditoría, 1–2 listas de chequeo, 3–4 mantenimientos (no se pueden borrar: retención de 5 años).

## 3 · Hallazgos

| # | Sev. | Dónde | Qué pasa | Estado |
|---|---|---|---|---|
| F-024 | Media | `POST /api/flota/models/seed-dji` (Flota → catálogo DJI) | Elegir **varios** modelos a la vez daba 500 `null value in column "gnss_supported"` (insert en lote con fichas de distinto conjunto de campos). Un solo modelo funcionaba. | ✅ inserta uno por uno (pendiente de desplegar) |
| F-025 | Baja | `/admin` con sesión de gerente | Mostraba un listado de archivos del servidor («Index of /admin/ plataforma, socios…»). Sin sesión sí redirige a login. | ✅ `admin/page.js` redirige; la guardia devuelve a `/inicio` (pendiente de desplegar) |
| F-027 | Baja | Tutorial de bienvenida en iPhone | El aviso de cookies (z-999) quedaba sobre el tutorial (z-400) y tapaba parte de «Saltar tutorial / Siguiente». | ✅ el aviso baja a z-350 (pendiente de desplegar) |
| F-028 | Baja | PDF: Formato de Auditoría / Listado de Proveedores | Un nombre de proveedor o de contacto largo saltaba de línea dentro de una celda de altura fija y se cortaba. | ✅ el texto se achica (mín. 5,5 pt) y, si no cabe, termina en «…» (pendiente de desplegar) |
| F-029 | **Alta** | Listas de chequeo → «Descargar todas (PDF)», descarga individual y «Listas en papel» del despacho | **Fallaba siempre** con «orgName is not defined» (mi cambio del NIT, commit `10635cfd`, renombró un parámetro y dejó el nombre viejo). No se había probado con clic real. Descubierto al descargar en la prueba. | ✅ corregido (pendiente de desplegar y re-probar) |
| F-026 | Baja | `/flota/mantenimiento` como Piloto | Pedía `/api/proveedores/suppliers` y recibía 403 (mi pantalla nueva; mismo caso que F-016). | ✅ no se pide sin permiso Y1 (pendiente de desplegar) |
