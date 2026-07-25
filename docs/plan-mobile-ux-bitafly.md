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

## Fase 2 — Flota & Equipo ✅ hecha (2026-07-25)

Mismo hallazgo que en Bitácora (Fase 1a), repetido en **4 páginas más**: la barra de
filtros (`flex flex-wrap` sin ancho por control) quedaba dispareja en celular. Corregida
en las 4 al mismo patrón (`grid grid-cols-2` en móvil, `sm:flex sm:flex-wrap` de vuelta
en desktop) — en Mantenimiento (3 filtros, cantidad impar) el tercero ocupa el ancho
completo de su fila en móvil en vez de quedar suelto a la izquierda. Las tarjetas
(Flota, Tripulación), la tabla de Baterías (con scroll horizontal intencional — decisión
de diseño ya documentada en `CLAUDE.md`, no una tabla rota) y la tabla de Mantenimiento
(con su propia vista de tarjetas en móvil) ya estaban bien resueltas, sin cambios.

- [x] `dashboard/fleet/page.js` (+ `AircraftCard.js`, `AddAircraftPanel.js`,
      `EditAircraftPanel.js`) — filtros corregidos; tarjetas y panel ya estaban bien.
- [x] `dashboard/batteries/page.js` (+ `AddBatteryPanel.js`, `EditBatteryPanel.js`) —
      filtros corregidos; tabla con scroll horizontal es diseño intencional, sin cambios.
- [x] `dashboard/maintenance/page.js` (+ `AddMaintenancePanel.js`,
      `MinorMaintenancePanel.js`) — filtros corregidos (3, cantidad impar); tabla/tarjetas
      ya bien resueltas.
- [x] `dashboard/inventory-checklist/page.js`
      (`InventoryChecklistClient.js` — existencias + checklist) — sin hallazgos, ya
      responsivo.
- [x] `dashboard/pilots/page.js` (Tripulación — tarjetas de piloto, `AddPilotPanel.js`,
      `EditPilotPanel.js`) — filtros corregidos; grid de tarjetas ya responsivo.

---

## Fase 3 — Documentación / Cumplimiento

~8,200 líneas en 19 archivos — bastante más grande que las fases anteriores. Dividida en
3 partes por tema (mismo criterio que la Fase 1), cada una ejecutada, verificada y
fusionada por separado.

### Fase 3a — Seguridad SMS y SORA ✅ hecha (2026-07-25, sin cambios de código)

Revisada a fondo — igual que la Fase 1b, no se encontró nada real que corregir. Los
chips/pills de filtro (tipo de caso, dimensión UA, etc.) ya usan `flex flex-wrap`
correctamente (a diferencia de los `<select>` de las Fases 1a/2, que sí tenían el
problema de simetría). La tabla de SORA y la matriz de riesgo de
`safety-config`/`RiskMatrixEditor.js` ya tienen su wrapper `overflow-x-auto` o su vista
de tarjetas móvil. Los resultados en 3 columnas de `SoraWizard.js` (GRC intrínseco/Δ
mitigaciones/GRC final) se dejaron intactos — es una comparación a la vista, no un
formulario, y colapsarla a 1 columna perdería el sentido de comparación.

- [x] `dashboard/safety/page.js` — hub con **9 pestañas** (SORA, Evaluación de Riesgos,
      Indicadores SPI, Mejora Continua, Acciones Correctivas, Reportes de Seg.
      Operacional, Barreras, Mapas, Capacitación SMS).
- [x] `dashboard/safety/case/[id]/page.js`, `dashboard/safety/mapas/page.js` (esta última
      ya había recibido el fix de scroll de tabla en la Fase 0).
- [x] `dashboard/safety-config/page.js` (matriz de riesgo, editor).
- [x] `dashboard/sora/page.js` (+ `components/sora/SoraWizard.js`, varios pasos).

### Fase 3b — Auditoría, Reportes y Protocolos ✅ hecha (2026-07-25)

