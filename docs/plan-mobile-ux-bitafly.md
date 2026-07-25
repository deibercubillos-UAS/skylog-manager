# Plan de Auditoría y Mejora Mobile — BitaFly Dashboard

## Objetivo

Revisar toda la app (`/dashboard/**`, módulo por módulo, sección por sección, pestaña por
pestaña) en tamaño de celular y dejar un plan ejecutable por fases para que quede
organizada, simétrica, sin campos ni tarjetas desproporcionadamente grandes, con
espaciado consistente y objetivos táctiles de tamaño adecuado.

**Estado de cada fase**: `[ ] Pendiente` · `[~] En ejecución` · `[x] Verificada`

---

## Metodología y limitación real (leer antes de ejecutar cualquier fase)

Este documento se armó en dos pasos:

1. **Criterios objetivos**: se consultó la skill `ui-ux-pro-max` (base de datos local de
   reglas UX priorizadas) para fijar el estándar contra el que se evalúa cada pantalla —
   ver tabla de criterios abajo.
2. **Evidencia real de código**: barrido con `grep` sobre todo `src/app/dashboard` y
   `src/components` buscando los anti-patrones concretos de la tabla de criterios (grids
   sin variante responsive, anchos fijos en px, tablas sin scroll horizontal, `h-screen`,
   etc.) — cada hallazgo listado abajo tiene archivo y contexto real, no es una suposición
   genérica.

**⚠️ Limitación importante, no resuelta**: en este entorno no hay acceso de red a
`bitafly.com` ni a las URLs de Vercel (política de red del entorno, ver conversación de
auditoría del 2026-07-22), y no hay navegador disponible — así que **nada de esto fue
verificado visualmente en un viewport de celular real**. Es una auditoría estática de
patrones de código (Tailwind/JSX), no una inspección visual pixel a pixel. Cada fase
incluye un paso final "Verificar visualmente" que **debes hacer tú** (o quien ejecute la
fase) en un navegador real a 375px/390px de ancho antes de marcarla como `[x]`.

### Criterios (de la skill `ui-ux-pro-max`, dominio `ux`)

| # | Criterio | Regla concreta | Severidad |
|---|---|---|---|
| 1 | Mobile first | Estilos base para mobile, variantes `sm:`/`md:`/`lg:` para ensanchar — nunca al revés | Media |
| 2 | Objetivos táctiles | Mínimo 44×44px, separación mínima 8px entre elementos clicables adyacentes | **Alta** |
| 3 | Grids/columnas | `grid-cols-N` (N≥3) siempre con fallback de 1-2 columnas en mobile | **Alta** |
| 4 | Tablas | Nunca una tabla ancha sin envolver en `overflow-x-auto`, o mejor, layout de tarjetas en mobile | Media |
| 5 | Anchos fijos | Evitar `w-[Npx]` fijo en contenedores/campos que no colapsan a `w-full` en mobile | Media |
| 6 | Altura de viewport | `h-screen` es poco confiable en navegadores móviles (barra de dirección) → usar `min-h-dvh`/`min-h-screen` | Media |
| 7 | Texto | Mínimo `text-base` (16px) para texto de cuerpo — `text-xs` solo para metadatos/etiquetas, nunca contenido principal | **Alta** |
| 8 | Formularios | Etiqueta visible (no solo placeholder), validación en `onBlur`, indicador de campo requerido, feedback de envío | Media |
| 9 | Navegación | Back predecible, navegación inferior ≤5 ítems, sin desbordamiento horizontal | **Alta** |
| 10 | Layout shift | Reservar espacio para contenido async (imágenes, gráficas) para evitar saltos de layout | Media |

---

## Inventario y evidencia real por fase

Cada fase agrupa páginas por el mismo criterio que ya usa el propio sidebar de la app
(`NAV_GROUPS` en `dashboard/layout.js`), más 2 fases transversales al principio/final
porque tienen el mayor apalancamiento (un fix ahí mejora muchas pantallas a la vez).

### Fase 0 — Shell global (sidebar, header, navegación inferior, wizard kiosko)

