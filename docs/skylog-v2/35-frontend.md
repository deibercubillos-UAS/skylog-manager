# Frontend y distribución

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> **Revisado 2026-08-22.** Contenido en lo esencial — es la propuesta de navegación por
> *momento operacional*, distinta y complementaria del catálogo por *entidad* de
> [`36-sitemap.md`](36-sitemap.md). Ver §6, nueva, para la reconciliación entre ambos. Se quitó
> la mención a C2 en vivo del espacio OPERAR (decisión 20 — dormido, no forma parte de la
> navegación mientras esté omitido).
>
> **Actualizado 2026-09-06**: [`37-marca-y-motion.md`](37-marca-y-motion.md) trae las reglas de
> oro de marca/motion/UX para cuando F1 se construya, y precisa §3.2 — el "espacio por defecto
> según el rol" de abajo se implementa como **rutas separadas de verdad por rol**, no solo
> componentes distintos en la misma ruta (decisión del usuario, ver ese documento §6).

---

## 3. F1 — Rediseño de frontend y distribución

### 3.1 El problema real, medido

- 40 páginas de dashboard, ~30 entradas de navegación, 181 rutas API, 87 componentes.
- El sidebar ya se reagrupó (3 grupos) y se hizo contraíble — eso alivió el síntoma, no la causa.
- La causa: **la navegación está organizada por entidad de datos** (Flota, Baterías, Pilotos,
  Mantenimiento…), no por **momento operacional**. Un piloto en campo a las 6 a.m. no busca
  "Baterías", busca "voy a volar".
- Consecuencia observable: hay 4 páginas huérfanas sin ningún enlace real
  (`logbook/daily`, `/batteries` antiguo, `/inventory` antiguo, `/pilots` antiguo), documentadas
  en `docs/plan-mobile-ux-bitafly.md` y nunca resueltas. Eso es síntoma de una IA que creció por
  acumulación.

### 3.2 Propuesta: espacios de trabajo por momento operacional

Cuatro espacios, cada uno con su propia densidad visual y su propio "modo":

| Espacio | Momento | Contiene | Densidad |
|---|---|---|---|
| **OPERAR** | Hoy / ahora / en campo | Dashboard del día, Despacho, Mis vuelos, Clima, Cierre de vuelo — ⏸ *C2 en vivo se agrega aquí si se retoma la decisión 20* | Baja — botones grandes, alto contraste, un pulgar |
| **PLANEAR** | Días antes | Programación, **Autorizaciones Aerocivil**, SORA, Evaluación de riesgos, Asignación de tripulación, **Tiempos de servicio** | Media — calendario + mapa |
| **REGISTRAR** | Después / administrativo | Bitácora, Flota, Baterías, Mantenimiento, Inventario, Componentes | Alta — tablas densas, filtros |
| **CUMPLIR** | Auditoría / dirección | SMS, Auditoría, Reportes, Manuales, Protocolos, Proveedores, Capacitación | Alta — documentos y evidencia |

El rol sigue filtrando qué se ve (sin cambios en `PERMISSIONS`), pero además **el espacio por
defecto depende del rol**: piloto → OPERAR; jefe de pilotos → PLANEAR; gerente SMS → CUMPLIR;
gerente general → un panel ejecutivo transversal.

**Precisión 2026-09-06**: esto se implementa como **árboles de ruta separados por rol**
(`src/app/(v2)/piloto/`, `.../jefe-pilotos/`, `.../gerente-sms/`, `.../gerente-general/`), no
solo como un componente distinto en la misma URL — cada rol carga solo su propio código, más
rápido de verdad, no solo más ordenado. Detalle en
[`37-marca-y-motion.md`](37-marca-y-motion.md) §6. `PERMISSIONS`/RLS siguen siendo la única
fuente real de seguridad; la separación de rutas es una decisión de organización y rendimiento,
no un mecanismo de acceso paralelo.

### 3.3 Modo campo

