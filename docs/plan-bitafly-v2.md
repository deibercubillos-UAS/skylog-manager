# Plan BitaFly v2 — Rediseño, Comando y Control, SMS y Autorizaciones Aerocivil

> **Estado: PLANEACIÓN. Cero desarrollo.**
> Documento de control del proyecto. Se actualiza a medida que se toman decisiones.
> Nada de lo aquí descrito toca `main` ni la base de datos de producción.

---

## 0. Restricción dura y modo de trabajo

El usuario fijó una restricción no negociable:

> "no quiero tocar la rama main ni las funciones de producción de ningún programa, todo debe
> trabajarse en desarrollo y no tocar ninguna interfaz que funciona actualmente."

Esto no es un detalle de proceso — condiciona la arquitectura completa. BitaFly hoy es un SaaS
**en vivo, con pagos reales de ePayco y 17 organizaciones clientes**. Un rediseño de este tamaño
sobre la misma rama y la misma base de datos rompería producción con certeza, no con
probabilidad.

### 0.1 Aislamiento en 4 capas

| Capa | Producción (intocable) | Desarrollo v2 |
|---|---|---|
| **Git** | `main` | Rama larga `develop-v2`, nunca mergeada hasta sign-off explícito |
| **Base de datos** | Proyecto Supabase actual | **Supabase branch** dedicado (`supabase branches`) — copia del esquema, datos de prueba propios |
| **Deploy** | Proyecto Vercel `skylog-manager` → `bitafly.com` | Proyecto Vercel separado (`bitafly-v2`) apuntando al Supabase branch |
| **Código** | `src/app/dashboard/**` actual | Route group nuevo `src/app/(v2)/**` — rutas que en producción **no existen** porque la rama no se mergea |

**Regla operativa #1**: ninguna migración SQL se aplica al proyecto Supabase de producción
durante toda la fase v2. Todas van al branch. El día del merge se replican en orden, con
respaldo previo.

**Regla operativa #2**: ningún archivo bajo `src/app/dashboard/`, `src/app/api/` o
`src/components/` que hoy sirva una pantalla en funcionamiento se **modifica**. Si v2 necesita
una variante, se crea un archivo nuevo. La única excepción admisible son adiciones puramente
aditivas y opcionales (una columna nullable, un campo nuevo en una respuesta JSON que nadie lee
todavía) — y aun esas se difieren al final.

**Regla operativa #3**: cuando llegue el merge, no se hace "de golpe". Se activa por
organización con un feature flag (`organizations.feature_flags jsonb`), empezando por la
organización de pruebas de QA que ya existe en producción
(`BitaFly QA - Organización de Prueba`, ver `docs/plan-qa-completa-bitafly.md`).

### 0.2 Por qué una rama larga y no fases mergeadas a main

El patrón habitual del proyecto (fase corta → PR → merge a `main`) fue correcto para el refactor
multi-organización, porque ahí cada fase era compatible hacia atrás y verificable en producción.
Aquí no aplica: el rediseño de frontend y el módulo C2 no tienen un estado intermedio
"funciona igual que antes pero mejor". Se mergea cuando está completo y probado, o no se mergea.

---

## 1. Análisis del RAC 100 actualizado — brecha real contra lo que BitaFly tiene hoy

Leí la norma completa (resolución que modifica integralmente el RAC 100). Estos son los
hallazgos que **obligan** trabajo nuevo, no los que ya cubrimos.

### 1.1 Lo que ya está cubierto (no requiere acción)

Registro UAS, bitácora de vuelo y de mantenimiento (100.535(a)(4)), programa de mantenimiento
(a)(3), documentación de trabajos de mantenimiento con histórico y responsable (a)(6), SORA /
análisis de riesgos por operación (a)(25), SMS con matriz de riesgos, SPI, GAP y acciones
correctivas (a)(18), manuales MO/MCM/MSMS como repositorio versionado con acuse de lectura
(100.550), capacitación y verificaciones de competencia (a)(8), pólizas RCE (100.410(a)(2)),
designación de Jefe de Pilotos y Gerente de Seguridad Operacional (100.545), reporte mensual de
operaciones. Esta base es sólida y es la razón por la que v2 es una evolución, no un rehacer.

### 1.2 Brechas duras — requisitos que hoy NO se cumplen

