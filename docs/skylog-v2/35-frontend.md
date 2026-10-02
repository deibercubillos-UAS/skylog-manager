# Frontend y distribución

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).
> **Corregido el 2026-09-15** (decisión 104, `51-bitacora.md`): §3.2 (4 espacios por momento
> operacional) se construyó (decisión 60) y **se abandonó** por rechazo directo del usuario
> (decisión 98) — no es el diseño vigente. Este documento ya no describe una propuesta: describe
> lo que **hoy existe en el código**, con lo que sigue como propuesta marcado explícitamente.

---

## 3. F1 — Rediseño de frontend y distribución

### 3.1 El problema real, medido

- 40 páginas de dashboard, ~30 entradas de navegación, 181 rutas API, 87 componentes (v1, en
  producción — sin cambios, sigue siendo el diagnóstico correcto de por qué hacía falta F1).
- El sidebar de producción ya se reagrupó (3 grupos: Operación / Flota & Equipo /
  Documentación) y se hizo contraíble — eso alivió el síntoma, no resolvía por sí solo el
  problema de fondo de tener un segundo esquema de datos limpio.
- Consecuencia observable en v1: 4 páginas huérfanas sin ningún enlace real
  (`logbook/daily`, `/batteries` antiguo, `/inventory` antiguo, `/pilots` antiguo), documentadas
  en `docs/plan-mobile-ux-bitafly.md` y nunca resueltas.

### 3.2 ⚠️ Intento descartado: espacios de trabajo por momento operacional

> **Esto se construyó y se abandonó** (decisiones 59-62 → 98, `51-bitacora.md`). Se deja aquí
> como registro de por qué no funcionó, no como propuesta activa — **ver §3.2b para el diseño
> real vigente**.

La propuesta original organizaba la navegación por **momento operacional** en vez de por
entidad de datos: cuatro espacios (OPERAR/PLANEAR/REGISTRAR/CUMPLIR), cada uno con su propia
densidad visual, con un selector de secciones propio (llegó a construirse con 7 secciones:
Operación, Flota y Tripulación, SMS, Capacitación, Reportes, Control Documental, Organización).

**Por qué se abandonó**: al verlo construido y navegarlo, el usuario lo rechazó directamente —
*"no me gusta esa organización, es todo lo menos intuitiva posible"* — tras probar 3
variantes de ajuste visual (nav ancho → dropdown único, 3 ítems fijos, centrado) que no
resolvían el problema de fondo: reagrupar por "momento" en vez de por dominio (Flota,
Tripulación, SMS…) resultó **menos** intuitivo que el modelo que ya funciona en producción, no
más. La navegación por entidad de datos que §3.1 diagnosticaba como el problema **no era la
causa real** de la desorientación — el verdadero problema era la falta de un sistema visual
codificado (§3.4) y de agrupación consistente, ambos resueltos sin cambiar el criterio de
agrupación.

### 3.2b Diseño vigente: réplica de los 3 grupos reales de v1, sobre datos V2

Decisión 99-100 (`51-bitacora.md`): en vez de inventar una taxonomía nueva, V2 **replica los 3
grupos que ya funcionan en producción** — mismo criterio de agrupación, datos y esquema
100% de V2 (`people`/`accounts`/`memberships`/`flights`/`missions`/`sms_*`, nunca `profiles`).

| Grupo | Contiene hoy en V2 | Estado |
|---|---|---|
| **Operación** | Dashboard (`/inicio`), Bitácora, Programación, Meteorología, Tiempo de servicio | ✅ Construido — frente F5 + esta pasada de diseño |
| **Flota & Equipo** | Aeronaves (`/flota`), Baterías y Componentes (`/flota/baterias`), Tripulación (`/flota/tripulacion`), Mantenimiento (`/flota/mantenimiento` — programa, vencimientos y eventos inesperados), ETA (`/flota/eta`) | ✅ **Completo** (decisiones 105-118, retiro Calibración en 119) — 5 páginas reales, ninguna "Próximamente" |
| **Documentación** | SMS, Capacitación, Listas de Chequeo, Proveedores, Reportes, Manuales, Expediente Aerocivil | ✅ **Completo, salvo Aerocivil** (2026-10-01) — Capacitación (decisiones 121-124), Proveedores (125), Listas de Chequeo (126-127), Reportes (128-129) y Manuales, más las **11 páginas de SMS** (`/sms` hub, riesgos, indicadores, reportes-y-casos, objetivos, mejora-continua, reporte-mensual, asistente, mapas, gobernanza/MSMS/capacitación-SMS ocultas de nav pero construidas) ya usan `SectionHero`/`StatCard`. **Expediente Aerocivil (`/aerocivil`) sigue como utilitario** — excluido a propósito de este cierre, ver `43-aerocivil.md` |

