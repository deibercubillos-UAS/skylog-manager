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

## Fase 2 — Componentes compartidos nuevos ⬜

Cada componente nace en su propio commit, sin consumidores todavía (los consumos son
tareas de Fase 3/4, uno por uno):

- [ ] 2.1 `[commit]` Crear `components/PageHero.js` (banner navy: overline, título,
      descripción, slot de métrica + CTA). Sin usarlo en ninguna página aún.
- [ ] 2.2 `[commit]` Crear `components/KPIStrip.js` extrayendo el patrón `KPICard` que hoy
      vive inline en `DashboardClient.js` (icon, label, value, trend opcional), como
      componente reutilizable independiente. `DashboardClient.js` no cambia todavía.
- [ ] 2.3 `[commit]` Definir la variante `icon-tile` (64px, radio 18px, fondo `orange-50`)
      como clase/utilidad reutilizable, sin tocar `AircraftCard`/`BatteryCard` aún.

---

## Fase 3 — Restyle módulo por módulo (bajo riesgo) ⬜

Cada módulo se parte en **hasta 3 commits independientes**: (a) envolver con `PageHero`,
(b) envolver con `KPIStrip`, (c) restyle de tarjetas/tabla del cuerpo. Si un módulo no
tiene KPIs o tarjetas propias, esa sub-tarea se omite (⏭️). Ningún commit de esta fase
toca queries, endpoints ni validaciones — solo JSX/Tailwind.

- [ ] 3.1 Dashboard (home) — `DashboardClient.js`
  - [ ] 3.1a Migrar el header actual a `PageHero`
  - [ ] 3.1b Reemplazar el bloque de `KPICard` inline por `KPIStrip`
- [ ] 3.2 Mi Flota — `dashboard/fleet/page.js`
  - [ ] 3.2a `PageHero`
  - [ ] 3.2b `KPIStrip`
  - [ ] 3.2c Restyle de `AircraftCard` (icon-tile, radios, badges)
- [ ] 3.3 Bitácora — `dashboard/logbook/`
  - [ ] 3.3a `PageHero`
  - [ ] 3.3b `KPIStrip`
  - [ ] 3.3c Restyle de la tabla de vuelos
- [ ] 3.4 Tripulación — `dashboard/pilots/`
  - [ ] 3.4a `PageHero` + `KPIStrip`
  - [ ] 3.4b Restyle de tarjetas de piloto
- [ ] 3.5 Mantenimiento — `dashboard/maintenance/`
  - [ ] 3.5a `PageHero` + `KPIStrip`
  - [ ] 3.5b Restyle de la tabla de mantenimiento
- [ ] 3.6 Seguridad SMS / SORA / VOR-MOR — `dashboard/safety/`, `dashboard/sora/`
  - [ ] 3.6a `PageHero` + `KPIStrip` (Seguridad SMS)
  - [ ] 3.6b Restyle de tabla SORA
- [ ] 3.7 Reportes — `dashboard/reports/`
  - [ ] 3.7a `PageHero`
  - [ ] 3.7b Restyle de tarjetas de formato (F-OPS-002, F-MNT-003, F-HUM-005)
- [ ] 3.8 Protocolos (Listas de Chequeo) — `dashboard/settings/forms/`
  - [ ] 3.8a `PageHero`
  - [ ] 3.8b Restyle de tarjetas de protocolo
- [ ] 3.9 Mi Perfil — `dashboard/settings/profile/`
  - [ ] 3.9a `PageHero` (tarjeta "Mi cuenta" navy)
- [ ] 3.10 Organización — `dashboard/settings/`
  - [ ] 3.10a `PageHero`
- [ ] 3.11 Suscripción (solo visual — sin historial de facturación, eso es 5.d) —
      `dashboard/subscription/page.js`
  - [ ] 3.11a `PageHero`
- [ ] 3.12 Programación (vista lista actual, restyle únicamente — el calendario semanal
      es 5.c) — `dashboard/authorizations/`
  - [ ] 3.12a `PageHero` + `KPIStrip`

Checklist QA por módulo (antes de marcar el módulo completo, no por cada sub-commit):
la página carga, filtros/búsqueda existentes siguen funcionando, crear/editar/eliminar
sigue funcionando, responsive mobile no se rompe (bottom nav).

---

## Fase 4 — Nuevas rutas de primer nivel (extracción, sin lógica nueva) ⬜

- [ ] 4.1 `[commit]` Crear la página `/dashboard/batteries` con el layout de tabla del
      mockup, reutilizando el mismo `GET` de baterías que hoy consume `/dashboard/fleet`
      (sin cambios de API todavía).