| # | Sección RAC 100 | Requisito | Estado hoy en BitaFly |
|---|---|---|---|
| **B1** | **100.540** completa + 100.535(a)(10)(11) | Límites de tiempo de servicio, vuelo efectivo y descanso del piloto UAS, **con registro obligatorio** | ❌ **No existe nada**. Ni el registro ni el control. |
| **B2** | 100.535(a)(12) | Certificar a cada piloto el tiempo de vuelo acumulado ≥1 vez por año calendario | ❌ No existe |
| **B3** | 100.535(a)(26) | Reporte mensual (primeros 5 días hábiles) con estadística **+ indicadores SPI + reportes MOR** al Grupo Estadísticas | ⚠️ Parcial: existe el Reporte Operacional Mensual UAS (8 columnas), pero SPI y MOR van por separado y sin acuse consolidado |
| **B4** | 100.535(a)(29) | Conservar registros operacionales **5 años** | ⚠️ Conflicto: la retención de replay GPS es 30–180 días según plan |
| **B5** | 100.535(a)(7) | Firmware al día + **guardar copia de la última versión que funcionó** | ❌ No existe campo ni control |
| **B6** | 100.415(a)(2)(iii) | La estación de control debe mostrar en todo momento: posición georreferenciada, azimuth, velocidad horizontal/vertical, altura, energía, **calidad del enlace C2**, **imagen de video frontal de la UA** | ❌ No existe → **esto es exactamente "comando y control"** |
| **B7** | **100.440(a)(12)** | El explotador BVLOS debe contar con un **sistema tecnológico de gestión de vuelo UAS** que garantice geocercas en toda el área de operación y **visualización de telemetría en todas las fases del vuelo** | ❌ No existe |
| **B8** | Apéndice 2 completo | Condiciones de aceptación del enlace C2 (VLOS/EVLOS/BVLOS), incl. registro de eventos críticos del enlace y programa de mantenimiento de sus componentes | ❌ No existe |
| **B9** | 100.805(a) | Solicitud de autorización por **Plataforma UAS Colombia** con: cert. vigencia póliza RCE, **archivo KML**, **matriz de riesgos en el formato de la Aerocivil**, autorización ZNVD | ⚠️ BitaFly genera **KMZ**, no KML; la matriz de riesgo no está en formato Aerocivil; no hay expediente ni radicación |
| **B10** | 100.805(c)(d) | Antelación mínima: **15 días hábiles** en espacio aéreo controlado, **10 días hábiles** en corredores BVLOS | ❌ La programación no valida antelación |
| **B11** | 100.215(b) | EVLOS: observadores con posición fija, ≤750 m cada uno, primer observador ≤1.500 m del piloto, comunicación ininterrumpida | ⚠️ "Observador" existe como rol pero sin geometría ni validación |
| **B12** | 100.215(c)(4) | BVLOS se clasifica **I a V** por distancia máxima (5/10/15/20 km / 80% del enlace) | ❌ No se clasifica |
| **B13** | 100.545(b)(c) | JP y GSMS con **exclusividad** (no vinculados a otro explotador); JP con ≥100 h certificadas + ≥40 h SMS por CIAC | ❌ Sin validación. Con multi-organización esto es hoy verificable y no se verifica |
| **B14** | 100.410(a)(10) | Radio VHF de banda aérea cuando se opera en/cerca de aeródromos | ❌ No se registra ni se exige en el despacho |
| **B15** | 100.440(a)(6) | En BVLOS: monitoreo **en tiempo real** de condiciones meteorológicas durante toda la operación | ⚠️ El módulo de clima consulta al planear/despachar, no monitorea en vuelo |

**Conclusión del análisis**: la norma nueva no solo valida las 3 ideas del usuario — las convierte
en obligaciones. El "comando y control" es literalmente B6+B7+B8. La "programación automática
ante la Aerocivil" es B9+B10. Y aparece una brecha que el usuario no mencionó y que es la más
urgente de todas: **B1, tiempos de servicio y descanso**, sin la cual ningún explotador puede
demostrar cumplimiento de 100.540.

---

## 2. Los cinco frentes de trabajo

Los cuatro que pidió el usuario, más uno que la norma impone.

| Frente | Origen | Riesgo técnico | Valor regulatorio |
|---|---|---|---|
| **F1 — Rediseño de frontend y distribución** | Usuario | Bajo | Indirecto |
| **F2 — Comando y Control (C2 en vivo)** | Usuario + B6/B7/B8 | **Alto** | Muy alto (habilita categoría específica BVLOS) |
| **F3 — SMS fácil de integrar y aplicar** | Usuario + B3 | Medio | Alto |
| **F4 — Autorizaciones Aerocivil automáticas** | Usuario + B9/B10 | **Alto** (dependencia externa) | Alto |
| **F5 — Tiempos de servicio, vuelo y descanso** | **Norma (B1/B2)** | Bajo | **Crítico — hoy incumplido** |

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

## 4. F2 — Comando y Control (C2 en vivo)

Este es el frente de mayor riesgo técnico y el de mayor valor diferencial. Requiere honestidad
sobre lo que es posible.

### 4.1 Qué exige exactamente la norma

`100.415(a)(2)(iii)` — el software de control debe suministrar **en todo momento**:
posición georreferenciada, azimuth, velocidad horizontal, altura, velocidad vertical, nivel de
energía, **calidad de la señal del enlace C2**, e **imagen de video frontal desde la UA**.

`100.440(a)(12)` — para BVLOS, un **sistema tecnológico de gestión de vuelo UAS** con geocercas
en toda el área de operación y visualización de telemetría en todas las fases.

Apéndice 2, Tabla 1 — la telemetría en BVLOS debe ser "robusta, redundante y con
**almacenamiento/registro de eventos críticos**", y deben existir "sistemas avanzados de
detección, alertamiento y mitigación de degradación del enlace".

Traducción: BitaFly no necesita *pilotar* el dron. Necesita **recibir, mostrar, geocercar,
alertar y archivar** — que es precisamente donde un SaaS aporta y donde el fabricante no llega.

### 4.2 De dónde salen los datos — las tres vías, con su costo real