El rol sigue filtrando qué se ve (`isDutyManager` resuelto por `GET /api/duty/context`, mismo
patrón en las tres — nunca `PERMISSIONS` de v1, que no existe en V2). **No hay** espacio por
defecto según rol ni panel ejecutivo transversal — eso era parte de la propuesta descartada de
§3.2 y no se reconstruyó bajo el nuevo criterio; si se quiere, es una decisión nueva a tomar,
no una herencia automática de lo abandonado.

Header: logo + nombre de organización (con selector si la cuenta pertenece a más de una,
`51-bitacora.md` decisión 102), avatar/rol. **Deliberadamente sin** campana de notificaciones
ni búsqueda global — sus tablas de respaldo (`notifications`, índice de `flights`/`aircraft`/
`pilots` de v1) no existen en V2 (decisión 99).

### 3.3 Modo campo

Sigue como propuesta, sin construir. Un modo explícito (no una adivinanza por tamaño de
pantalla) pensado para tablet/RC en exteriores: tipografía +30%, contraste alto, targets de
56 px mínimo, sin scroll horizontal en ningún caso, y funcional sin conexión estable (ver 3.5).

### 3.4 Sistema de diseño real — dos capas, no una

`packages/ui` (`@skylog/ui`) se construyó en la decisión 59 codificando el look de v1 tal
cual (`PageHero`, `KPIStrip`, `Panel`, `Button`, `Field`, tokens de `tailwind.config.mjs`) y
sigue existiendo — `Field`/`Button`/`Panel` son las primitivas de formulario de bajo nivel que
usa toda página V2 nueva.

**Lo que la propuesta original no anticipaba** (decisión 101, 2026-09-14): tras construir el
dashboard y las páginas de Operación con `PageHero`/`KPIStrip` puros, el usuario pidió
explícitamente volver a un lenguaje **"más amigable, más moderno"** — degradados, tarjetas de
color — para las páginas de sección. En vez de reescribir `@skylog/ui` (que sigue siendo
correcto como base neutra, y es compartido en espíritu con los compuestos de producción), se
creó una segunda capa: `src/app/(v2)/_components/SectionHero.js` (`SectionHero` — hero con
degradado navy + luz decorativa + métrica destacada; `StatCard` — tile de ícono a color sólido
sobre lavado de fondo, paleta `primary/blue/violet/emerald/amber/red`). Es el sistema visual
real que usan hoy `/inicio` y las 4 páginas de Operación.

**Regla para páginas nuevas**: usar `SectionHero`/`StatCard` de `_components/` para el
encabezado y las métricas de cada página de sección; usar `Field`/`Button` de `@skylog/ui`
para formularios. No crear una tercera variante sin necesidad real — si `_components/` no
alcanza para un caso nuevo, se extiende ahí, no se inventa un componente suelto por página
(ya se dedujo dos veces por duplicación entre Bitácora/Programación antes de extraerlo).

**Vocabulario, no solo color** (decisión 103c): el tono de cada mensaje de estado depende de si
es una obligación regulatoria objetiva o un juicio que le corresponde al piloto. Tiempos de
servicio (§100.540, límites duros) usa rojo/"Excede"/"Despacho bloqueado" sin matizar.
Meteorología (juicio del piloto sobre su propio entorno) usa "Favorable"/"Verifique su
entorno" — nunca "APTO"/"NO APTO" — con la única excepción del índice Kp, que se mantiene
directo por ser un umbral objetivo de NOAA que no se puede verificar a simple vista.

Beneficio medible, vigente desde la propuesta original: el "cambiar N archivos para renombrar
un grupo del sidebar" pasa a ser un cambio en un archivo (`NAV_LINKS`/`NAV_GROUPS` en
`(v2)/layout.js`).

### 3.5 Resiliencia en campo (propuesta, sin construir)

Los checklists de despacho y el cierre de vuelo se diligencian **donde no hay señal**. Hoy si se
cae la conexión a mitad del wizard, se pierde. Propuesta: cola de escritura local
(IndexedDB) + sincronización al recuperar señal, aplicada a los flujos kiosko
(`logbook/new`, `logbook/finalize`) y al registro de tiempos de servicio.

### 3.6 Command palette (propuesta, sin construir)

`⌘K` / `Ctrl+K` con acciones, no solo búsqueda: "despachar vuelo", "registrar mantenimiento",
"ver misión de mañana". Absorbe y amplía `GlobalSearch` actual.

### 3.7 Qué sigue — el orden real para completar F1

**Flota & Equipo — ✅ completo** (dividido en 4 fases, 30-entidades.md §3 tiene el
inventario completo de entidades; cada fase fue su propio ciclo de seis etapas, no un
todo-o-nada):

