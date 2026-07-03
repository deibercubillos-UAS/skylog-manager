# Plan: Mejora de Diseño BitaFly (Claude Design → Producción)

> Documento de control. Se actualiza al cerrar cada fase. Mantener < 500 líneas.
> Origen: proyecto Claude Design `0e64e44f-c239-441d-9559-9a7a0ebf68f7`, exportado como
> ZIP (`Mejora_de_diseño_Bitafly_1.zip`) el 2026-07-01. Contiene 22 pantallas de dashboard
> (`.dc.html`), sistema de diseño (`_ds/`), 40 screenshots y 10 landing pages + assets de marca.
> Última actualización: 2026-07-01 · Estado: EN EJECUCIÓN (granularidad fina, rama aislada)
>
> **Decisión de alcance confirmada**: Fase 5 entra completa **excepto (f) Mapas de
> restricción**, que queda fuera de este proyecto por alcance indefinido.
> **Decisión de granularidad confirmada**: cada tarea de este documento = **un commit
> atómico**, acotado a 1 archivo/componente cuando sea posible, para minimizar el código
> tocado por push y facilitar revertir sin afectar el resto.

## Convención de estado

⬜ Pendiente · 🔄 En progreso · ✅ Completada · ⏭️ Omitida · ⚠️ Bloqueada / requiere decisión

---

## 0. Hallazgo principal

**Esto NO es un rebrand.** Los tokens del sistema de diseño (`--color-primary: #ec5b13`,
`--color-navy: #1A202C`) son **exactamente** los que ya existen en `tailwind.config.mjs`.
El diseño es un **refinamiento de UI** sobre la misma identidad: agrupación de navegación,
un patrón de "hero banner" navy por página, tiras de KPI reutilizadas en todos los módulos,
y tablas/tarjetas más limpias. La mayoría del trabajo es **frontend puro** (JSX/Tailwind),
reutilizando datos y endpoints que ya existen.

Sin embargo, **5 funcionalidades de la Fase 5 no existen hoy** (no es restyle, es feature
nueva con backend/Supabase real) y quedan aisladas de las fases de restyle.

---

## Estrategia de rama y despliegue

- **Toda la ejecución vive en `claude/project-scope-review-xity40`** (rama de esta sesión).
  `main` (producción, desplegada en Vercel) **no se toca** hasta que el PR se apruebe y
  mergee manualmente. Esto ya aísla el trabajo de la plataforma en uso.
- El PR contra `main` queda como **borrador** durante toda la ejecución de las Fases 0–4;
  solo se marca listo para revisión cuando el usuario lo pida.
- Cada push a esta rama genera su propio preview deploy en Vercel — se puede revisar el
  avance en vivo sin afectar producción en ningún momento.
- **No se crea una segunda rama en paralelo**: el harness de esta sesión exige trabajar
  sobre la rama designada y prohíbe empujar a otra sin permiso explícito. El aislamiento
  de "no afectar lo que está en uso" ya lo da el hecho de que `main` es una rama distinta
  y nada se mergea automáticamente.

## Granularidad de commits (nuevo — reemplaza el criterio de "un PR por módulo")

En vez de un PR grande por módulo, cada módulo de la Fase 3 se parte en **sub-tareas de un
solo commit cada una** (ver desglose abajo). Regla general:

1. Un commit toca **un componente o un archivo de página**, nunca varios módulos a la vez.
2. Un commit no mezcla "agregar componente compartido" con "consumirlo en una página" —
   son dos commits distintos (el compartido se crea una vez en la Fase 2; cada consumo en
   Fase 3/4 es su propio commit).
3. Ningún commit de las Fases 0–4 toca un archivo de `src/app/api/**` (esas fases son
   frontend puro). Los commits que sí tocan backend están explícitamente marcados `[API]`
   o `[DB]` y viven solo en la Fase 5.
4. Cada commit debe dejar la app funcionando (build verde) — no se acumulan commits rotos
   para "arreglar después".

---

## Fase 0 — Preparación (sin cambios visibles) ⬜