| Vía | Cómo funciona | Alcance | Esfuerzo | Veredicto |
|---|---|---|---|---|
| **A — DJI Cloud API** | DJI Pilot 2 / Dock se conectan por **MQTT a nuestro servidor** para telemetría, y publican video a nuestro servidor de streaming (RTMP/GB28181/WHIP/Agora). Protocolo abierto y documentado por DJI. | Enterprise: Matrice 30/300/350/4, Mavic 3E/T con Pilot 2, Dock 1/2/3 | **Medio** — servidor propio, sin app nativa | ✅ **Vía principal** |
| **B — DJI Mobile SDK (MSDK)** | App **nativa** Android/iOS conectada al RC que reenvía telemetría y video a nuestro backend. | Consumo + enterprise (Mini, Air, Mavic) | **Muy alto** — hoy el APK es un cascarón Capacitor en *remote URL mode*; esto exige una app nativa real, con su ciclo de release y aprobación DJI | 🔶 Fase posterior |
| **C — Genérico MAVLink / RTSP** | Drones no-DJI (ArduPilot/PX4) o cualquier cámara IP en la estación. | Todo lo demás | Bajo por vía, alto en soporte | 🔶 Nicho, después |

**Decisión propuesta**: v2 arranca con **A (DJI Cloud API)**. Es la única que cubre los requisitos
de la categoría específica/BVLOS —que es justo el segmento que necesita C2— sin construir una app
nativa desde cero. B queda planificada pero fuera del alcance inicial, y es la que abriría C2 al
piloto independiente con equipo de consumo.

> ⚠️ **Riesgo a validar antes de comprometer la fase**: el acceso a la DJI Cloud API requiere una
> cuenta de desarrollador DJI Enterprise y aprobación de aplicación. No lo doy por hecho —
> es la primera tarea verificable del frente F2 y puede modificar el plan.

### 4.3 Arquitectura — y por qué no cabe en Vercel

Restricción dura: **Vercel es serverless**. No sostiene conexiones MQTT persistentes, ni
WebSockets de larga duración, ni ingesta/transcodificación de video. Intentarlo es la principal
forma en que este frente puede fracasar.

```
  Dron / Dock / Pilot 2
        │
        ├── MQTT (telemetría, ~1–10 Hz) ──►  c2-gateway  (servicio siempre encendido)
        │                                     - broker MQTT (EMQX/Mosquitto) con ACL por org
        │                                     - motor de reglas: geocercas, límites, enlace
        │                                     - buffer caliente en memoria/Redis
        │                                     - persistencia: 1 Hz → Postgres, full → R2 (.gz)
        │
        └── RTMP/WHIP (video) ─────────────►  media-server (MediaMTX / Cloudflare Stream)
                                              - reempaqueta a LL-HLS / WebRTC
                                              - claves de publicación rotables por sesión

  Navegador (BitaFly v2)
        ├── WebSocket ◄── c2-gateway   (telemetría en vivo + alertas)
        └── LL-HLS/WebRTC ◄── media-server (video, URL firmada de corta vida)
```

- **`c2-gateway`**: Node/Fastify en un runtime siempre encendido. El repo **ya tiene precedente**
  de servicio fuera de Vercel: `railway-robot/` (Express + Playwright en Railway). Se reutiliza
  el mismo patrón de despliegue.
- **Media server**: primera opción **Cloudflare Stream** (el proyecto ya está todo en
  Cloudflare R2, mismo proveedor, mismo facturador, cero servidores que operar). Alternativa
  autoalojada: MediaMTX. Se decide con números de costo por hora de operación.
- **Frontend**: mapa en vivo (MapLibre GL, no Google Maps — el proyecto ya usa OSM/Nominatim),
  HUD de telemetría con los 9 campos de 100.415, panel de video, y línea de eventos.

### 4.4 Persistencia — el punto donde esto se cae si se hace mal

Telemetría a 10 Hz × 1 hora × 1 dron = 36.000 filas. Con 20 organizaciones volando a diario,
Postgres se vuelve el cuello de botella y la factura.

**Solución, reutilizando un patrón que BitaFly ya tiene probado**: es exactamente lo que hace hoy
el Replay GPS (JSON comprimido en R2, no filas en Postgres).

- **En vivo**: buffer en memoria/Redis en `c2-gateway`, nunca toca Postgres.
- **Persistencia continua**: submuestreo a **1 Hz** → `c2_telemetry` en Postgres (suficiente para
  auditoría y para reconstruir la trayectoria).
- **Al cerrar sesión**: la traza completa a tasa nativa se comprime y se sube a R2 como el replay
  actual, y se enlaza al vuelo. Así el "registro de eventos críticos" del Apéndice 2 queda
  íntegro sin inflar la base.
- **Eventos** (`c2_events`): siempre en Postgres, son pocos y son la evidencia regulatoria.

### 4.5 Geocercas (100.440(a)(12))

Se derivan de la zona ya definida en la programación (`flight_authorizations.plan_data.points`)
— **no se pide al usuario dibujarlas otra vez**. `c2-gateway` evalúa cada muestra contra el
polígono + techo de altura y genera un `c2_event` de tipo `geofence_breach`, que:
1. alerta en pantalla al piloto y al jefe de pilotos,
2. crea automáticamente un **borrador de reporte SMS** (ver F3).