| Fase | Entidades | Estado |
|---|---|---|
| **1** | Modelo de UAS + Aeronave — catálogo mínimo, asignable en Programación/Bitácora | ✅ Construida (decisiones 105-107) |
| **2** | Batería + Componente, en una sola página (`/flota/baterias`) — mismo patrón de v1 (reloj de uso desde `installed_at_aircraft_hours`), con las baterías automatizadas desde el log DJI (decisión 110) | ✅ Construida (decisiones 108-110) |
| **—** | **Tripulación** (`/flota/tripulacion`) — roster sobre Persona/Membresía, adelantada fuera del orden original a pedido del usuario | ✅ Construida (decisión 111) |
| **3** | ETA (equipo tecnológico asociado, número RETA) + Documento de propiedad | ✅ Construida (decisión 117) — última pieza de Flota & Equipo |
| **4a** | Programa de mantenimiento **por modelo** (`100.535(3)`) + Tareas con intervalo (ciclos/horas/calendario) + tolerancia | ✅ Construida (decisión 112) — cierra el hallazgo R9 de `50-hoja-de-ruta.md §8.2` |
| **4b** | Eventos de mantenimiento (registrar ejecución real) + estado de vencimiento por aeronave derivado de ahí | ✅ Construida (decisión 113) |
| **4c** | Eventos inesperados (aterrizaje fuerte, impacto de aves, FOD, pérdida de hélice) — dispara evaluación obligatoria | ✅ Construida (decisión 115) — sección propia dentro de `/flota/mantenimiento`, no una página nueva |
| **4d** | ~~Calibración de equipos de medición~~ | ❌ **Retirada** (decisión 119) — "no será necesaria" (usuario, 2026-09-15). Se construyó (decisión 116) y se eliminó por completo (esquema + código): Mantenimiento queda en Fases 4a-4c |

Después de Flota & Equipo:

1. **Documentación — pasó de utilitario a diseño real — ✅ cerrado 2026-10-01, salvo
   Aerocivil (excluido a propósito)**. **Capacitación (`/capacitacion`) ✅ completa**
   (decisiones 121-124) — una sola página de ingreso para cualquier miembro (material de
   apoyo + varias evaluaciones con fecha límite propia, las 3 pistas juntas) y una página
   propia de Administración (crear evaluaciones, material, banco de preguntas por
   evaluación, roster de cumplimiento consolidado). **Proveedores (`/proveedores`) ✅
   completa** (decisión 125, 2026-09-26) — módulo nuevo: listado de proveedores + checklist
   de auditoría propio por organización + historial de auditorías con % de cumplimiento,
   con `SectionHero`/`StatCard` desde el inicio. **Listas de Chequeo
   (`/listas-de-chequeo`) ✅ completa** (decisiones 126-127, 2026-09-26) — biblioteca libre
   de checklists/procedimientos (equivalente a "Protocolos" de v1), con descarga en PDF
   imprimible. **Reportes (`/reportes`) ✅ completa** (decisiones 128-129) — hub de **10
   formatos** en PDF sobre datos 100% reales de V2, verificado fila por fila contra las 29
   obligaciones de RAC 100 §100.535 (`19-registros-obligatorios.md`). **SMS — las 11 páginas
   ya usan `SectionHero`/`StatCard`** (2026-10-01): el hub `/sms`, `/sms/riesgos` y
   `/sms/indicadores` (decisiones 150-151), `/sms/reportes` (reportes+casos, restyle del
   mismo día) y el resto (objetivos, mejora-continua, reporte-mensual, asistente, mapas,
   gobernanza/MSMS/capacitación-SMS — ocultas de nav por decisión del usuario pero
   construidas y con el mismo lenguaje visual) ya nacieron con el sistema nuevo. Se corrigió
   de paso `/operacion/page.js` (landing de la sección Operación), la última página del
   árbol que seguía en `PageHero`/`KPIStrip` plano de `@skylog/ui` en vez de `SectionHero`.
   **Expediente Aerocivil (`/aerocivil`) sigue como utilitario, excluido a propósito** —
   queda como el único pendiente real de este punto, ver `43-aerocivil.md`.
2. §3.3/§3.5/§3.6 quedan como mejoras de producto pendientes, sin fecha — no bloquean el
   cierre de F1.

### 3.8 F1 — cierre (2026-10-01, salvo Aerocivil)

Con Operación, Flota & Equipo y Documentación (SMS incluido) en el mismo lenguaje visual
(`SectionHero`/`StatCard` para encabezados y métricas, `Field`/`Button` de `@skylog/ui` para
formularios), **F1 se da por completo** con una sola excepción deliberada: **Expediente
Aerocivil (`/aerocivil`, F4a)** se excluyó explícitamente de este cierre a pedido del
usuario — sigue en el estilo mínimo de construcción, sin rediseño visual todavía. No hay
ninguna otra página del árbol V2 (fuera de Aerocivil) usando el shell plano viejo.

---
