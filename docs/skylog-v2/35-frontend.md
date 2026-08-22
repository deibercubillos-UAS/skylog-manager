# Frontend y distribución

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

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
| **OPERAR** | Hoy / ahora / en campo | Dashboard del día, Despacho, **C2 en vivo**, Mis vuelos, Clima, Cierre de vuelo | Baja — botones grandes, alto contraste, un pulgar |
| **PLANEAR** | Días antes | Programación, **Autorizaciones Aerocivil**, SORA, Evaluación de riesgos, Asignación de tripulación, **Tiempos de servicio** | Media — calendario + mapa |
| **REGISTRAR** | Después / administrativo | Bitácora, Flota, Baterías, Mantenimiento, Inventario, Componentes | Alta — tablas densas, filtros |
| **CUMPLIR** | Auditoría / dirección | SMS, Auditoría, Reportes, Manuales, Protocolos, Proveedores, Capacitación | Alta — documentos y evidencia |

El rol sigue filtrando qué se ve (sin cambios en `PERMISSIONS`), pero además **el espacio por
defecto depende del rol**: piloto → OPERAR; jefe de pilotos → PLANEAR; gerente SMS → CUMPLIR;
gerente general → un panel ejecutivo transversal.

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