### 4.6 Lo que BitaFly explícitamente NO hará

No enviar comandos al dron (despegar, cambiar waypoint, RTH remoto). Es una decisión de
producto y de responsabilidad: convierte a BitaFly en parte de la cadena de mando, con
implicaciones de certificación y de seguro que no queremos. BitaFly **observa, registra, alerta
y documenta**. El mando lo conserva la estación de control del fabricante, como exige la propia
norma al hablar de "estación de control de vuelo".

---

## 5. F3 — SMS fácil de integrar y aplicar

### 5.1 Diagnóstico honesto

El SMS de BitaFly **no está incompleto — está desconectado**. Tiene 9 pestañas, matriz de riesgo
5×5, SPI con fórmula oficial, GAP de 100 preguntas, acciones correctivas de 3 fuentes, VOR/MOR
con línea de tiempo, capacitación. Es más completo que el de muchos competidores.

El problema es que **exige que alguien ya sepa hacer SMS**. Una organización que arranca ve 9
pestañas vacías y no sabe por dónde empezar. Y los datos operacionales que la app ya tiene
(alertas del import DJI, mantenimientos vencidos, exámenes reprobados) **no alimentan el SMS
automáticamente** — un humano tiene que darse cuenta y transcribir.

"Fácil de integrar y aplicar" = resolver esas dos cosas.

### 5.2 Asistente de implantación por fases

Un wizard que lleva a la organización de cero a "SMS aceptado por la Aerocivil", alineado con
RAC 219 y las directivas MAUT-1.0-22-006 (aceptación del SMS) y MAUT-1.0-22-007.

Fases con % de avance visible, cada una desbloqueando la siguiente:
1. **Política y objetivos** — designar Gerente de Seguridad Operacional (valida 100.545(d):
   formación acreditada, curso avanzado, ≥1 año de experiencia), política firmada, alcance.
2. **Gestión del riesgo** — matriz + tolerabilidad (hoy se siembra OACI Doc 9859, se conserva) +
   **catálogo de peligros precargado por tipo de operación**.
3. **Aseguramiento** — ≥3 SPI activos con datos de al menos 3 meses, primera autoevaluación GAP.
4. **Promoción** — cronograma de capacitación SMS con asistencia registrada, MSMS publicado.
5. **Listo para aceptación** — expediente descargable con toda la evidencia.

### 5.3 Plantillas reales, no ejemplos vacíos

Hoy existe `EXAMPLE_INDICATORS` (6 indicadores tipo). Se extiende a **paquetes por tipo de
operación** (las 10 categorías oficiales de `lib/missionTypes.js`): peligros típicos, barreras
sugeridas, SPI recomendados y umbrales de referencia. El usuario los adopta, edita o descarta —
**nunca se fabrican datos operacionales**, solo definiciones, exactamente como se hizo con
`EXAMPLE_INDICATORS`.

### 5.4 SMS alimentado por la operación (el cambio de fondo)

Cada uno de estos eventos, que la app **ya detecta hoy y solo notifica**, pasa a generar un
**borrador de reporte SMS** con su peligro sugerido, pendiente de que el gerente SMS lo confirme
o descarte:

| Evento ya detectado | Origen actual | Peligro sugerido |
|---|---|---|
| Alertas en log DJI (`hasAlerts`) | `import-dji` | Falla de sistema en vuelo |
| Batería sobre umbral de retiro (200 ciclos) | Escáner del dashboard | Falla de energía |
| Mantenimiento mayor/menor vencido | Cron diario | Aeronavegabilidad |
| Examen de capacitación reprobado/vencido | `training-exam-reminder` | Competencia del personal |
| **Geocerca violada** (nuevo, F2) | `c2-gateway` | Incursión en espacio aéreo |
| **Pérdida/degradación de enlace C2** (nuevo, F2) | `c2-gateway` | Pérdida de mando y control |
| **Exceso de tiempo de servicio** (nuevo, F5) | Motor de tiempos | Fatiga del piloto |

Esto convierte el SMS de "formulario que alguien debe recordar llenar" en "bandeja de entrada de
lo que realmente pasó". Es el mayor salto de valor de todo el frente.

> Nota de diseño: el borrador **nunca** se convierte en reporte automáticamente. Un reporte de
> seguridad operacional con consecuencias regulatorias siempre lo confirma una persona. El
> sistema solo evita que se pierda.

### 5.5 Reporte mensual consolidado (cierra B3)

`100.535(a)(26)` exige un único envío mensual, en los primeros 5 días hábiles, con estadística
de operaciones + indicadores SPI + reportes MOR. Hoy son tres cosas separadas. Se unifica en un
**paquete mensual** con acuse de envío (reutilizando el patrón ya probado de
`aerocivil_monthly_reports` + su cron recordatorio).

### 5.6 MSMS como documento vivo

Hoy el MSMS es un archivo que alguien sube a Manuales. Propuesta: generarlo desde la
configuración real (política, matriz vigente, SPI activos, estructura de cargos, cronograma de
capacitación), versionado, con el histórico de acuses que Manuales ya maneja. El archivo subido
sigue siendo válido para quien lo prefiera — se añade una vía, no se quita ninguna.

---

## 6. F4 — Autorizaciones de vuelo ante la Aerocivil