Un modo explícito (no una adivinanza por tamaño de pantalla) pensado para tablet/RC en
exteriores: tipografía +30%, contraste alto, targets de 56 px mínimo, sin scroll horizontal en
ningún caso, y **funcional sin conexión estable** (ver 3.5). Se activa manualmente y se recuerda
por dispositivo.

### 3.4 Sistema de diseño real, no convención

Hoy los patrones existen (`PageHero`, `KPIStrip`, `IconTile`, panel deslizable, barra de
filtros `grid-cols-2 sm:flex`) pero viven como **convención documentada en CLAUDE.md y
copiada a mano** en 40 páginas. Eso es lo que hace que cada rediseño cueste tanto.

Propuesta: extraer `packages/ui` con tokens (color, espaciado, tipografía, radios, sombras),
primitivas (Button, Field, Select, Panel, Table, Sheet, Toast) y compuestos (PageHero, KPIStrip,
FilterBar, EmptyState, DataTable). Sin librería externa de componentes — el look ya existe y es
propio; se trata de codificarlo, no de reemplazarlo.

Beneficio medible: el "cambiar 40 archivos para renombrar un grupo del sidebar" pasa a ser un
cambio en un archivo.

### 3.5 Resiliencia en campo (nuevo, no cosmético)

Los checklists de despacho y el cierre de vuelo se diligencian **donde no hay señal**. Hoy si se
cae la conexión a mitad del wizard, se pierde. Propuesta: cola de escritura local
(IndexedDB) + sincronización al recuperar señal, aplicada a los flujos kiosko
(`logbook/new`, `logbook/finalize`) y al registro de tiempos de servicio.

### 3.6 Command palette

`⌘K` / `Ctrl+K` con acciones, no solo búsqueda: "despachar vuelo", "registrar mantenimiento",
"ver misión de mañana". Absorbe y amplía `GlobalSearch` actual.

---

---

## 6 · Reconciliación con `36-sitemap.md` — dos proyecciones, no dos planes

**Tensión real detectada al rehacer este documento**: §3.2 agrupa por **momento operacional**
(OPERAR/PLANEAR/REGISTRAR/CUMPLIR, cuatro espacios); [`36-sitemap.md`](36-sitemap.md) agrupa por
**entidad/registro obligatorio** (Operación/Flota & Equipo/Tripulación/SMS/Cumplimiento/
Administración, seis espacios). No son el mismo mapa, y no se reconciliaron hasta ahora.

**Resolución propuesta, no aplicada aún** (F1 sigue siendo el último frente activo del orden,
hay tiempo): son dos proyecciones legítimas del mismo conjunto de pantallas, no dos diseños en
competencia.

| | [`36-sitemap.md`](36-sitemap.md) | Este documento |
|---|---|---|
| Agrupa por | Entidad de negocio / qué registro obligatorio respalda cada pantalla | Momento en que el usuario la necesita |
| Sirve para | Diseñar el esquema de datos, permisos, RLS — [`31`](31-esquema-datos.md) | Diseñar la navegación real que ve un piloto en campo |
| Ejemplo | "Mantenimiento" vive en Flota & Equipo porque es dato de aeronave | "Registrar mantenimiento" puede aparecer también en REGISTRAR, como acción del *momento* |

**Una pantalla puede — y va a — aparecer en más de un espacio de navegación**, sin que eso
duplique dato ni entidad: el sitemap sigue siendo la fuente única de qué existe y de quién es
cada dato; la agrupación de §3.2 es solo **cómo se accede** a lo mismo. El *command palette*
de §3.6 ya asume esto (una acción, alcanzable desde cualquier espacio).

**Pendiente real**: al construir F1, mapear explícitamente cada pantalla del sitemap a uno o más
de los cuatro espacios operacionales — no se hace en este documento, sería adelantar diseño de
un frente que va último a propósito.

---

*Actualizado: 2026-08-22.*