Mismo hallazgo de simetría de filtros (Fases 1a/2) una vez más: Auditoría tenía 3
`<select>` en `flex flex-wrap` sin ancho definido — corregido al mismo patrón de grilla
2 columnas en móvil (el filtro impar de los 3 ocupa la fila completa). Reportes ya
estaba resuelto (los controles de "Periodo"/"Programa" ahí son chips/pills, no
selects — el patrón `flex-wrap` es correcto para esos). Protocolos
(`FormSettingsClient.js`) ya sigue el mismo patrón de panel deslizable de la Fase 0, sin
hallazgos.

- [x] `dashboard/audit/page.js` (tabs Cumplimiento / Registro de acciones) — filtros
      corregidos.
- [x] `dashboard/reports/page.js` (grilla agrupada + panel de descarga) — sin hallazgos,
      ya bien resuelto.
- [x] `dashboard/settings/forms/page.js` (Protocolos — `FormSettingsClient.js`, 4 grupos)
      — sin hallazgos, ya bien resuelto.

### Fase 3c — Proveedores, Capacitación, Manuales, SMS/VOR-MOR ✅ hecha (2026-07-25)

Hallazgo real, distinto a los anteriores: el panel de gestión de un reporte VOR/MOR
(`dashboard/vor-mor/page.js`) tenía **3 `<select>` en `grid-cols-3` sin ningún
breakpoint** (Estado / Severidad / Asignado a) — a diferencia de los `flex-wrap`
dispares de fases anteriores, este forzaba 3 columnas angostas incluso en celular.
Corregido a `grid-cols-1 sm:grid-cols-3`. Las 3 tablas de `TrainingClient.js` ya tenían
`overflow-x-auto`; el resto de selects encontrados en Proveedores/Manuales/SMS/
Capacitación son campos únicos (sin nada con qué desalinearse) o chips de acción con
`flex-wrap` correcto — sin más cambios.

- [x] `dashboard/suppliers/page.js` (`SuppliersClient.js`) — sin hallazgos.
- [x] `dashboard/training/page.js` (3 pestañas) + `dashboard/training/exam/page.js` —
      tablas ya con scroll horizontal, sin hallazgos.
- [x] `dashboard/manuales/page.js` — sin hallazgos.
- [x] `dashboard/sms/page.js`, `dashboard/vor-mor/page.js` (2 pestañas) — panel de
      gestión VOR/MOR corregido (3 selects sin breakpoint → responsivo).
- [x] `dashboard/manual-operaciones/page.js` — sin hallazgos.

---

## Fase 4 — Cuenta y organización ✅ hecha (2026-07-25)

El hallazgo más significativo de todo el plan hasta ahora: **Mi Perfil** tenía 4 pares
de campos (Nombres/Apellidos, Teléfono/Ciudad, Licencia/Vencimiento certificado médico,
Contacto de emergencia) en `grid-cols-2` sin ningún breakpoint — justo el problema de
"campos apretados en celular" que motivó este plan, en una de las páginas que más
visita cualquier usuario desde el teléfono. **Organización** tenía el mismo patrón en 4
lugares más (tipo de identificación/NIT, teléfono/representante legal, N.º
Explotador/N.º operador UAS, fechas de una póliza) — mismo fix. También se corrigió el
grid de 3 columnas de "Inicio Rápido" (ya detectado como candidato en la Fase 0, sin
resolver entonces): con texto descriptivo largo dentro de cada paso, 3 columnas en
móvil quedaban demasiado angostas. Todo corregido a `grid-cols-1 sm:grid-cols-2` (o
`sm:grid-cols-3`). Las tablas de pólizas, historial de facturación, comparativa de
planes y usuarios ya tenían su patrón de scroll horizontal o tarjetas móviles — sin
cambios ahí.

- [x] `dashboard/settings/page.js` (Organización — hero + Inicio Rápido + 2 columnas) —
      4 pares de campos + el grid de 3 pasos corregidos.
- [x] `dashboard/settings/profile/page.js` (Mi Perfil) — 4 pares de campos corregidos.
- [x] `dashboard/subscription/page.js` + `/manage` + `/response` — sin hallazgos, ya
      bien resuelto.