- [ ] 0.1 Confirmar que no hace falta migrar `tailwind.config.mjs` (colores ya coinciden).
      Extender solo si se usan variantes nuevas de radio (28px en `.card` del sistema vs.
      `rounded-3xl`/`rounded-[2rem]` actuales — son casi iguales, verificar caso a caso).
      *(commit propio solo si se toca el config; si no, queda como nota de verificación)*
- [ ] 0.2 Revisar el subset de iconos Material Symbols cargado y agregar los que falten
      (ej. `partly_cloudy_day` para Meteorología). 1 commit.
- [ ] 0.3 Capturar screenshots "antes" de cada página actual (Playwright) para comparación
      QA por módulo — no se commitea al repo, queda en el scratchpad de la sesión.

---

## Fase 1 — Shell compartido: Sidebar + Header ✅ (código) ⚠️ (QA visual con roles reales pendiente)

Mismo archivo (`src/app/dashboard/layout.js`), partido en commits atómicos e independientes:

- [ ] 1.1 `[commit]` Agregar encabezados de sección uppercase al `<nav>` del sidebar
      (Operación / Flota & Equipo / Cumplimiento / Cuenta), **sin mover ni renombrar**
      ningún `href` del array `navLinks` — solo el `render` agrupa visualmente lo que ya
      filtra `filteredLinks`. Cero cambios de lógica de roles/planes.
- [ ] 1.2 `[commit]` Reemplazar el bloque "Plan/NIT" por la tarjeta de usuario al pie
      (avatar + nombre + rol) usando `data.profile` ya cargado — sin nueva query.
- [ ] 1.3 `[commit]` Agregar el widget "Plan {plan} / Mejorar" (enlace a
      `/dashboard/subscription`, oculto si el plan ya es Enterprise) — commit separado del
      1.2 porque son dos piezas visuales independientes.
- [ ] 1.4 `[commit]` Agregar input de búsqueda visual en el header (placeholder estático,
      sin `onChange` ni fetch — la función real es la tarea 5.e5).
- [x] 1.5 QA manual con los 5 roles + período de gracia (no es commit, es verificación
      antes de dar la fase por cerrada). **Verificado**: `navLinks` (href/roles/
      pilotHidden/pilotOnly) idéntico byte a byte antes/después, build+lint limpios,
      dev server arranca sin errores. **No verificado** en este entorno (sin credenciales
      Supabase): render real logueado con cada rol — pendiente de revisión visual en el
      preview deploy de Vercel de esta rama.

---

## Fase 2 — Componentes compartidos nuevos ✅

Cada componente nace en su propio commit, sin consumidores todavía (los consumos son
tareas de Fase 3/4, uno por uno):

- [x] 2.1 `[commit]` Crear `components/PageHero.js` (banner navy: overline, título,
      descripción, slot de métrica + CTA). Sin usarlo en ninguna página aún.
- [x] 2.2 `[commit]` Crear `components/KPIStrip.js` extrayendo el patrón `KPICard` que hoy
      vive inline en `DashboardClient.js` (icon, label, value, trend opcional), como
      componente reutilizable independiente. `DashboardClient.js` no cambia todavía.
- [x] 2.3 `[commit]` Definir `components/IconTile.js` (64px, radio 18px, fondo `orange-50`,
      variantes navy/solid) como componente reutilizable, sin tocar `AircraftCard`/
      `BatteryCard` aún.

---

## Fase 3 — Restyle módulo por módulo (bajo riesgo) ⬜

Cada módulo se parte en **hasta 3 commits independientes**: (a) envolver con `PageHero`,
(b) envolver con `KPIStrip`, (c) restyle de tarjetas/tabla del cuerpo. Si un módulo no
tiene KPIs o tarjetas propias, esa sub-tarea se omite (⏭️). Ningún commit de esta fase
toca queries, endpoints ni validaciones — solo JSX/Tailwind.

- [x] 3.1 Dashboard (home) — `DashboardClient.js` ✅
  - [x] 3.1a Migrar el header actual a `PageHero`
  - [x] 3.1b Reemplazar el bloque de `KPICard` inline por `KPIStrip`