### 6.1 Lo que dice la norma, textualmente

`100.805(a)`: la solicitud se presenta **"por medio de la Plataforma UAS Colombia"** adjuntando:
(1) certificado de vigencia de la póliza RCE, (2) **archivo KML** del área de operación,
(3) **matriz de análisis y mitigación de riesgos en el formato establecido por la Aerocivil**,
(4) autorización para espacios restringidos y ZNVD (trámite ante la FAC).

Antelación: **15 días hábiles** en espacio aéreo controlado; **10 días hábiles** en corredores
BVLOS. Y `100.810(b)`: **no se puede volar hasta tener la autorización**.

### 6.2 El problema y la respuesta honesta

La Plataforma UAS Colombia **no publica una API**. Automatizar la radicación implica RPA
(automatización del navegador) contra un portal de la autoridad aeronáutica, con custodia de
credenciales del cliente. Es frágil por definición: un cambio de maquetado del portal rompe la
integración, y un captcha la detiene.

**El repo ya tiene el precedente exacto**: `railway-robot/` (Express + Playwright automatizando
el portal de la Aerocivil). Existe, funciona, y también demuestra el costo de mantenerlo.

Por eso el frente se parte en dos entregables independientes, y el primero da el 80% del valor
sin ningún riesgo externo:

### 6.3 Fase 4a — Expediente listo para radicar (sin dependencia externa)

Un botón "Preparar expediente Aerocivil" en cada misión programada que genera un paquete
completo y validado:

- ✅ **Archivo KML** (no KMZ) del área — cierra B9. Es un cambio menor en `lib/flightPlanDocs.js`.
- ✅ **Matriz de riesgos en el formato de la Aerocivil** — se deriva de la evaluación SORA y de la
  matriz SMS que la organización ya tiene. *Requiere obtener el formato oficial vigente; es una
  tarea de insumo, no de desarrollo.*
- ✅ **Certificado de vigencia de póliza RCE** — ya vive en `insurance_policies`; se adjunta y se
  valida que cubra la fecha de operación y el serial de la UA (`100.410(a)(2)(i)`).
- ✅ **Validación previa de antelación** (B10): si faltan menos de 15 días hábiles y la zona es
  espacio aéreo controlado, se advierte antes de dejar programar. Mismo patrón del aviso de
  conflicto de agenda del PIC, que ya existe.
- ✅ **Checklist de completitud**: CDO-U vigente, CIPU y adiciones del PIC vigentes para el tipo
  de operación (`100.810(d)`), aeronave registrada, póliza vigente. Un solo semáforo.
- ✅ Seguimiento de estado del trámite (radicado, en revisión, autorizada, negada) con el número
  de autorización — extendiendo `flight_authorizations.aerocivil_auth_number`, que ya existe.

Esto elimina el 80% del trabajo manual y **no depende de que la Aerocivil no cambie nada**.

### 6.4 Fase 4b — Radicación asistida (condicional)

Sólo si 4a está estable y el usuario lo autoriza expresamente:

- Servicio `aerocivil-agent` (mismo runtime que `c2-gateway`, patrón `railway-robot`).
- **Nunca almacena la contraseña del cliente en claro ni de forma reutilizable por el sistema**:
  cifrado con clave gestionada, uso auditado en `audit_log`, revocable por el usuario en
  cualquier momento, y consentimiento explícito por escrito antes del primer uso.
- **Modo asistido antes que automático**: el agente prellena el formulario y **se detiene para
  que el humano revise y confirme el envío**. La radicación automática sin supervisión solo se
  considera después de un histórico de confiabilidad demostrado.
- Detección de cambios del portal con alerta al equipo, en vez de fallar en silencio.

> **Decisión pendiente del usuario** (§11): si prefiere 4a sola (recomendado para v2) o
> comprometer 4b desde el inicio.

---

## 7. F5 — Tiempos de servicio, vuelo y descanso (nuevo, obligatorio)

No estaba en la lista del usuario. Es la brecha más grave que encontré: `100.540` es una sección
completa, nueva, con límites numéricos duros, y `100.535(a)(10)(11)(12)` obliga a **prevenir la
fatiga, registrar todo y certificar anualmente**. Hoy BitaFly no tiene absolutamente nada de esto.

### 7.1 Reglas exactas a implementar

| Límite | Valor | Fuente |
|---|---|---|
| Vuelo efectivo por mes calendario | **90 h** | 100.540(c)(1) |
| Vuelo máximo por 24 h — BVLOS | **6 h** | 100.540(d)(1)(i) |
| Vuelo máximo por 24 h — VLOS/EVLOS | **8 h** | 100.540(d)(1)(ii) |
| Operación continua sin pausa | **2 h**, luego **30 min** de descanso | 100.540(e) |
| Descanso tras servicio ≤ 8 h | **10 h consecutivas** | 100.540(f)(2)(i) |
| Descanso tras servicio > 8 h | **12 h consecutivas** | 100.540(f)(2)(ii) |
| Descanso mínimo absoluto | Nunca inferior al servicio inmediatamente anterior | 100.540(f)(2)(iii) |
| Fraccionamiento del descanso | **Prohibido** | 100.540(f)(2)(iv) |