- [ ] 4.2 `[commit]` `[API]` Extender el `GET` de baterías para incluir, por batería, la
      aeronave del `battery_logs` más reciente (subquery/`DISTINCT ON`) — columna
      "Aeronave asignada". Commit separado del 4.1 porque toca `src/app/api/**`.
- [ ] 4.3 `[commit]` Quitar la sección de Baterías embebida de `/dashboard/fleet` y agregar
      el ítem "Baterías" al sidebar (Fase 1) apuntando a la nueva ruta.
- [ ] 4.4 `[commit]` Crear la página `/dashboard/weather` reutilizando `WeatherWidget` y
      `/api/weather/current` existentes (sin backend nuevo).
- [ ] 4.5 `[commit]` Agregar el ítem "Meteorología" al sidebar apuntando a la nueva ruta.

---

## Fase 5 — Funcionalidades nuevas (alcance confirmado: a–e, f fuera) ⚠️

Cada ítem es su propio mini-proyecto, con sus propios commits `[API]`/`[DB]` separados del
commit de frontend que lo consume. No se mezclan entre sí.

### a) Auditoría real (registro de acciones) — mayor esfuerzo, ~3-5 días
La página actual `/dashboard/audit` es un dashboard de cumplimiento (aeronavegabilidad +
vigencia de documentos), no un log de acciones — no hay tabla `audit_log` hoy.
- [ ] 5.a1 `[DB]` Migración: tabla `audit_log` (`organization_id`, `actor_id`, `action`,
      `module`, `metadata jsonb`, `created_at`) + RLS (solo managers leen).
- [ ] 5.a2 `[API]` Helper centralizado `lib/auditLog.js` (`logAudit()`).
- [ ] 5.a3 `[API]` Instrumentar `logAudit()` en un módulo a la vez (fleet → pilots →
      flights → maintenance → protocolos), **un commit por módulo instrumentado**.
- [ ] 5.a4 `[API]` Endpoint `GET /api/audit-log` + export CSV.
- [ ] 5.a5 `[frontend]` Nueva pestaña/tabla en `/dashboard/audit` (convive con el
      dashboard de cumplimiento actual, no lo reemplaza — a confirmar con el usuario antes
      de este commit).
- ⚠️ Decisión pendiente antes de 5.a5: ¿reemplaza la vista actual o convive como pestaña?

### b) Conflictos de horario en "Nueva Misión" — ~0.5-1 día
- [ ] 5.b1 `[API]` Query de solape por `pic_id`/fecha/hora en `POST /api/flights/authorize`.
- [ ] 5.b2 `[frontend]` Aviso en vivo en el formulario de Nueva Misión al seleccionar
      piloto/horario en conflicto.

### c) Vista calendario (semana/mes) en Programación — ~1-2 días, solo frontend
- [ ] 5.c1 `[frontend]` Componente de grilla semanal (pestaña "Semana") leyendo
      `flight_authorizations` ya existente.
- [ ] 5.c2 `[frontend]` Pestaña "Mes" (agrupación mensual del mismo dato).
- [ ] 5.c3 `[frontend]` Pestaña "Lista" = vista actual restyleada (ya cubierta en 3.12).

### d) Historial de facturación en Suscripción — ⚠️ decisión legal/fiscal pendiente
- [ ] 5.d0 ⚠️ Definir con el usuario: ¿comprobante informativo o factura con validez
      fiscal (DIAN)? Bloquea el resto de esta sub-fase.
- [ ] 5.d1 `[DB]` Migración: tabla `billing_history` (`ref_payco`, `user_id`, `amount`,
      `status`, `created_at`).
- [ ] 5.d2 `[API]` Registrar cada pago exitoso desde el webhook de ePayco.
- [ ] 5.d3 `[API]` Endpoint de listado + generación de comprobante PDF (reutiliza el
      patrón de generación de PDFs ya existente en el proyecto).
- [ ] 5.d4 `[frontend]` Tabla de historial en `/dashboard/subscription`.

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

## Próximos pasos

1. Arrancar Fase 0 → Fase 1, commit por commit, cada uno con su propio deploy preview.
2. Antes de 5.a5: confirmar si Auditoría real reemplaza o convive con la vista de
   cumplimiento actual.
3. Antes de 5.d1: confirmar si el historial de facturación es comprobante informativo o
   factura fiscal real.
4. Fase 6 (landing pages) queda pendiente de decisión aparte.