- [x] `dashboard/select-plan/page.js` — sin hallazgos, tabla comparativa ya con scroll.
- [x] `dashboard/users/page.js` (`UsersClient.js`) — sin hallazgos, ya con tarjetas
      móviles + tabla de escritorio.

---

## Fase 5 — Master, Socio y Autenticación (fuera del layout normal del dashboard) ✅ hecha (2026-07-25)

Hallazgo real de alto impacto: **`registro/page.js`** — el formulario público de
registro, el más visitado desde celular de toda la app por gente que ni siquiera tiene
cuenta todavía — tenía **4 pares de campos** (Nombre/Apellido, Teléfono/Ciudad,
repetidos en los 2 flujos de registro: unirse a organización y cuenta nueva) en
`grid-cols-2` sin breakpoint, mismo patrón que Mi Perfil en la Fase 4. Corregido. Las
tarjetas de selección de plan y de tipo de cuenta (2-4 tarjetas comparativas) se dejaron
intactas — ya son legibles en 2 columnas y colapsarlas perdería el sentido de
comparación. `socio/page.js` tenía 3 tarjetas de totales (Pagos/Comisión pendiente/
liquidada) con valores en moneda en `grid-cols-3` sin breakpoint — corregida a 1 columna
en móvil. En `admin/master` (panel de baja prioridad en celular, pero igual revisado) se
corrigió un grid de 2 inputs+botón de "recursos adicionales". Las 6 tablas del panel
Master y las 3 de `socio/page.js` ya tenían `overflow-x-auto`; los chips/badges
(códigos, roles, miembros) ya usan `flex-wrap` correctamente. Login, reset/update de
contraseña y la página de plantillas de registro no tuvieron hallazgos.

- [x] `admin/master/page.js` (todas sus pestañas) — 1 grid corregido, tablas ya con
      scroll horizontal.
- [x] `socio/page.js` (tabs Panel / Reportes / Perfil) — grid de totales corregido,
      tablas ya con scroll horizontal.
- [x] `login/page.js`, `registro/page.js` (formulario largo con varios pasos),
      `reset-password/page.js`, `update-password/page.js` — 4 pares de campos
      corregidos en `registro/page.js`; el resto sin hallazgos.
- [x] `dashboard/records/[templateId]/page.js` — sin hallazgos.

---

## Fase 6 — QA final cruzado

### Corrección previa — barra de navegación inferior tapaba el botón de acción (2026-07-25)

A pedido explícito del usuario ("la parte inferior... que no quede información por
debajo ni escondida"), encontrada antes de arrancar el recorrido formal de QA: el
Despacho (`logbook/new`) y el Cierre de Vuelo (`logbook/finalize`) son overlays de
pantalla completa (`fixed inset-0`) con su propio botón de acción al final del
contenido ("Aprobar Vuelo", etc.) — pero la barra de navegación inferior persistente
del layout (también `fixed`, mismo `z-index`, renderizada después en el DOM) seguía
mostrándose por encima **durante esos flujos**, sin ninguna lógica que la ocultara.
En celulares con muesca/home indicator, la barra podía pintarse justo sobre ese botón
de acción, tapándolo parcialmente — el "información escondida" real que reportó el
usuario.

**Corregido de raíz, no solo con más padding**: se agregó `isFullScreenFlow`
(`dashboard/layout.js`) que oculta la barra inferior por completo mientras la ruta es
`/dashboard/logbook/new` o `/dashboard/logbook/finalize` — coherente además con que son
pantallas de enfoque único (kiosko) que no necesitan navegación paralela compitiendo
por espacio. Como refuerzo (por si algún flujo similar futuro olvida ocultarla, o para
el área del gesto de inicio en iOS que persiste sin barra visible), el padding inferior
de ambas pantallas kiosko pasó de un `pb-20` fijo a uno consciente del área segura del
dispositivo (`pb-[max(5rem,calc(2rem+env(safe-area-inset-bottom,16px)))]`), mismo
patrón `env(safe-area-inset-bottom)` que ya usaba la barra de navegación del layout.

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