- [x] 3.2 Mi Flota — `dashboard/fleet/page.js` ✅
  - [x] 3.2a `PageHero`
  - [x] 3.2b `KPIStrip`
  - [x] 3.2c Restyle de `AircraftCard` — icon-tile como elemento principal + foto real como
        miniatura secundaria (decisión confirmada con el usuario: opción híbrida)
- [x] 3.3 Bitácora — `dashboard/logbook/` ✅
  - [x] 3.3a `PageHero` + `KPIStrip` (vuelos, horas, este mes, sin piloto asignado)
  - [x] 3.3b Restyle de la tabla de vuelos (badges de condición semánticos + tabular-nums)
- [x] 3.4 Tripulación — `dashboard/pilots/` ✅
  - [x] 3.4a `PageHero` + `KPIStrip` (tripulantes, con licencia, cert. por vencer, expediente completo)
  - [x] 3.4b Restyle del roster: avatar de iniciales en naranja (mobile + desktop)
- [x] 3.5 Mantenimiento — `dashboard/maintenance/` ✅
  - [x] 3.5a `PageHero` + `KPIStrip` (intervenciones, preventivas, correctivas, este mes)
  - [x] 3.5b Restyle: badge de tipo unificado a pill redondeado
- [x] 3.6 Seguridad SMS / SORA — `dashboard/safety/`, `dashboard/sora/` ✅
  - [x] 3.6a `PageHero` en el hub de Seguridad Operacional
  - [x] 3.6b `PageHero` en SORA (KPIs propios con color semántico conservados)
- [x] 3.7 Reportes — `dashboard/reports/` ✅ `PageHero`
- [x] 3.8 Protocolos (Editor de Protocolos) — `dashboard/settings/forms/` ✅ `PageHero`
- [x] 3.9 Mi Perfil — `dashboard/settings/profile/` ✅ `PageHero` (rol como métrica)
- [x] 3.10 Organización — `dashboard/settings/` ✅ `PageHero`
- [x] 3.11 Suscripción — `dashboard/subscription/page.js` ✅ `PageHero`
- [x] 3.12 Programación (Autorización de Vuelo) — `dashboard/authorizations/` ✅ `PageHero`

Checklist QA por módulo (antes de marcar el módulo completo, no por cada sub-commit):
la página carga, filtros/búsqueda existentes siguen funcionando, crear/editar/eliminar
sigue funcionando, responsive mobile no se rompe (bottom nav).

---

## Fase 4 — Nuevas rutas de primer nivel (extracción, sin lógica nueva) ✅ (con 1 pendiente)

- [x] 4.1 Crear la página `/dashboard/batteries` (PageHero + KPIStrip + BatteryCard +
      paneles Add/Edit), reutilizando la misma consulta directa a `batteries` que usa Flota.
- [x] 4.2 "Aeronave asignada" derivada del `battery_logs` más reciente por serial —
      resuelto **client-side** (consulta directa a `battery_logs`), sin endpoint nuevo ni
      cambio de esquema. Más simple y menos invasivo que el plan original de tocar la API.
- [x] 4.4 Crear la página `/dashboard/weather` reutilizando `WeatherWidget` y
      `/api/weather/current`, con geolocalización del navegador (fallback Bogotá).
- [x] 4.5 Ítems "Baterías" y "Meteorología" agregados al sidebar.
- [ ] 4.3 ⏸️ **Pendiente de QA visual**: quitar la sección de Baterías embebida de
      `/dashboard/fleet`. No ejecutado aún porque no se puede validar visualmente en este
      entorno (sin credenciales Supabase) y romper Flota sin verla sería riesgoso. La
      duplicación temporal (Flota + ruta propia) no rompe nada. Ejecutar tras revisar el
      preview de Vercel.

---

## Fase 5 — Funcionalidades nuevas (alcance confirmado: a–e, f fuera) ✅ (a/d requieren migración)

Cada ítem es su propio mini-proyecto, con sus propios commits `[API]`/`[DB]` separados del
commit de frontend que lo consume. No se mezclan entre sí.

### a) Auditoría real (registro de acciones) ✅ (⏳ requiere aplicar migración)
- [x] 5.a1 `[DB]` Migración `20260702_audit_log.sql` (tabla + RLS: managers leen su org,
      solo service role escribe). **Archivo creado, NO aplicado a producción.**
