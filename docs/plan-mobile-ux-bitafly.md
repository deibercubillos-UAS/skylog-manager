# Plan de Auditoría y Mejora Visual en Celular — BitaFly

## Objetivo

Revisar **todo el frontend en tamaño de celular** (375-430px de ancho, el rango real de
iPhone SE hasta iPhone Pro Max / Android estándar), módulo por módulo, pestaña por
pestaña, y dejar un plan ejecutable en fases para corregir lo que no se vea organizado,
simétrico o cómodo de usar con el dedo — sin rediseñar de cero lo que ya funciona bien.

**Cómo se ejecuta este documento**: cada fase es independiente y verificable por
separado. No se avanza a la siguiente fase hasta que el usuario lo pida explícitamente
("sigue con la Fase X"). Cada fase termina con `next lint` + `npm run build` limpios y
una nota de qué se cambió, siguiendo la misma convención de los demás `docs/plan-*.md`
del proyecto.

**Estado de cada fase**: `[ ] Pendiente` · `[~] En progreso` · `[x] Hecha`

---

## Criterios de revisión (aplican a cada pantalla, en las 3 fases del viewport 375 / 390 / 430px)

1. **Simetría y alineación**: márgenes/paddings consistentes a los lados, tarjetas y
   grids que no queden "cojos" (un elemento suelto al final de una fila de 2 o 3).
2. **Tamaño de campos e inputs**: nada de inputs/selects que se salgan del viewport o
   queden angostos al punto de no poder leer lo que se escribe; altura táctil mínima
   cómoda (objetivo ~44px, estándar de accesibilidad táctil).
3. **Grids responsivos de verdad**: todo `grid-cols-N` con N≥3 debe colapsar a 1 o 2
   columnas en móvil (`grid-cols-1 sm:grid-cols-2 ...`), nunca forzar 3+ columnas en una
   pantalla angosta.
4. **Tablas**: todas envueltas en un contenedor con `overflow-x-auto` propio (nunca que
   el scroll horizontal se lo coma toda la página), o con una vista de tarjetas
   alternativa en móvil donde ya exista ese patrón (varias páginas ya lo hacen).
5. **Paneles/modales deslizables** (`Add*Panel`/`Edit*Panel`): que ocupen el ancho
   completo en móvil (no un modal centrado angosto), con footer de acciones fijo
   (sticky) y scroll interno del contenido, no de toda la página.
6. **Tipografía**: nada por debajo de ~11px real en texto que el usuario deba leer
   (las etiquetas `text-[9px]`/`text-[10px]` ya usadas en varias páginas están al
   límite — revisar caso por caso, no es un fallo automático).
7. **Jerarquía visual clara**: un solo elemento "principal" por pantalla (evitar que
   compitan 3 botones del mismo peso visual), acciones secundarias con menos énfasis.
8. **KPIStrip / franjas de métricas**: que las 4 métricas típicas colapsen a 2x2 en
   móvil, nunca 4 en una fila apretada.

---

## Hallazgos generales ya detectados (grep inicial, antes de entrar página por página)

Esto ya da una idea real de dónde está el trabajo — se verifica y corrige en la fase
correspondiente, no aquí:

- **Grids sin breakpoint responsive** (`grid-cols-3` o más, sin `sm:`/`md:` que los
  reduzca) encontrados en: `dashboard/settings/page.js`, `PilotDashboard.js`,
  `settings/forms/FormSettingsClient.js`, `safety-config/page.js`,
  `programacion-activa/ProgramacionActivaClient.js`, `suppliers/SuppliersClient.js`,
  `sms/page.js`, `select-plan/page.js`, `training/TrainingClient.js`,
  `logbook/new/page.js`, `pilots/page.js`, `vor-mor/page.js`,
  `logbook/inventory/page.js`, `sora/page.js` (+ algunos `loading.js` skeleton, menor
  prioridad).
- **Tablas sin `overflow-x-auto` propio**: `PilotDashboard.js`, `safety/mapas/page.js`,
  `safety/page.js`, `components/authorizations/AerocivilForm.js`,
  `components/safety/IndicatorDetailPanel.js`.
- **Paneles con ancho fijo en px** (candidatos a revisar en móvil):
  `AddAircraftPanel.js`, `AddMaintenancePanel.js`, `AddBatteryPanel.js`,
  `AddPilotPanel.js`, `AddProtocolPanel.js`, `EditPilotPanel.js`.