Afecta a **todas** las páginas — máxima prioridad, hazla primero.

- [ ] `src/app/dashboard/layout.js` — contiene 3 hits de `h-screen`/anchos fijos en el
  barrido (línea con `w-[` en el popover de cuenta/switcher — revisar que colapse bien
  <375px) y es el único archivo que renderiza el sidebar + `bottomNavLinks` para todos.
  Verificar: ítems del nav inferior (`BottomNavItem`) cumplen 44×44px reales: hoy son
  botones de ícono+etiqueta apilados, confirmar que el área clicable completa (no solo el
  ícono) cumple el mínimo.
- [ ] `src/app/dashboard/logbook/new/page.js` y `subscription/response/page.js` —
  usan `h-screen` (`fixed inset-0` kiosko) en vez de `min-h-dvh`/`min-h-screen` — en
  Chrome/Safari mobile con barra de direcciones dinámica esto puede recortar contenido o
  dejar un salto al hacer scroll. Cambiar a `min-h-dvh` con fallback `min-h-screen`.
- [ ] `NotificationBell.js` — tiene un ancho fijo en px detectado en el barrido; confirmar
  que el panel desplegable de notificaciones no se corta ni desborda en 375px de ancho.
- [ ] **Verificar visualmente**: abrir el dashboard en 375px, 390px y 430px (los 3 anchos
  de celular más comunes) — sidebar cerrado por defecto, nav inferior con 5 ítems o menos
  visibles, ningún scroll horizontal en ninguna pantalla.

### Fase 1 — Operación (Dashboard, Bitácora, Programación, Meteorología, Despacho)

- [ ] `dashboard/logbook/page.js` (Bitácora) — tabla de vuelos: confirmar que en mobile
  usa el layout de tarjetas ya documentado (CLAUDE.md dice que la tabla desktop se
  esconde en mobile) y no la tabla cruda; tiene un ancho fijo detectado en el barrido a
  revisar. `KPIStrip` de 4 métricas — confirmar 2 columnas en mobile, no 4 apretadas.
- [ ] `dashboard/programacion-activa/ProgramacionActivaClient.js` — **hallazgo real**:
  `grid grid-cols-7` (calendario semanal) está correctamente detrás de `hidden sm:grid`
  (bien resuelto), pero tiene además un ancho fijo en px detectado aparte — confirmar cuál
  es la vista que sí se muestra en mobile (`<sm`) y que no sea una versión recortada de la
  misma grilla de 7 columnas.
- [ ] `components/authorizations/BasicForm.js` — `grid-cols-3` sin variante responsive
  (línea ~421, sección probablemente de fecha/hora/altitud) — en mobile esas 3 celdas
  quedarán apretadas o con inputs ilegibles. Añadir `grid-cols-1 sm:grid-cols-3`.
  `AerocivilForm.js` tiene el mismo patrón (línea ~885).
- [ ] `components/FlightPlanner.js` — 2 ocurrencias de `grid-cols-3` sin variante
  responsive (líneas ~500 y ~549) — mismo fix.
- [ ] `components/WeatherWidget.js` — `grid-cols-4` sin variante (línea ~153, los 4 tiles
  de viento/ráfagas/visibilidad/lluvia) — en mobile probablemente deban pasar a 2×2
  (`grid-cols-2 sm:grid-cols-4`) en vez de 4 columnas apretadas.
- [ ] `dashboard/weather/page.js` — tiene un ancho fijo detectado en el barrido, revisar
  el hero GO/NO-GO y las 6 tarjetas de condiciones actuales.
- [ ] `dashboard/logbook/new/page.js` (Despacho, wizard kiosko) — además del fix de
  `h-screen` de la Fase 0, revisar el `StepProgress` (indicador de pasos) y los inputs del
  formulario de Datos — confirmar que no haya inputs de ancho fijo que se corten.
- [ ] **Verificar visualmente** cada una de estas pantallas a 375px: Dashboard, Bitácora
  (lista + modal de detalle), Programación (vista semana y lista), Meteorología, Despacho
  completo (los 4-5 pasos del wizard), Cierre de Vuelo.