Además, el tiempo de vuelo efectivo debe estar **dentro** del tiempo de servicio asignado —
cumplir el límite de vuelo no exime del límite de servicio (100.540(b)(2)).

### 7.2 Diseño

- El **tiempo de vuelo efectivo** se deriva de lo que ya se registra: `flights.total_time`. No se
  le pide al piloto capturarlo dos veces.
- El **tiempo de servicio** sí es nuevo: incluye preparación, monitoreo activo, espera en
  disponibilidad, entrenamiento programado y actividades posteriores. Se captura con dos
  botones — "Inicio de servicio" / "Fin de servicio" — en el modo campo, y automáticamente al
  despachar y cerrar vuelo si el piloto olvidó marcarlo.
- **Bloqueo de despacho** cuando un límite se excedería, con el mismo patrón ya probado en el
  proyecto para el examen de capacitación reprobado y el mantenimiento menor vencido: pantalla
  de bloqueo dedicada, no un aviso ignorable. Con excepción documentada y firmada por el jefe de
  pilotos cuando la norma lo permita.
- **Alertas preventivas**: al 80% del límite mensual, y antes de programar una misión que
  llevaría al piloto a exceder.
- **Certificación anual** (B2): documento por piloto con el tiempo acumulado del año calendario,
  firmado por el Jefe de Pilotos — un formato más en Reportes, mismo patrón que el resto.
- **Vista de planificación** para el Jefe de Pilotos: quién está disponible hoy, quién está en
  descanso obligatorio y hasta cuándo. Esto convierte una obligación en una herramienta útil.

---

## 8. Modelo de datos

Todas las tablas nuevas siguen las convenciones ya establecidas: `organization_id`, RLS con
`private.user_org_id()` / `private.user_is_manager()`, políticas envueltas en `(SELECT ...)`
(optimización InitPlan de la auditoría 2026-07-14), y **nada de columnas derivadas** — los
cálculos se hacen al leer, como ya se hace con SPI, zonas de riesgo y % de cumplimiento.

### 8.1 F2 — Comando y Control

| Tabla | Propósito | Notas |
|---|---|---|
| `c2_devices` | Vincula una `aircraft` con su fuente de telemetría | `device_sn`, `source` (`dji_cloud`/`msdk`/`mavlink`), `bound_at`, `status`. Credenciales **nunca** aquí — en el gestor de secretos |
| `c2_sessions` | Una sesión de vuelo en vivo | FK a `aircraft`, `pilots`, `flight_authorizations`, `flights`. `started_at`, `ended_at`, `link_quality_min/avg`, `replay_path` (R2) |
| `c2_telemetry` | Muestras a **1 Hz** | Particionada por mes. Retención en Postgres: 90 días; la traza completa vive en R2 |
| `c2_events` | Eventos críticos | `type` (`link_lost`/`link_degraded`/`geofence_breach`/`low_battery`/`rth_triggered`/`altitude_exceeded`), severidad, `sms_report_id` nullable |
| `c2_geofences` | Geocercas de la sesión | Derivadas de `plan_data.points` + techo. `breach_count` |
| `c2_stream_keys` | Claves de publicación de video | Rotables, TTL corto, una por sesión, revocables |

### 8.2 F5 — Tiempos de servicio

| Tabla | Propósito |
|---|---|
| `duty_periods` | `pilot_id`, `type` (`servicio`/`descanso`/`disponibilidad`/`entrenamiento`), `started_at`, `ended_at`, `source` (`manual`/`auto_dispatch`/`auto_close`) |
| `duty_exceptions` | Excepción autorizada: motivo, quién autoriza (JP), evidencia |
| `duty_annual_certifications` | Certificación anual 100.535(a)(12): `pilot_id`, `year`, `total_hours`, `certified_by`, `certified_at`, `document_path` |

El **motor de cumplimiento** es una función pura compartida cliente/servidor
(`lib/dutyCompliance.js`), mismo patrón exacto que `lib/trainingCompliance.js` y
`lib/safetyIndicatorStats.js` — probada con tests, sin estado, sin columna derivada.

### 8.3 F4 — Autorizaciones Aerocivil

| Tabla | Propósito |
|---|---|
| `aerocivil_authorization_requests` | Expediente por misión: estado (`borrador`/`listo`/`radicado`/`en_revision`/`autorizada`/`negada`), `submitted_at`, `radicado_number`, `response_document_path` |
| `aerocivil_request_documents` | Adjuntos del expediente (KML, matriz, póliza, ZNVD) con checksum |
| `aerocivil_credentials` | **Solo si se aprueba 4b.** Credenciales cifradas, `consent_at`, `consent_by`, `revoked_at`, `last_used_at` |

### 8.4 Adiciones a tablas existentes (aditivas, todas nullable)

| Tabla | Columna | Motivo |
|---|---|---|
| `aircraft` | `firmware_version`, `firmware_previous_version`, `firmware_backup_path`, `firmware_updated_at` | B5 — 100.535(a)(7) |
| `aircraft` | `c2_link_type`, `c2_link_notes` | Apéndice 2 (a)(4) |
| `flight_authorizations` | `bvlos_class` (I–V), `airspace_type`, `requires_pcuas` | B12, B10 |
| `flight_authorizations` | `observers jsonb` (posiciones fijas de observadores EVLOS) | B11 — 100.215(b) |
| `pilots` | `certified_hours`, `sms_training_hours`, `exclusive_operator` | B13 — 100.545(c) |
| `organizations` | `feature_flags jsonb` | Activación gradual de v2 |