- [x] 5.a2 `[API]` `lib/auditLog.js` (`logAudit()` fire-and-forget, nunca lanza).
- [x] 5.a3 `[API]` Instrumentado `create` en fleet, pilots y flights/authorize (guardado).
      Resto de módulos/acciones se pueden añadir después con el mismo patrón.
- [x] 5.a4 `[API]` `GET /api/audit-log` (+ CSV), degrada a vacío si la tabla falta.
- [x] 5.a5 `[frontend]` Pestaña "Registro de acciones" que **convive** con el panel de
      cumplimiento (decisión por defecto — no destructiva). Migrado a PageHero.
- **Activación**: aplicar `20260702_audit_log.sql` en Supabase. Hasta entonces, la pestaña
  muestra un aviso de "migración pendiente" y logAudit falla en silencio (cero impacto).

### b) Conflictos de horario en "Nueva Misión" ✅
- [x] 5.b1 `[API]` `GET /api/flights/conflicts` + aviso no bloqueante en `POST authorize`.
- [x] 5.b2 `[frontend]` Aviso en vivo en `BasicForm` (debounce) al elegir PIC/horario.

### c) Vista calendario (semana) en Programación ✅
- [x] 5.c1 `[frontend]` Toggle Lista/Semana + grilla semanal (7 días, navegación de semana)
      en `ProgramacionActivaClient`, leyendo `flight_authorizations`. Vista Lista y vista
      del piloto intactas.
- [ ] 5.c2 Pestaña "Mes" — omitida por ahora (la vista Semana + Lista cubren el caso
      principal; se puede agregar después si se pide).

### d) Historial de facturación en Suscripción ✅ (⏳ requiere aplicar migración)
- [x] 5.d0 Decisión por defecto (por falla de la herramienta de preguntas): **comprobante
      informativo**, sin validez fiscal DIAN. Revisar si se necesita factura electrónica real.
- [x] 5.d1 `[DB]` Migración `20260702_billing_history.sql` (tabla + RLS: cada usuario ve lo
      suyo). **Archivo creado, NO aplicado a producción.**
- [x] 5.d2 `[API]` Webhook ePayco registra cada pago (fire-and-forget, idempotente por
      `ref_payco`, mismo patrón guardado que `attributeCommission` — nunca rompe activación).
- [x] 5.d4 `[frontend]` Sección "Historial de facturación" en `/dashboard/subscription`
      (oculta si no hay pagos / tabla ausente).
- [ ] 5.d3 PDF de comprobante — omitido por ahora (la tabla + listado cubren el caso; el
      PDF se puede añadir después reutilizando el patrón de PDFs existente).
- **Activación**: aplicar `20260702_billing_history.sql` en Supabase.

### e) Búsqueda global en el header — ~1 día
- [ ] 5.e1 `[API]` Endpoint `GET /api/search?q=` (`ilike` sobre `flights`/`aircraft`/
      `pilots`, acotado a `organization_id` vía `getOrgContext()`).
- [ ] 5.e2 `[frontend]` Conectar el input de búsqueda de la tarea 1.4 a este endpoint
      (dropdown de resultados).

### f) "Mapas de restricción" en Seguridad SMS — ⏭️ FUERA DE ALCANCE (confirmado)
No existe ninguna funcionalidad de geofencing hoy; alcance indefinido (¿zonas propias del
operador, restricciones oficiales AeroCivil, o ambas? ¿cruce con `FlightPlanner.js`?).
Se deja fuera de este proyecto hasta tener definición de producto.

---

## Fase 6 — Landing pages y assets de marca (opcional, fuera del dashboard) ⬜

El bundle también trae 10 landing pages nuevas y piezas de marca (Certificado DJI,
Cotización Oficial, Hoja Membretada, Plantilla de Cursos). Vive en `src/app/page.js` y
material de marketing, no en el dashboard operativo. No entra en la ejecución salvo que se
pida explícitamente — es un proyecto independiente con su propio alcance.

---

## Tabla resumen — ¿qué requiere qué?