### Fase 2 — Flota & Equipo (Flota, Baterías, Mantenimiento, Inventario, Tripulación)

- [ ] `dashboard/batteries/page.js` — tiene un ancho fijo detectado en el barrido; esta
  página usa **tabla** (no grid de tarjetas, a diferencia de Flota) — confirmar que está
  envuelta en `overflow-x-auto` o que tiene una vista de tarjetas equivalente en mobile
  (columnas: ID/serie, modelo, ciclos, salud, última aeronave, estado — son 6 columnas,
  candidata fuerte a desbordar en 375px si es tabla cruda).
- [ ] `dashboard/maintenance/page.js` — ancho fijo detectado en el barrido; tabla de
  intervenciones (Aeronave/Tipo/Última/Próxima/Técnico/Estado/Evidencia = 7 columnas) —
  mismo riesgo que Baterías, revisar layout mobile real.
- [ ] `components/AircraftCard.js` — ancho fijo detectado en el barrido — revisar que la
  tarjeta (foto + IconTile + chips de batería) no fuerce un ancho mínimo mayor al viewport
  en la grilla de Flota.
- [ ] `components/safety/RiskMatrixEditor.js` — ancho fijo detectado (aunque vive bajo
  Documentación en el nav, la matriz de riesgo 5×5 es candidata típica a desbordar en
  mobile — revisar aquí junto con Mantenimiento por ser tabla/grilla densa).
- [ ] **Verificar visualmente**: Flota (grid de `AircraftCard`), Baterías (tabla → ¿se
  vuelve tarjetas en mobile?), Mantenimiento (tabla + sección "Mantenimiento Menor" +
  modal de detalle con checklist de recibo), Inventario (existencias + checklist),
  Tripulación (grid de tarjetas de piloto + panel Agregar/Editar piloto).

### Fase 3 — Documentación (Seguridad SMS, SORA, Auditoría, Reportes, Protocolos, Proveedores, Capacitación, Manuales, VOR/MOR)

Es el grupo con más pantallas (9 páginas, varias con sub-tabs) — dividir en sub-fases si
hace falta al ejecutar.

- [ ] `dashboard/safety/page.js` — ancho fijo detectado; es un **hub de 9 tabs** (SORA,
  Evaluación de Riesgos, Indicadores SPI, Mejora Continua, Acciones Correctivas, Reportes,
  Reportes de Seg. Operacional, Barreras, Mapas, Capacitación SMS) — revisar
  específicamente que la barra de tabs no desborde horizontalmente en 375px sin scroll
  visible, y que cada tab individual (sobre todo Indicadores SPI y Evaluación de Riesgos,
  que son datos tabulares densos) tenga su propio tratamiento mobile.
- [ ] `dashboard/vor-mor/page.js` — `grid-cols-3` sin variante responsive (línea ~629) —
  revisar qué sección es (probablemente el panel de gestión/detalle de un reporte).
- [ ] `dashboard/sora/page.js` — ancho fijo detectado en el barrido.
- [ ] `dashboard/settings/page.js` (Organización, vive fuera de "Documentación" en el nav
  pero cae en el mismo tipo de formulario denso) — `grid-cols-3` (línea ~343, probablemente
  el bloque de estadísticas del hero) + ancho fijo detectado aparte — revisar.
- [ ] `components/sora/SoraWizard.js` — 2 ocurrencias de `grid-cols-3` sin variante
  (líneas ~396 y ~571) + ancho fijo detectado — es un wizard de 6 pasos, revisar cada
  paso en mobile, no solo el primero.
- [ ] Tablas sin `overflow-x-auto` detectadas: `dashboard/safety/mapas/page.js`,
  `components/authorizations/AerocivilForm.js` (Formato 100, formulario largo — aunque no
  está enlazado activamente, sigue siendo alcanzable), `components/safety/
  IndicatorDetailPanel.js` (datos mensuales del indicador SPI, probablemente varias
  columnas de meses — alta probabilidad de desbordar).