### 8.5 Retención (B4 — 5 años)

`100.535(a)(29)` exige conservar **registros operacionales** 5 años. Hay que distinguir:

- **Registro operacional** (bitácora, mantenimiento, autorizaciones, reportes SMS, tiempos de
  servicio): retención **5 años mínimo, en todos los planes**. Esto es cumplimiento, no una
  característica de plan. *No hay hoy ninguna purga que los borre — se confirma y se documenta.*
- **Replay GPS y video C2**: son **evidencia complementaria**, no el registro operacional en sí.
  La retención por plan puede mantenerse — pero debe quedar **explícito en la política y en la
  interfaz**, para que ningún explotador crea que su obligación de 5 años está cubierta por un
  replay de 30 días. Se propone además una **exportación de archivo** para que el cliente
  conserve por su cuenta lo que vaya a expirar.

> Esta distinción es una decisión de producto con implicaciones legales. Se marca para
> validación explícita (§11).

---

## 9. Arquitectura y organización del código

### 9.1 Monorepo real

Hoy `demo-enterprise/` y `railway-robot/` cuelgan del repo sin ningún tooling que declare la
relación — ya documentado como deuda en la limpieza del 2026-08-01. Con dos servicios nuevos
(`c2-gateway`, `aerocivil-agent`) esto deja de ser incómodo y pasa a ser insostenible.

```
apps/
  web/               ← el Next.js actual (movido, sin cambios funcionales)
  c2-gateway/        ← nuevo, siempre encendido (Railway/Fly)
  aerocivil-agent/   ← nuevo, condicional a F4b
  demo-enterprise/   ← movido tal cual
packages/
  ui/                ← sistema de diseño extraído
  domain/            ← reglas de negocio puras y testeadas
  db/                ← tipos y migraciones
```

Herramienta: **pnpm workspaces + Turborepo**. La migración del árbol se hace en la rama v2 y solo
se mergea con todo lo demás.

### 9.2 Capa de dominio pura

Las reglas de negocio que hoy viven mezcladas en route handlers y componentes se extraen a
`packages/domain`: `planLimits`, `trainingCompliance`, `safetyIndicatorStats`, `soraEngine`,
y las nuevas `dutyCompliance` y `c2Rules`. Funciones puras, sin Supabase, testeables.

### 9.3 Tests — hoy son cero

El proyecto no tiene ninguna prueba automatizada. Toda la verificación histórica ha sido
`lint` + `build` + revisión de código + QA manual. Para v2 eso no alcanza: el motor de tiempos de
servicio tiene reglas numéricas que un humano no puede verificar de memoria, y un error ahí
**bloquea vuelos legítimos o autoriza vuelos ilegales**.

Mínimo no negociable: **Vitest sobre `packages/domain`**, con cobertura real de
`dutyCompliance` (todos los límites de 100.540 y sus casos borde), `planLimits`,
`trainingCompliance` y las reglas de geocerca. No se propone testear la UI ni las 181 rutas API
— sería un proyecto aparte.

### 9.4 Validación en los bordes

El proyecto es JavaScript sin TypeScript, y migrarlo completo no es realista ni fue pedido.
Propuesta pragmática: **zod** en los bordes de API nuevos (`c2-gateway`, rutas v2) para validar
entradas, y JSDoc en `packages/domain`. Cierra el riesgo de mass-assignment por construcción, en
línea con la convención ya existente de campos explícitos.

---

## 10. Seguridad

El C2 abre la primera superficie de **tiempo real, dispositivos y video** de BitaFly. Es
categóricamente distinta de todo lo anterior.

### 10.1 Autenticación de dispositivos (no de usuarios)

Un dron o dock se autentica con credenciales de máquina, no con una sesión de Supabase Auth.
Tokens por dispositivo, de vida corta, rotables y revocables, emitidos por `c2-gateway` tras
verificar la vinculación en `c2_devices`.

### 10.2 Aislamiento multi-tenant en MQTT

El error clásico: un broker MQTT con topics globales donde cualquier cliente se suscribe a
`#`. Regla: topics con espacio de nombres obligatorio `org/{orgId}/aircraft/{sn}/...` y **ACL por
token** que impide publicar o suscribirse fuera del propio `orgId`. Se prueba explícitamente con
un test de intento de cruce entre organizaciones.

### 10.3 Video

- URLs de reproducción **firmadas y de vida corta**, nunca públicas.
- Claves de publicación por sesión, rotadas al cerrar.
- **El video de una operación puede contener a terceros identificables** → aplica Ley 1581 de
  2012 y el Decreto 1377 de 2013. La Política de Privacidad actual **no contempla video en
  vivo ni su almacenamiento**: hay que actualizarla antes de lanzar, no después. Incluye
  definir retención, finalidad, y quién dentro de la organización puede verlo.

### 10.4 RLS y el camino caliente