- **Flujos "kiosko" de pantalla completa** (`fixed inset-0`, su propio header/footer,
  fuera del layout normal del dashboard): Despacho (`logbook/new`), Cierre de Vuelo
  (`logbook/finalize`) — estos ya están pensados para móvil desde su diseño original,
  pero no se han auditado formalmente contra los criterios de arriba.

---

## Fase 0 — Fundamentos y componentes compartidos (la más apalancada, primero)

Arreglar esto beneficia automáticamente a casi todas las páginas de las fases
siguientes — por eso va primero.

- [ ] `components/PageHero.js` — hero de cabecera de página, usado en ~15 páginas.
- [ ] `components/KPIStrip.js` (+ variante `strip`) — franja de métricas, usada en
      ~12 páginas.
- [ ] `components/IconTile.js`
- [ ] Patrón de panel deslizable: revisar 1-2 casos representativos
      (`AddAircraftPanel.js`, `AddPilotPanel.js`) y definir el estándar (ancho completo
      en móvil, footer sticky, scroll interno) para replicar en el resto de `Add*Panel`/
      `Edit*Panel` en sus fases correspondientes — no se tocan todos aquí, solo se fija
      el patrón.
- [ ] `components/Sidebar.js` / `dashboard/layout.js` — header superior, barra de
      navegación inferior móvil, popover de cuenta.
- [ ] `components/NotificationBell.js`, `components/GlobalSearch.js` — que no rompan el
      header en pantallas angostas.
- [ ] Confirmar `overflow-x-auto` en las 5 tablas sueltas detectadas arriba.

---

## Fase 1 — Operación

Dividida en 2 partes por volumen de páginas (a pedido del usuario) — cada una se
ejecuta, verifica y fusiona por separado.

### Fase 1a — Vuelo del día a día ✅ hecha (2026-07-25)

- [x] `dashboard/page.js` + `PilotDashboard.js` — ya estaban bien resueltos para móvil
      (grids con breakpoint, KPIs 2x2), sin cambios.
- [x] `dashboard/logbook/page.js` — ya tenía vista de tarjetas para móvil (separada de la
      tabla de escritorio); el hallazgo real fue la **barra de filtros** (fecha, modelo,
      tipo, condición, piloto, limpiar): en `flex flex-wrap` sin ancho definido, quedaba
      dispareja en celular. Corregido a `grid grid-cols-2` en móvil (`sm:flex` de vuelta
      en desktop) para que los 6 controles queden simétricos.
- [x] `dashboard/logbook/new/page.js` (Despacho) — ya diseñado mobile-first desde antes
      (flujo kiosko de pantalla completa), sin cambios.