| Cambio | Frontend | Backend/API | Supabase (schema) | Cloudflare R2 |
|---|---|---|---|---|
| Sidebar agrupado + widgets (F1) | ✅ | – | – | – |
| PageHero + KPIStrip (F2) | ✅ | – | – | – |
| Restyle cards/tablas por módulo (F3) | ✅ | – | – | – |
| Baterías como ruta propia (F4) | ✅ | ✅ query derivada | – | – |
| Meteorología standalone (F4) | ✅ | reutiliza existente | – | – |
| Auditoría real (F5.a) | ✅ | ✅ | ✅ tabla nueva + RLS | – |
| Conflictos de horario (F5.b) | ✅ | ✅ | – | – |
| Calendario Programación (F5.c) | ✅ | – | – | – |
| Historial de facturación (F5.d) | ✅ | ✅ | ✅ tabla nueva | posible (PDFs) |
| Búsqueda global (F5.e) | ✅ | ✅ endpoint nuevo | – | – |
| Mapas de restricción (F5.f) | ⏭️ fuera de alcance | – | – | – |
| Landing pages (F6) | ✅ | – | – | – |

**Nada de esto requiere cambios en Cloudflare** salvo si se decide generar/almacenar PDFs
de comprobante (5.d), reutilizando el patrón existente de `maintenance-docs`/`company-manuals`.

---

## Auditoría de implementación (2026-07-02) ✅

Auditoría completa post-implementación. Verificado:
- **Cableado**: PageHero (16 consumidores), KPIStrip (6), IconTile (1), GlobalSearch (1),
  logAudit (3 rutas API); los 4 endpoints nuevos tienen consumidor. Cero piezas huérfanas.
- **Build + lint**: verdes en los 39 commits.
- **Permisos**: `/api/audit-log` usa `canViewAudit`, igual que el guard server-side ya
  existente de `/dashboard/audit` (`requirePermission`). Consistente.
- **3 defectos encontrados y corregidos** (commit `fix(audit)`):
  1. Conflictos 5.b comparaban ±2h pero `scheduled_at` guarda solo fecha → cambiado a
     comparación por día calendario (la única granularidad real).
  2. Búsqueda 5.e: término con comas/paréntesis rompía la sintaxis `.or()` de PostgREST →
     sanitizado.
  3. Migración `audit_log` dependía de `private.user_is_manager()` (no versionada en el
     repo, existencia no garantizable) → chequeo de rol inline contra `profiles`.
- **No verificable desde este entorno** (sin credenciales Supabase): render logueado por
  rol, RLS efectiva de `battery_logs` para el join de "aeronave asignada" (si RLS lo
  bloquea, la página de Baterías degrada con gracia: muestra las baterías sin la
  aeronave), y el disparo real del webhook. Cubrir en el QA del preview de Vercel.

## Pendientes de activación (acciones del usuario, fuera de esta sesión)

1. **Crear la rama en GitHub**: `claude/project-scope-review-xity40` no existe en el remoto
   y ni el proxy git ni el MCP pueden crearla (403). Crear la rama desde `main` (web o
   `git push origin main:refs/heads/claude/project-scope-review-xity40`) para desbloquear
   el push de todos los commits.
2. **Aplicar migraciones en Supabase** (aditivas, no rompen nada existente) para activar la
   Fase 5.a y 5.d:
   - `supabase/migrations/20260702_audit_log.sql`
   - `supabase/migrations/20260702_billing_history.sql`
3. **QA visual en el preview de Vercel** con cuentas reales de cada rol (no se pudo hacer
   aquí sin credenciales Supabase). En particular:
   - Sidebar agrupado con los 5 roles + período de gracia.
   - Fase 4.3: si Baterías standalone se ve bien, quitar la sección embebida de
     `/dashboard/fleet` (hoy conviven).
4. **Revisar decisiones tomadas por defecto** (la herramienta de preguntas falló):
   Auditoría convive como pestaña (no reemplaza); facturación es comprobante informativo
   (no fiscal). Cambiar si se requiere otra cosa.
5. Fase 6 (landing pages) queda pendiente de decisión aparte.