`c2_telemetry` recibe miles de escrituras por sesión. Pasarlas por RLS por fila es un problema de
rendimiento. Patrón propuesto (consistente con lo que el proyecto ya hace en
`lib/notify.js` y los crons): `c2-gateway` escribe con **service role** y filtra por organización
**en la aplicación**, mientras que la lectura desde el navegador pasa siempre por RLS o por un
WebSocket autenticado que valida la pertenencia antes de emitir. Las tablas de baja cardinalidad
(`c2_sessions`, `c2_events`, `c2_devices`) sí llevan RLS normal.

### 10.5 Credenciales de la Plataforma UAS Colombia (si se aprueba F4b)

Custodiar credenciales de un tercero ante una autoridad estatal es el riesgo más alto de todo el
plan. Condiciones mínimas: cifrado con clave gestionada fuera de la base, consentimiento
explícito registrado, cada uso auditado en `audit_log`, revocación inmediata por el usuario, y
**modo asistido con confirmación humana** antes de cualquier envío.

### 10.6 Deuda de seguridad conocida a resolver en v2

De la auditoría del 2026-07-14, dos puntos siguen abiertos y este es el momento natural para
cerrarlos, porque implican cambios mayores que ya no hay que hacer dos veces:
- `next` 14.2.x → 15.x (DoS pendientes).
- `jspdf` 2.x → 5.x (ReDoS; exige reprobar los ~14 generadores de PDF).

Además: habilitar `auth_leaked_password_protection` en Supabase (pendiente desde hace meses,
es un interruptor) y evaluar hacer el repositorio privado — hoy es público y expone la
arquitectura de seguridad interna descrita en `CLAUDE.md`.

---

## 11. Decisiones que requieren tu confirmación

No bloquean el arranque del plan, pero sí cambian el alcance. Las dejo explícitas en vez de
asumirlas:

1. **DJI Cloud API** — ¿tienes o puedes gestionar cuenta de desarrollador DJI Enterprise? Sin
   ella, F2 tendría que ir por la vía B (app nativa MSDK), que es un proyecto en sí mismo y
   cambia el cronograma por completo.
2. **Segmento objetivo de C2** — ¿es para tus clientes enterprise con Matrice/Dock (vía A,
   viable ya) o necesitas que funcione también con drones de consumo del piloto independiente
   (vía B, mucho más costoso)?
3. **F4b — radicación automática** — ¿comprometemos la automatización del portal desde v2, con
   la custodia de credenciales que implica, o entregamos primero solo el expediente listo para
   radicar (4a) y decidimos 4b con datos de uso?
4. **Retención de 5 años vs. planes** — ¿confirmas la distinción de §8.5 (registros
   operacionales 5 años en todos los planes; replay y video con retención por plan, declarada
   explícitamente)?
5. **Formato oficial de la matriz de riesgos de la Aerocivil** — `100.805(a)(3)` la exige "en el
   formato establecido por la Aerocivil". ¿Lo tienes? Es un insumo, no desarrollo, pero bloquea
   la entrega de F4a.
6. **Prioridad entre frentes** — mi recomendación es F5 → F3 → F1 → F2 → F4 (ver §12). Si tu
   prioridad comercial es otra (p. ej. C2 primero como diferenciador de venta), lo reordenamos.

---

## 12. Secuencia recomendada

El orden **no** es el de la lista del usuario, y quiero explicar por qué.

| Orden | Frente | Razón |
|---|---|---|
| **1º** | **F5 — Tiempos de servicio** | Es un incumplimiento **actual** de una norma vigente. Es además el frente más pequeño y de menor riesgo: valida el aislamiento de desarrollo y el sistema de diseño con algo acotado. |
| **2º** | **F3 — SMS** | Alto valor, riesgo medio, sin dependencias externas. La conexión "eventos operacionales → SMS" da un salto de utilidad inmediato. |
| **3º** | **F1 — Rediseño** | Necesita que F5 y F3 ya existan, para que el rediseño acomode el mapa completo de módulos y no haya que rehacerlo. Empieza antes en paralelo con `packages/ui`. |
| **4º** | **F2 — C2** | El más grande y el de mayor riesgo. Arranca con la validación de acceso a DJI Cloud API, que puede cambiar el plan. |
| **5º** | **F4a → F4b** | 4a en cualquier momento (es autónomo). 4b solo al final, y solo si se aprueba. |

Cada frente termina en una **puerta de verificación** contra el Supabase branch y el deploy de
preview, con criterios de aceptación escritos antes de empezar a construir. Ninguno se mergea a
`main`.

---

## 13. Qué NO está en este plan (a propósito)

Para que el alcance sea honesto:

- **No** enviar comandos de vuelo al dron (§4.6).
- **No** migrar a TypeScript de forma completa (§9.4).
- **No** tests de UI ni de las 181 rutas API (§9.3).
- **No** rehacer el landing público, las páginas SEO ni el Panel Socio — funcionan y están fuera
  del "interior de la app" que se pidió mejorar.
- **No** tocar el flujo de pagos ePayco. Es lo más sensible de producción y no lo pide ninguno
  de los cinco frentes.
- **No** resolver las 4 páginas huérfanas heredadas — se decidirán durante F1, cuando el mapa
  nuevo diga si tienen lugar o se eliminan.

---

*Documento vivo. Se actualiza al cerrar cada decisión de §11 y al completar cada frente.*