- [ ] **Verificar visualmente**: cada uno de los 9 tabs de Seguridad SMS, SORA (wizard
  completo paso a paso), Auditoría, Reportes (grilla de tarjetas + panel de descarga
  inline), Protocolos (los 4 grupos), Proveedores, Capacitación (3 tabs: Operaciones/
  Mantenimiento/SMS), Manuales, VOR/MOR (ambas pestañas: Reportes y Configuración & QR).

### Fase 4 — Cuenta (Mi Perfil, Organización, Suscripción, Gestión de Usuarios, Panel Socio)

- [ ] `dashboard/settings/page.js` — ver Fase 3 (comparte hallazgos, es la misma página).
- [ ] `dashboard/users/UsersClient.js` (Gestión de Usuarios) — ancho fijo detectado en el
  barrido — CLAUDE.md confirma que esta página ya tiene tarjetas mobile + tabla desktop
  separadas (`md:hidden`/`hidden md:block`), así que el hallazgo probablemente sea algo
  puntual (ej. el badge de rol o el selector) — revisar específico, no la estructura
  general.
- [ ] `dashboard/subscription` — no tuvo hallazgos directos en el barrido de esta pasada,
  pero es una página con mucho contenido (medidores de uso, tarjetas de plan, historial de
  facturación) — candidata a revisión visual aunque el grep no marcó nada.
- [ ] `dashboard/settings/profile/page.js` (Mi Perfil) — no tuvo hallazgos directos en el
  barrido; revisar de todos modos el hero de avatar + 2 columnas de tarjetas.
- [ ] **Verificar visualmente**: Mi Perfil, Organización, Suscripción (incluye modal de
  retención al cancelar), Gestión de Usuarios, Panel de Socio (`/socio`, layout y tabs
  Panel/Reportes/Perfil).

### Fase 5 — Componentes compartidos transversales (el fix de más apalancamiento)

Estos componentes se reutilizan en decenas de pantallas — arreglarlos aquí una sola vez
propaga la mejora a toda la app, en vez de repetir el fix módulo por módulo.

- [ ] `components/PageHero.js`, `components/KPIStrip.js`, `components/IconTile.js` —
  confirmar que el patrón de franja de KPIs (`variant="strip"`) colapsa correctamente a
  2 columnas en mobile en todas sus instancias (son ~15 páginas las que lo usan).
- [ ] Paneles deslizables tipo `EditPilotPanel.js`/`AddAircraftPanel.js`/
  `AddProtocolPanel.js` (patrón hero navy + card blanca, `bottom-0` en mobile /
  `md:w-[450px]` en desktop) — el patrón base ya es mobile-first correcto (confirmado en
  el barrido), pero revisar formularios largos dentro de esos paneles por campos que se
  salgan del ancho (selects con texto largo, inputs numéricos con steppers).
- [ ] Patrón de tabla-desktop + tarjetas-mobile (`hidden md:block` / `md:hidden`) — ya
  está aplicado en varias páginas (Bitácora, Gestión de Usuarios, Tripulación) — el
  barrido encontró 4 tablas SIN este patrón ni `overflow-x-auto` (ver Fase 3) — decidir
  si esas 4 necesitan el mismo tratamiento o si al menos merecen el wrapper de scroll
  horizontal como mínimo.
- [ ] Auditoría rápida de `text-xs` usado como texto de cuerpo (no como
  etiqueta/metadato) — el criterio #7 de la tabla de arriba marca esto como severidad
  alta; no se barrió en esta pasada por volumen (cientos de usos legítimos de `text-xs`
  para labels/badges) — cuando se ejecute esta fase, revisar puntualmente las pantallas
  que ya se visitaron en las Fases 1-4 y anotar cuáles usan `text-xs` para contenido
  principal en vez de metadatos.

---

## Cómo ejecutar

Este documento es de referencia — **no se ejecuta nada hasta que lo indiques**. Cuando
quieras avanzar una fase, dilo por su número/nombre (ej. "ejecuta la Fase 0" o "sigamos
con Bitácora de la Fase 1") y se hacen los cambios de código de esa fase puntual, se
corre `npx next lint` + `npm run build`, y se deja lista para tu verificación visual antes
de pasar a la siguiente.