- [x] `dashboard/logbook/finalize/page.js` (Cierre de Vuelo) — mismo caso, ya mobile-first.
- [x] `dashboard/logbook/daily`, `/batteries`, `/inventory`, `/pilots` — **huérfanas**:
      ningún lugar de la app enlaza a estas 4 rutas (verificado por grep), y `daily`
      tiene código a medio terminar (comentario "el resto del formulario continúa
      aquí..."). No se les invirtió tiempo de diseño móvil por no ser alcanzables desde
      la navegación real — si en algún momento se quiere retomarlas o borrarlas, es una
      decisión aparte, no de esta auditoría.

### Fase 1b — Programación y planeación ✅ hecha (2026-07-25, sin cambios de código)

Revisada a fondo — a diferencia de la Fase 1a, no se encontró nada real que corregir.
El calendario semanal (`ProgramacionActivaClient.js`, usado por Programación,
Programación Activa y Mis Vuelos) ya colapsa correctamente de grilla 7 columnas a lista
apilada de 1 columna en móvil (`grid-cols-1 sm:grid-cols-7`), con el mismo patrón
tarjetas-móvil/tabla-escritorio ya visto en Bitácora. Los selectores de 3 botones (tipo
de zona en `BasicForm.js`/`FlightPlanner.js`, línea de vista) son compactos pero
legibles — no se tocan, no son "campos demasiado grandes". `MissionFormPanel.js` ya
sigue el mismo patrón de hoja deslizable completa establecido en la Fase 0. Los grids de
`weather/page.js` ya tienen breakpoints (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`,
`grid-cols-4 sm:grid-cols-8`).

- [x] `dashboard/authorizations/page.js` (Programación — calendario + `MissionFormPanel`)
- [x] `dashboard/programacion-activa/page.js` (`ProgramacionActivaClient.js`)
- [x] `dashboard/mis-vuelos/page.js`
- [x] `dashboard/weather/page.js` (+ `WeatherWidget.js`)
- [x] `dashboard/plan-vuelo/page.js` (`FlightPlanner.js` — mapa + formulario)

---

## Fase 2 — Flota & Equipo

- [ ] `dashboard/fleet/page.js` (+ `AircraftCard.js`, `AddAircraftPanel.js`,
      `EditAircraftPanel.js`)
- [ ] `dashboard/batteries/page.js` (+ `AddBatteryPanel.js`, `EditBatteryPanel.js`)
- [ ] `dashboard/maintenance/page.js` (+ `AddMaintenancePanel.js`,
      `MinorMaintenancePanel.js` — tabla de intervenciones + sección Mtto. Menor)
- [ ] `dashboard/inventory-checklist/page.js`
      (`InventoryChecklistClient.js` — existencias + checklist)
- [ ] `dashboard/pilots/page.js` (Tripulación — tarjetas de piloto, `AddPilotPanel.js`,
      `EditPilotPanel.js`)

---

## Fase 3 — Documentación / Cumplimiento

- [ ] `dashboard/safety/page.js` — hub con **9 pestañas** (SORA, Evaluación de Riesgos,
      Indicadores SPI, Mejora Continua, Acciones Correctivas, Reportes de Seg.
      Operacional, Barreras, Mapas, Capacitación SMS) — revisar cada pestaña, no solo el
      contenedor.
- [ ] `dashboard/safety/case/[id]/page.js`, `dashboard/safety/mapas/page.js`
- [ ] `dashboard/safety-config/page.js` (matriz de riesgo, editor)
- [ ] `dashboard/sora/page.js` (+ `SoraWizard.js`, varios pasos)
- [ ] `dashboard/audit/page.js` (tabs Cumplimiento / Registro de acciones)
- [ ] `dashboard/reports/page.js` (grilla agrupada + panel de descarga — ya rediseñado
      recientemente, verificar solo el comportamiento en móvil del panel inline nuevo)
- [ ] `dashboard/settings/forms/page.js` (Protocolos — `FormSettingsClient.js`, 4 grupos)
- [ ] `dashboard/suppliers/page.js` (`SuppliersClient.js`)
- [ ] `dashboard/training/page.js` (3 pestañas) + `dashboard/training/exam/page.js`
- [ ] `dashboard/manuales/page.js`
- [ ] `dashboard/sms/page.js`, `dashboard/vor-mor/page.js` (2 pestañas)
- [ ] `dashboard/manual-operaciones/page.js`

---

## Fase 4 — Cuenta y organización

- [ ] `dashboard/settings/page.js` (Organización — hero + Inicio Rápido + 2 columnas)
- [ ] `dashboard/settings/profile/page.js` (Mi Perfil)
- [ ] `dashboard/subscription/page.js` + `/manage` + `/response`
- [ ] `dashboard/select-plan/page.js`
- [ ] `dashboard/users/page.js`

---

## Fase 5 — Master, Socio y Autenticación (fuera del layout normal del dashboard)

- [ ] `admin/master/page.js` (todas sus pestañas: Usuarios, Socios, Comisiones,
      Invitaciones, Releases, Suscripciones ePayco — panel administrativo, uso
      probablemente poco frecuente en celular pero debe ser usable)
- [ ] `socio/page.js` (tabs Panel / Reportes / Perfil)
- [ ] `login/page.js`, `registro/page.js` (formulario largo con varios pasos),
      `reset-password/page.js`, `update-password/page.js`
- [ ] `dashboard/records/[templateId]/page.js`

---

## Fase 6 — QA final cruzado

- [ ] Recorrido completo en 3 anchos de viewport (375 / 390 / 430px) de los flujos más
      usados de punta a punta: Despacho completo, crear una misión en Programación,
      registrar mantenimiento, ver un reporte.
- [ ] Verificar que ningún cambio de fase anterior rompió el layout de escritorio
      (regresión — todas las páginas ya están rediseñadas para desktop, este plan no
      debe tocar esa experiencia).
- [ ] Actualizar `CLAUDE.md` con un resumen de qué se estandarizó (breakpoints,
      patrón de panel móvil, patrón de tabla) para que quede documentado como el resto
      del sistema de diseño del proyecto.

---

## Próximo paso

Esperando indicación del usuario sobre con qué fase empezar (recomendado: Fase 0, por
ser la de mayor apalancamiento).
