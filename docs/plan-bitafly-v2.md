# Plan BitaFly v2 — Rediseño, Comando y Control, SMS y Autorizaciones Aerocivil

> **Estado: PLANEACIÓN. Cero desarrollo.**
> Documento de control del proyecto. Se actualiza a medida que se toman decisiones.
> Nada de lo aquí descrito toca `main` ni la base de datos de producción.
>
> ⚠️ **Cambio de postura (2026-08-22) — leer §16 antes que nada.** Las secciones 0–15 se
> escribieron asumiendo *evolución aditiva*. Tras la auditoría del modelo de datos, el proyecto
> pasa a ser un **rediseño del esquema desde cero con migración**. §16 contiene la evidencia, la
> decisión y el orden revisado; donde §16 contradiga a una sección anterior, **manda §16**.

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
| **F2-a — Comando y Control, vía RC + Pilot 2** | Usuario + B6/B7/B8 | **Medio** — bajó tras validar que la integración con Pilot 2 es una página web, no una app nativa (§4.2) | Muy alto (habilita categoría específica) |
| **F2-b — C2 con Docks en FlightHub 2** | Usuario | ⏸ **Diferida** — sin verificación posible hoy (§4.5, V2) | Alto, pero no bloquea cumplimiento |
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

> **Actualizado tras validación técnica (2026-08-22)** — se verificó la documentación oficial de
> DJI (`dji-sdk/Cloud-API-Doc`, clonada y leída) y la del FlightHub 2. Las decisiones de esta
> sección ya no son hipótesis: están contrastadas contra la especificación real.

### 4.1 Qué exige exactamente la norma

`100.415(a)(2)(iii)` — el software de control debe suministrar **en todo momento**:
actitud de vuelo, posición georreferenciada, azimuth, velocidad horizontal, altura, velocidad
vertical, nivel de energía, **calidad de la señal del enlace C2**, e **imagen de video frontal
desde la UA**.

`100.440(a)(12)` — para BVLOS, un **sistema tecnológico de gestión de vuelo UAS** con geocercas
en toda el área de operación y visualización de telemetría en todas las fases.

Apéndice 2, Tabla 1 — la telemetría en BVLOS debe ser "robusta, redundante y con
**almacenamiento/registro de eventos críticos**", con "sistemas avanzados de detección,
alertamiento y mitigación de degradación del enlace".

BitaFly no necesita *pilotar* el dron. Necesita **recibir, mostrar, geocercar, alertar y
archivar** — que es donde un SaaS aporta y donde el fabricante no llega.

### 4.2 Hallazgo clave: la integración con DJI Pilot 2 es una página web

La documentación oficial lo confirma: DJI Pilot 2 tiene un portal **"Open Platforms"** en su
sección de Cloud Service, donde el usuario introduce una **URL http/https**. Pilot 2 carga esa
página en un WebView y toda la interacción ocurre mediante el puente JavaScript
`window.djiBridge` (`platformVerifyLicense`, `apiGetToken`, `platformLoadComponent`…).

**Consecuencia directa: no hace falta una app nativa.** La integración C2 con Pilot 2 es una
página web servida por BitaFly — exactamente la competencia que el proyecto ya tiene. Esto
elimina el mayor riesgo que tenía este frente en la versión anterior del plan.

Requisitos formales: registrarse como desarrollador DJI y crear una aplicación "Cloud API" para
obtener **APP ID, APP Key y APP License** (ya disponible — confirmado por el usuario).

### 4.3 Modelos soportados — y por qué coinciden con la decisión comercial

Según la tabla oficial de modelos soportados por la Cloud API:

| Aeronave | Gateway |
|---|---|
| Matrice 350 RTK | DJI RC Plus + Pilot 2 |
| Matrice 300 RTK | DJI RC Plus / Smart Controller Enterprise + Pilot 2 |
| Matrice 30 / 30T | DJI RC Plus + Pilot 2 · DJI Dock |
| Mavic 3 Enterprise (M3E/M3T) | DJI RC Pro + Pilot 2 |
| Matrice 3D / 3TD | DJI Dock 2 |

La Cloud API **no soporta** M200/M200 V2, M2E, P4R, M2EA ni drones de consumo. La aeronave nunca
se conecta directo: siempre pasa por un *gateway* (RC o Dock).

**Decisión comercial confirmada por el usuario: C2 solo para planes superiores a Escuadrilla**
(Flota y Enterprise). Encaja perfecto — el hardware que la Cloud API soporta es exactamente
equipo enterprise, que es el que tienen esos clientes. La restricción comercial y la técnica
coinciden, no se contradicen.

> **Efecto de producto a tener presente**: desde el cambio de precios de agosto 2026, Escuadrilla
> y Flota comparten funcionalidad idéntica y solo difieren en capacidad y precio. **C2 vuelve a
> ser el primer diferenciador real de funcionalidad entre ambos planes.** Es un argumento de
> venta fuerte para el salto Escuadrilla → Flota.

### 4.4 Vía A — Operación con RC en campo (Pilot 2 → BitaFly)

Es la vía principal, y **no interfiere con el Dock ni con FlightHub 2** (§4.5).

- **Telemetría por MQTT** en `thing/product/{sn}/osd`, con `pushMode: 0` = **frecuencia estable
  de 0,5 Hz** (una muestra cada 2 s). Estados y eventos van por `thing/product/{sn}/state`,
  reportados solo al cambiar.
- **Video en vivo**: la Cloud API soporta **RTMP, RTSP, GB28181 y Agora**. El servidor ordena
  iniciar/detener el stream por MQTT; el RC lo publica al servidor de medios de BitaFly.
- **Mapeo directo contra el RAC 100** — cada campo exigido por `100.415(a)(2)(iii)` existe como
  propiedad real de la Cloud API:

| RAC 100 100.415(a)(2)(iii) | Campo DJI Cloud API |
|---|---|
| (A) Actitud de vuelo | `attitude_pitch`, `attitude_roll` |
| (B) Posición georreferenciada | `latitude`, `longitude` |
| (C) Azimuth de vuelo | `attitude_head` |
| (D) Velocidad horizontal | `horizontal_speed` |
| (E) Altura de vuelo | `height` (absoluta) · `elevation` (relativa al despegue) |
| (F) Velocidad vertical | `vertical_speed` |
| (G) Nivel y estado de la fuente de energía | `battery` (struct) |
| (H) Calidad de señal del enlace C2 | `wireless_link.sdr_quality` (0–5), `sdr_link_state`, `link_workmode` (SDR / fusión 4G), `dongle_infos` |
| (I) Imagen de video frontal desde la UA | Livestream RTMP/RTSP/GB28181/Agora |
| (J) Alertas | `mode_code` + `mode_code_reason` (22 causas: batería crítica, pérdida de señal del RC, RTH, aterrizaje forzoso, obstáculo…) + HMS |

Además, `total_flight_time` y `total_flight_distance` permiten **conciliar automáticamente** el
odómetro de la aeronave y la bitácora, y `mode_code_reason` alimenta el SMS sin intervención
humana (§5.4).

**Este mapeo es la prueba de que el frente es viable**: no hay un solo campo exigido por la
norma que la Cloud API no entregue.

### 4.5 Vía B — Docks que operan con FlightHub 2 (respuesta al punto 4 del usuario)

> "no intervendremos el dock, ya que este cuenta con un software de FlightHub 2 para vuelo
> automático, a menos que encuentres la forma de extraer la información."

**La restricción del usuario es técnicamente correcta**: un Dock se vincula a **una sola**
plataforma en la nube a la vez. Si está en FlightHub 2 para vuelo automático, no puede además
apuntar su MQTT a BitaFly. No hay forma de tener las dos cosas por la vía de la Cloud API — y
forzarlo rompería la automatización que el cliente ya usa.

**Sí hay forma de extraer la información, y sin tocar el Dock.** DJI expone tres mecanismos de
salida desde FlightHub 2 hacia plataformas de terceros:

| Mecanismo | Qué entrega | Uso en BitaFly |
|---|---|---|
| **FlightHub OpenAPI** (REST) | Organizaciones, dispositivos, **registros de vuelo** (tareas de ruta del Dock, vuelos manuales y vuelos por Virtual Cockpit), con exportación de reporte resumen y datos completos | Alimenta bitácora, horas de aeronave, ciclos de batería y el reporte mensual UAS — **sin captura manual** |
| **FlightHub Sync** | Sincronización sin código de **archivos multimedia** y **reenvío de livestream** a nubes de terceros (RTMP/RTMPS, **RTSP y GB28181**) | El video del Dock llega a la pantalla de C2 de BitaFly, en paralelo a FlightHub 2 |
| **Event API** | Reglas de eventos configurables que empujan eventos específicos de FlightHub a sistemas externos | Alimenta `c2_events` y genera borradores de reporte SMS |

**El Dock queda intacto**: sigue volando con FlightHub 2 como hoy. BitaFly se conecta *aguas
abajo*, como consumidor de datos. Es lectura, nunca control.

Precedente que confirma viabilidad: **AirData UAV ya publica una integración de livestream desde
DJI FlightHub 2** — es decir, un competidor directo ya opera exactamente este camino.

> ⚠️ **A verificar antes de comprometer esta vía**: el alcance exacto de la FlightHub OpenAPI y
> del Event API depende de la licencia de FlightHub 2 del cliente (y difiere entre la versión
> nube y la *on-premises*). Es la primera tarea de la vía B: confirmar con la cuenta de
> desarrollador ya disponible qué endpoints están habilitados para el tipo de licencia que
> tienen los clientes objetivo.

### 4.6 Vía C — Descartada por ahora

DJI Mobile SDK (app nativa) queda **fuera de alcance**, consistente con la decisión del usuario
de limitar C2 a planes superiores a Escuadrilla: los drones de consumo que exigirían MSDK
pertenecen a los planes que no tendrán C2. Se documenta como no-objetivo, no como pendiente.

### 4.7 Arquitectura — y por qué no cabe en Vercel

Vercel es serverless: no sostiene conexiones MQTT persistentes, ni WebSockets de larga duración,
ni ingesta de video. Intentarlo es la principal forma en que este frente puede fracasar.

```
  VÍA A — RC en campo                        VÍA B — Dock en FlightHub 2
  ───────────────────                        ──────────────────────────
  Aeronave                                    Dock ──► FlightHub 2  (intacto)
     │ AirLink                                              │
  RC Plus/Pro + Pilot 2                          OpenAPI · Sync · Event API
     │  ┌─ H5 (página servida por BitaFly)                  │
     │  └─ MQTT 0,5 Hz  ─┐                                  │
     └─ RTMP/RTSP/GB28181 ─┐                                │
                          ▼                                 ▼
                   ┌─────────────────────────────────────────────┐
                   │  c2-gateway   (servicio siempre encendido)   │
                   │  · broker MQTT (EMQX) con ACL por org        │
                   │  · reglas: geocercas, límites, enlace C2     │
                   │  · buffer caliente en memoria/Redis          │
                   │  · persistencia: 0,5 Hz → Postgres           │
                   │                 traza completa → R2 (.gz)    │
                   └─────────────────────────────────────────────┘
                          │                          │
                   media-server                  WebSocket
                (Cloudflare Stream)                  │
                          └──────────► Navegador (BitaFly v2)
```

- **`c2-gateway`**: Node/Fastify en runtime siempre encendido. El repo **ya tiene precedente**:
  `railway-robot/` (Express + Playwright en Railway). Mismo patrón de despliegue.
- **Página H5 para Pilot 2**: se sirve desde el mismo Next.js, en una ruta dedicada. Login,
  verificación de licencia y carga de módulos vía `window.djiBridge`.
- **Media server**: ver **§4.11** — la elección se resolvió con datos, y **Cloudflare Stream
  quedó descartada por incompatibilidad de protocolo**, pese a ser la opción natural por
  proveedor.
- **Frontend**: mapa en vivo (MapLibre GL — el proyecto ya usa OSM/Nominatim, no Google Maps),
  HUD con los 9 campos de 100.415, panel de video y línea de eventos.
- **Seguridad del enlace**: DJI Pilot 2 y Dock aceptan certificados emitidos por GoDaddy para
  MQTT sobre SSL, y admiten autenticación del cliente (`clientAuth`) si el servidor la exige.
  Se activa — no se deja el MQTT en anónimo.

### 4.11 Servidor de medios — decisión con datos (2026-08-22)

#### Hallazgo decisivo: Cloudflare Stream no sirve para esta vía

La documentación de la Cloud API define el protocolo de video como un enum cerrado. Para
**RC + Pilot 2** (nuestra vía principal):

```
url_type: { 0: Agora, 1: RTMP, 3: GB28181 }
url ejemplo RTMP: rtmp://192.168.1.1:8080/live
```

Los Docks añaden además **WebRTC (WHIP)**, pero el Dock no es nuestra vía (§4.5).

**Cloudflare Stream Live solo acepta ingesta por RTMPS y SRT.** Pilot 2 en un RC no emite
ninguno de los dos: emite **RTMP en claro**, Agora o GB28181. Es incompatible, y no hay
configuración que lo salve.

Es un descarte a pesar de ser la opción más cómoda — el proyecto ya vive íntegramente en
Cloudflare (R2, CDN, DNS). Se documenta el motivo para que nadie lo reconsidere sin releer esto.

#### Modelo de uso para dimensionar (no es broadcast)

C2 no es televisión: es **un dron transmitiendo a 1–3 personas** (piloto, jefe de pilotos,
gerente SMS). Los ejemplos de "40.000 espectadores concurrentes" que dominan las comparativas
de precio de streaming no aplican en absoluto.

Escenario base para calcular: **10 organizaciones** con C2 (Flota/Enterprise), **20 h de
operación con video al mes** cada una → **200 h de ingesta/mes**, con 2 espectadores promedio →
**400 h-espectador/mes**.

#### Comparación

| Opción | Compatible con RTMP en claro | Costo al escenario base | Estabilidad / operación |
|---|---|---|---|
| **Cloudflare Stream** | ❌ **No** (solo RTMPS/SRT) | — | — (descartada) |
| **Amazon IVS** (canal Basic) | ✅ Sí — el canal se puede configurar para aceptar RTMP inseguro | Input $0,20/h × 200 h = **$40** · Output HD $0,072/h-esp. × 400 = **$28,80** → **≈ $69/mes** | Gestionado por AWS, con SLA. Cero operación. AWS publica un caso de uso específico de **streaming desde drones vía RTMP a IVS** |
| **MediaMTX autoalojado** | ✅ Sí — RTMP nativo de entrada, WebRTC/LL-HLS de salida | VPS ~$10–25 + egress ~360 GB (incluido en Hetzner; $7–36 en Fly/Railway) → **≈ $15–50/mes** | Operación propia: TLS, actualizaciones, monitoreo, alta disponibilidad. **Un solo VPS es punto único de falla** en un módulo que la norma considera parte del sistema de gestión de vuelo |
| **Agora** | ✅ Sí — soporte nativo de DJI (`url_type: 0`) | Modelo RTC, precio por minuto notablemente superior | Gestionado, latencia sub-segundo. Sobredimensionado para 2 espectadores |

**Nota de costo**: en IVS el *input* se cobra aunque nadie esté mirando. Con C2 el stream solo
se activa durante la operación, así que no hay canales encendidos en vacío — pero la regla
obliga a apagar el stream al cerrar la sesión, no a dejarlo abierto "por si acaso". Se
implementa como cierre automático al terminar la sesión C2.

#### Recomendación: Amazon IVS (canal Basic), con MediaMTX como plan B

La diferencia real de costo entre las dos opciones viables es de **$20–50 al mes** al volumen
esperado. Eso no justifica asumir la operación de un servidor de medios propio, con su punto
único de falla, en un módulo que sostiene evidencia regulatoria y que el RAC 100 exige que
funcione "durante todas las fases del vuelo". **Se prioriza estabilidad sobre costo porque la
diferencia de costo es irrelevante.**

**Y la decisión es reversible casi sin costo**: ambas opciones aceptan RTMP en claro, así que
cambiar de una a otra es cambiar la cadena de la URL que se envía por MQTT. No hay acoplamiento
arquitectónico. Por eso la elección definitiva puede tomarse después de V1, con el flujo ya
funcionando, en vez de ahora sobre estimaciones.

**MediaMTX se mantiene documentado** como la opción para un cliente que exija despliegue
*on-premises* (caso real en operaciones de infraestructura crítica o entidades públicas), y como
salida si el costo de IVS se dispara al crecer la flota.

> **Contrapartida honesta**: IVS introduce a **AWS** como proveedor nuevo, cuando hoy todo está
> en Cloudflare + Supabase + Vercel. Se mitiga en parte porque el proyecto **ya usa el AWS SDK**
> (`@aws-sdk/client-s3` contra R2), así que el manejo de credenciales estilo AWS no es terreno
> nuevo. Pero es una cuenta más que administrar y facturar, y hay que decirlo.

### 4.8 Persistencia — el punto donde esto se cae si se hace mal

La validación técnica **mejoró mucho el panorama**: la telemetría llega a **0,5 Hz**, no a 10 Hz
como se asumió en la versión anterior de este plan. Una hora de vuelo son **1.800 muestras**, no
36.000. Postgres lo absorbe sin problema.

Aun así se conserva el diseño en capas, porque el volumen crece con la flota y porque el patrón
ya está probado en el proyecto (es exactamente lo que hace hoy el Replay GPS: JSON comprimido en
R2, no filas en Postgres):

- **En vivo**: buffer en memoria/Redis en `c2-gateway`. No toca Postgres.
- **Persistencia**: las muestras a 0,5 Hz → `c2_telemetry`. Retención 12 meses en Postgres.
- **Al cerrar sesión**: la traza completa se comprime y se sube a R2, enlazada al vuelo — así el
  "almacenamiento/registro de eventos críticos" del Apéndice 2 queda íntegro.
- **Eventos** (`c2_events`): siempre en Postgres. Son pocos y son la evidencia regulatoria.

### 4.9 Geocercas (100.440(a)(12))

Se derivan de la zona ya definida en la programación
(`flight_authorizations.plan_data.points`) — **no se le pide al usuario dibujarlas otra vez**.
`c2-gateway` evalúa cada muestra contra el polígono y el techo de altura, y genera un `c2_event`
de tipo `geofence_breach` que alerta en pantalla y crea un **borrador de reporte SMS** (§5.4).

### 4.10 Lo que BitaFly explícitamente NO hará

No enviar comandos al dron (despegar, cambiar waypoint, RTH remoto). La Cloud API sí lo permite
(módulo DRC), pero es una decisión de producto y de responsabilidad: convertiría a BitaFly en
parte de la cadena de mando, con implicaciones de certificación y de seguro que no queremos.
BitaFly **observa, registra, alerta y documenta**. El mando lo conserva la estación de control
del fabricante, como la propia norma presupone al hablar de "estación de control de vuelo".

Esta decisión además hace consistente el trato del Dock: ni control por RC, ni control por Dock.

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
- ⚠️ **Matriz de riesgos en el formato de la Aerocivil** — **el formato oficial aún no es
  público** (confirmado 2026-08-22). No se puede replicar lo que no se conoce. Solución
  adoptada: el generador se construye con **capa de plantilla intercambiable** — el contenido
  (peligros, probabilidad, gravedad, mitigaciones, riesgo residual) se deriva de la evaluación
  SORA y de la matriz SMS que la organización ya tiene, y la **presentación** vive en una
  plantilla aparte. Cuando la Aerocivil publique el formato, se sustituye la plantilla sin tocar
  la lógica. Mientras tanto se emite una matriz propia, completa y trazable, que el explotador
  transcribe al formato oficial cuando exista. Convierte un bloqueo en un retraso de formato,
  no de funcionalidad.
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
| `c2_devices` | Vincula una `aircraft` con su fuente de telemetría | `device_sn`, `gateway_sn` (RC o Dock — la aeronave nunca conecta directo), `source` (`dji_pilot2`/`dji_flighthub2`), `bound_at`, `status`. Credenciales **nunca** aquí — en el gestor de secretos |
| `c2_sessions` | Una sesión de vuelo en vivo | FK a `aircraft`, `pilots`, `flight_authorizations`, `flights`. `started_at`, `ended_at`, `link_quality_min/avg`, `replay_path` (R2) |
| `c2_telemetry` | Muestras a **0,5 Hz** (frecuencia real de la Cloud API, §4.8) | Particionada por mes. Retención en Postgres: 12 meses; la traza completa vive en R2 |
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

> ✅ **Confirmado (2026-08-22)**: la obligación de conservar 5 años es **documental**, no de
> replay. Los registros operacionales (bitácora, mantenimiento, autorizaciones, reportes SMS,
> tiempos de servicio) se conservan 5 años **en todos los planes, sin excepción**. El replay GPS
> y el video de C2 **mantienen su retención por plan tal como está hoy** — son evidencia
> complementaria, no el registro obligatorio.
>
> Consecuencia de diseño: esa distinción tiene que quedar **explícita en la interfaz**, no solo
> en este documento. Un explotador no debe poder creer que su obligación de 5 años está cubierta
> por un replay de 30 días.

---

### 8.6 Habilitación de C2 por plan

Decisión confirmada: C2 solo para **Flota y Enterprise**. Se implementa donde ya vive la
lógica de planes, sin inventar un mecanismo paralelo:

- `PLAN_CONFIG` (`lib/planLimits.js`) gana la capacidad `commandAndControl: true` solo en
  `flota` y `enterprise` — mismo patrón que las demás `features` del plan.
- El nav del espacio **OPERAR** oculta la entrada de C2 cuando el plan no la incluye.
- **Gate de rol y de plan también en la API**, no solo en la interfaz — convención ya
  establecida en el proyecto y reforzada tras la auditoría de reportes del 2026-07-22: el
  `c2-gateway` rechaza el registro de un dispositivo cuyo plan de organización no incluya C2,
  y los endpoints de sesión/telemetría verifican lo mismo.
- El plan efectivo se resuelve con `getOrgPlan()` (membresía del admin), igual que el resto de
  límites — no se lee `profiles.subscription_plan` directo.

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

## 11. Decisiones — estado

### 11.1 Resueltas (2026-08-22)

| # | Decisión | Respuesta | Efecto en el plan |
|---|---|---|---|
| 1 | Cuenta de desarrollador DJI | **Sí, disponible** | Desbloquea la vía A. Falta crear la aplicación "Cloud API" y obtener APP ID / Key / License (§4.2) |
| 2 | Segmento objetivo de C2 | **Solo planes superiores a Escuadrilla** (Flota y Enterprise) | Coincide con el hardware que soporta la Cloud API. C2 vuelve a diferenciar Escuadrilla de Flota (§4.3) |
| 3 | Formato oficial de la matriz de riesgos Aerocivil | **Aún no es público** | F4a se construye con plantilla intercambiable; se emite matriz propia mientras tanto (§6.3) |
| 4 | Intervención del Dock | **No se interviene** — sigue en FlightHub 2 | Vía B: extracción de datos *aguas abajo* vía FlightHub OpenAPI + FlightHub Sync + Event API, sin tocar el Dock (§4.5) |
| 5 | Retención de 5 años vs. planes | **Registros operacionales 5 años. Replay y video se mantienen como están** — la retención regulatoria es **documental**, no de replay | Confirma la distinción de §8.5. Se declara explícitamente en la interfaz para que nadie confunda un replay de 30 días con el archivo obligatorio |
| 6 | F4b — radicación automática | **Sí, las dos de una vez** (F4a + F4b) | F4 completo entra al alcance. F4b conserva sus salvaguardas: modo asistido con confirmación humana, credenciales cifradas, uso auditado, revocable (§6.4, §10.5) |
| 7 | Proveedores de infraestructura | **Evaluado — ver §15** | Cloudflare **se queda** (migrar a AWS sería ~27× más caro en egress). **AWS no se abre**: MediaMTX co-ubicado con `c2-gateway`. **Cero cuentas nuevas en todo v2** |

### 11.2 Pendientes

Ninguna decisión de alcance queda abierta. Lo único pendiente es de ejecución:

| # | Pendiente | Naturaleza |
|---|---|---|
| P1 | Validar `platformVerifyLicense` contra un RC real | Requiere hardware. No se puede hacer desde este entorno |
| P2 | Confirmar el alcance de FlightHub OpenAPI / Event API (V2) | Bloqueado hoy. Mantiene F2-b diferida |
| P3 | Confirmar si Cloudflare está proxeando delante de Vercel (§15.4) | Requiere inspeccionar cabeceras de `bitafly.com`, bloqueado por la política de red de este entorno |

### 11.3 Verificaciones técnicas — estado (2026-08-22)

| # | Verificación | Estado | Detalle |
|---|---|---|---|
| **V1** | Aplicación Cloud API en el portal DJI (APP ID / Key / License) | ✅ **Resuelto** | Las claves ya están cargadas como variables de entorno en Vercel. **Pendiente funcional**: validar `platformVerifyLicense` contra un RC real — no se puede hacer desde este entorno, requiere hardware |
| **V2** | Alcance de FlightHub OpenAPI / Event API según licencia del cliente | ⏸ **Bloqueado** — "no hay forma al momento" | La **vía B queda documentada pero no verificada**. Se planifica como fase posterior, condicionada a poder confirmar el alcance con una licencia real. **No se compromete cronograma sobre ella** |
| **V3** | Servidor de medios: costo y estabilidad | ✅ **Resuelto** | Ver **§4.11**. Cloudflare Stream descartada por incompatibilidad de protocolo. Recomendación: **Amazon IVS canal Basic** (≈$69/mes al escenario base), con MediaMTX como plan B y opción *on-premises*. Decisión reversible cambiando una URL |

> **Consecuencia de V2 sobre el plan**: la vía B (Docks en FlightHub 2) pasa de "parte de F2" a
> **fase F2-b diferida**. F2 se entrega completa con la vía A (RC + Pilot 2), que es la que
> cubre las brechas B6/B7/B8 del RAC 100 y la que ya tiene todo verificado. Nada del cronograma
> depende de algo que hoy no se puede confirmar.

---

## 12. Cómo queda el plan

Estado consolidado tras resolver las decisiones 1–4 y las verificaciones V1/V2/V3.

### 12.1 Orden recomendado

El orden **no** es el de la lista original, y cada posición tiene una razón.

#### Fase 0 — Cimientos (antes de cualquier frente)

Rama `develop-v2` · Supabase branch · proyecto Vercel de preview · `packages/ui` con tokens y
primitivas · Vitest sobre `packages/domain`. Sin esto, cada frente reinventa el andamiaje y el
rediseño llega tarde a módulos ya construidos.

#### Los frentes

| # | Frente | Por qué va aquí |
|---|---|---|
| **1º** | **F5 — Tiempos de servicio, vuelo y descanso** | Es un **incumplimiento actual** de norma vigente (100.540). Es además el frente más pequeño: valida los cimientos de la Fase 0 con algo acotado y de alto valor regulatorio, antes de arriesgar nada grande |
| **2º** | **F4a — Expediente Aerocivil listo para radicar** | Sube de posición. Es autónomo, de valor visible e inmediato para el cliente (le ahorra trabajo manual en **cada** misión), y **F4b depende de que 4a exista y esté rodado**. Ponerlo temprano le da a 4b el tiempo de maduración que necesita |
| **3º** | **F3 — SMS fácil de aplicar** | Alto valor, sin dependencias externas. Su pieza clave —"eventos operacionales → borradores de reporte SMS"— se beneficia de que F5 ya exista: el exceso de tiempo de servicio es una de las fuentes de evento (§5.4) |
| **4º** | **F2-a — Comando y Control (RC + Pilot 2)** | El diferenciador comercial. Va cuarto por una razón concreta: los tres anteriores **no tienen ningún riesgo externo**, y F2-a sí depende de validar la licencia contra un RC real (P1). Arrancarlo aquí deja resolver esa validación en paralelo sin bloquear el avance |
| **5º** | **F1 — Rediseño y distribución** | Al final **a propósito**. Para cuando llegue, el mapa de módulos ya incluirá los cuatro módulos nuevos (tiempos de servicio, expediente Aerocivil, C2, SMS reformado). Rediseñar antes obligaría a rehacerlo.<br><br>**Excepción importante**: `packages/ui` arranca en la Fase 0 y crece con cada frente, así **cada módulo nuevo nace ya con el sistema de diseño**. F1 entonces no es "rediseñar todo desde cero", es "reorganizar la navegación en los 4 espacios y aplicar el sistema al resto de la app" — mucho más barato |
| **6º** | **F4b — Radicación automática ante la Plataforma UAS Colombia** | Último por ser el de **mayor riesgo de responsabilidad** de todo el plan (custodia de credenciales ante una autoridad estatal). Necesita que F4a lleve tiempo estable y que el expediente ya sea confiable antes de automatizar su envío |
| **⏸** | **F2-b — C2 con Docks en FlightHub 2** | Sin cronograma hasta poder verificar P2 |

#### La alternativa, si la prioridad es comercial

Adelantar **F2-a al 2º lugar** es viable ahora que está validado técnicamente. El costo real de
hacerlo: (a) se asume el riesgo de P1 antes de tener los cimientos rodados, y (b) F1 tendría que
acomodar después una pantalla de C2 ya construida, en vez de que nazca con el sistema de diseño.

Es un intercambio legítimo — velocidad al mercado a cambio de algo de retrabajo. Mi
recomendación es el orden de arriba, pero si C2 es la palanca de venta que necesitas para el
salto Escuadrilla → Flota, adelantarlo no rompe nada.

### 12.2 Decisiones técnicas ya cerradas

| Tema | Decisión | Fundamento |
|---|---|---|
| Integración con DJI | **Cloud API vía Pilot 2**, como página web en el portal "Open Platforms" | No requiere app nativa (§4.2) |
| Telemetría | MQTT a **0,5 Hz**; los 9 campos de 100.415(a)(2)(iii) existen todos | Mapeo campo por campo (§4.4) |
| Persistencia | 0,5 Hz → Postgres (12 meses) · traza completa → R2 comprimida · eventos → Postgres siempre | Reutiliza el patrón ya probado del Replay GPS (§4.8) |
| Servidor de medios | **MediaMTX co-ubicado con `c2-gateway`** — corregido, ver §15.2. Amazon IVS documentado como salida si la flota crece | Cloudflare Stream descartada por protocolo (§4.11); AWS no se abre, cero cuentas nuevas (§15.3) |
| Proveedores | Vercel + Supabase + Cloudflare + Resend + ePayco + Railway. **Ninguno nuevo** | Migrar R2 a S3 sería ~27× más caro en egress (§15.1) |
| Retención documental | **Registros operacionales 5 años en todos los planes.** Replay y video conservan su retención por plan | La obligación de 100.535(a)(29) es **documental**, no de replay (§8.5) |
| Dock | **No se interviene.** Sigue en FlightHub 2 | Un Dock se vincula a una sola nube a la vez (§4.5) |
| Drones de consumo | Fuera de alcance (DJI Mobile SDK no se construye) | Coherente con limitar C2 a Flota/Enterprise (§4.6) |
| Control del dron | **BitaFly nunca envía comandos de vuelo** | Decisión de producto y responsabilidad (§4.10) |
| Habilitación por plan | `commandAndControl` en `PLAN_CONFIG`, solo Flota y Enterprise, con gate también en la API | Convención ya establecida (§8.6) |

### 12.3 Lo que sigue abierto

- **Decisión 5** — retención de 5 años vs. planes (§11.2).
- **Decisión 6** — si se compromete F4b.
- **Decisión 7** — si se mantiene este orden o la prioridad comercial exige adelantar F2-a como
  diferenciador de venta. Con F2-a ya validado técnicamente, adelantarlo es viable; el costo es
  que el rediseño (F1) tendría que acomodar después una pantalla que ya existe.
- **V1 funcional** — validar `platformVerifyLicense` contra un RC real. Requiere hardware, no se
  puede hacer desde aquí.

### 12.4 Puertas de verificación

Cada frente termina en una puerta contra el **Supabase branch** y el deploy de preview, con
criterios de aceptación escritos **antes** de empezar a construir. Ninguno se mergea a `main`
hasta el sign-off final. El aislamiento de §0 se mantiene íntegro durante todo el recorrido.

---

## 13. Qué NO está en este plan (a propósito)

Para que el alcance sea honesto:

- **No** enviar comandos de vuelo al dron — ni por RC ni por Dock (§4.10).
- **No** intervenir el Dock ni desplazar a FlightHub 2: BitaFly se conecta aguas abajo, como consumidor de datos (§4.5).
- **No** soportar drones de consumo en C2 (DJI Mobile SDK fuera de alcance, §4.6) — consistente con limitar C2 a planes superiores a Escuadrilla.
- **No** migrar a TypeScript de forma completa (§9.4).
- **No** tests de UI ni de las 181 rutas API (§9.3).
- **No** rehacer el landing público, las páginas SEO ni el Panel Socio — funcionan y están fuera
  del "interior de la app" que se pidió mejorar.
- **No** tocar el flujo de pagos ePayco. Es lo más sensible de producción y no lo pide ninguno
  de los cinco frentes.
- **No** resolver las 4 páginas huérfanas heredadas — se decidirán durante F1, cuando el mapa
  nuevo diga si tienen lugar o se eliminan.
- **No** migrar Cloudflare R2 a AWS S3 — sería ~27× más caro en egress y desharía la fase F8 ya
  completada (§15.1).
- **No** abrir cuenta en AWS: MediaMTX se co-ubica con `c2-gateway` (§15.2).
- **No** arreglar aquí el problema de bundle de `reportGenerators.js` (§15.4 H1) — es código de
  producción y este plan es de desarrollo aislado. Se documenta para decidirlo aparte.

---

## 14. Fuentes consultadas

**Normativa**
- RAC 100 — Operación de Sistemas de Aeronaves No Tripuladas (UAS), resolución que modifica
  integralmente la norma. Documento completo aportado por el usuario, leído en su totalidad
  (7.638 líneas). Secciones citadas: 100.215, 100.240, 100.410, 100.415, 100.440, 100.535,
  100.540, 100.545, 100.550, 100.805, 100.810, 100.815, Apéndice 1, Apéndice 2, Apéndice 4.

**DJI — validación técnica del 2026-08-22**
- [`dji-sdk/Cloud-API-Doc`](https://github.com/dji-sdk/Cloud-API-Doc) — repositorio oficial de
  documentación de la Cloud API, clonado y leído directamente. Archivos usados:
  `10.overview/30.product-support.md` (modelos soportados),
  `30.feature-set/10.pilot-feature-set/10.pilot-access-to-cloud.md` (portal Open Platforms,
  JSBridge, licencia, MQTT SSL), `30.pilot-livestream.md` (protocolos de video),
  `60.api-reference/10.pilot-to-cloud/00.mqtt/10.m3-series/00.properties.md` y
  `20.rc-pro/00.properties.md` (campos de telemetría, `wireless_link`, frecuencia 0,5 Hz).
- [FlightHub Sync — sincronización con nubes de terceros](https://fh.dji.com/user-manual/en/custom-development/flighthub-sync/introduction.html)
- [FlightHub 2 — versión On-Premises y notas de versión](https://fh.dji.com/user-manual/en/release-notes/release-notes-private.html)
- [DJI FlightHub 2 — FAQ Enterprise](https://enterprise.dji.com/flighthub-2/faq)
- [DJI FlightHub 2: A New Era of Cloud-Based Drone Intelligence](https://enterprise-insights.dji.com/blog/dji-flighthub-2-a-new-era-of-cloud-based-drone-intelligence)
- [Actualización FlightHub 2 V13.1 (registros de vuelo, Event API)](https://enterprise-insights.dji.com/blog/new-update-flighthub2-april)
- [AirData UAV — Live Streaming from DJI FlightHub 2](https://app.airdata.com/wiki/Help/Live+Streaming+from+DJI+FlightHub+2) — precedente de competidor operando la vía B.

**Servidores de medios — comparación de costo y estabilidad (§4.11)**
- [Cloudflare Stream — Start a live stream](https://developers.cloudflare.com/stream/stream-live/start-stream-live/) — confirma ingesta solo por RTMPS y SRT.
- [Cloudflare Stream — precios](https://developers.cloudflare.com/stream/pricing/)
- [Amazon IVS — Streaming Configuration](https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/streaming-config.html) — configuración de canal para aceptar RTMP inseguro.
- [Amazon IVS — Real-Time Streaming ahora soporta ingesta RTMP](https://aws.amazon.com/about-aws/whats-new/2024/09/amazon-ivs-real-time-streaming-rtmp-ingest/)
- [AWS — Live streaming from specialized live cameras and drones using RTMP to Amazon IVS](https://aws.amazon.com/blogs/media/live-streaming-from-specialized-live-cameras-and-drones-using-rtmp-to-amazon-ivs) — caso de uso directo con drones.
- [Amazon IVS — costos](https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/costs.html) y [calculadora](https://ivs.rocks/calculator/)
- [Self-Hosted Live Streaming: Owncast, MediaMTX & Nginx RTMP (2026)](https://www.pistack.xyz/posts/self-hosted-live-streaming-owncast-mediamtx-nginx-rtmp-guide-2026/) — dimensionamiento de MediaMTX en modo relay.

---

## 15. Infraestructura — ¿se puede simplificar? (2026-08-22)

Pregunta del usuario: *"verifica si es viable mantener todas esas cuentas, o puedo suprimir
Cloudflare y migrar todo a Amazon (evalúa siempre costos), o si puedo optimizar velocidades de
carga suprimiendo algo."*

### 15.1 Migrar de Cloudflare R2 a AWS S3 — **no conviene, por un margen muy amplio**

La diferencia decisiva es una sola línea de la tabla de precios: **R2 no cobra egress. S3 sí.**

| | Cloudflare R2 | AWS S3 + CloudFront |
|---|---|---|
| Almacenamiento | $0,015 / GB-mes | $0,023 / GB-mes |
| **Egress** | **$0 — gratis, sin límite** | **~$0,085–0,09 / GB** |
| Nivel gratuito | 10 GB-mes + 1 M Class A + 10 M Class B | 100 GB egress/mes |

Escenario conservador para BitaFly (100 GB almacenados, 500 GB de egress al mes entre imágenes
de flota por CDN, manuales de hasta 25 MB, APKs de hasta 100 MB, documentos y replays):

| | Costo mensual |
|---|---|
| **R2** | (100 − 10) × $0,015 = **$1,35** · egress **$0** → **≈ $1,35** |
| **S3 + CloudFront** | 100 × $0,023 = $2,30 · egress (500 − 100) × $0,085 = $34 → **≈ $36** |

**≈ 27× más caro, y la brecha crece linealmente con el tráfico.** BitaFly es una aplicación que
sirve archivos: cuanto más crece, peor es la migración.

A eso se suma un argumento no económico: **la migración a R2 ya se hizo y funciona.** La fase F8
(junio 2026) movió los 7 buckets, resolvió las políticas CORS por bucket, el *gotcha* del
checksum CRC32 del AWS SDK y montó 3 dominios CDN (`cdn`, `logos`, `releases`). Deshacer eso es
tirar trabajo terminado y reintroducir problemas ya resueltos.

**Veredicto: Cloudflare se queda. Es el proveedor que más dinero ahorra de todo el stack.**

### 15.2 Corrección: tampoco hace falta abrir cuenta en AWS

En §4.11 recomendé **Amazon IVS** para el servidor de medios, priorizando estabilidad sobre un
sobrecosto de $20–50/mes. Con la restricción nueva que planteas —minimizar cuentas— **esa
recomendación cambia**, y los argumentos que la sostenían pierden fuerza:

| Argumento original a favor de IVS | Por qué ya no pesa igual |
|---|---|
| "Evita operar un servidor de medios" | **Ya vamos a operar un servicio siempre encendido igual** (`c2-gateway`, para MQTT). MediaMTX es un binario Go / contenedor que corre **en el mismo despliegue**. No es un servidor nuevo: es un contenedor más en algo que ya existe |
| "MediaMTX es un punto único de falla" | `c2-gateway` **ya es** punto único de falla para C2. Si cae, la telemetría cae igual. Poner el video en el mismo dominio de falla no agrega un modo de falla nuevo — hace que C2 falle como una unidad, más simple de monitorear |
| "IVS trae CDN global" | Los espectadores están **en Colombia, en la misma organización que el piloto**, con 1–3 concurrentes. La ventaja de una CDN global es marginal aquí |
| Costo | IVS ≈ **$69/mes y creciendo con las horas de vuelo**. MediaMTX ≈ **$0 adicional** (mismo runtime que ya se paga) |

**Recomendación corregida: MediaMTX co-ubicado con `c2-gateway`.** Y sigue siendo reversible: si
la flota crece hasta hacer pesada la operación, migrar a IVS es cambiar la cadena de la URL que
se envía por MQTT (§4.11). IVS queda documentado como salida, no como punto de partida.

### 15.3 Cuentas resultantes — cero nuevas

| Servicio | Rol | Veredicto |
|---|---|---|
| **Vercel** | Hosting Next.js, funciones serverless | Se queda |
| **Supabase** | Postgres, Auth, RLS, Realtime, pg_cron | Se queda |
| **Cloudflare** | R2 (7 buckets) + DNS + 3 dominios CDN | **Se queda** — el que más ahorra (§15.1) |
| **Resend** | Correo transaccional | Se queda |
| **ePayco** | Pagos (obligatorio en Colombia) | Se queda |
| **Railway** | Hoy `railway-robot`. Pasaría a alojar además `c2-gateway` + MediaMTX + `aerocivil-agent` | Se **consolida**: 1 cuenta, 3 servicios |
| ~~**AWS**~~ | — | **No se abre** (§15.2) |

**Todo v2 se construye sin abrir una sola cuenta nueva.** El único cambio es que Railway pasa de
alojar un servicio a alojar tres.

### 15.4 Optimización de velocidad de carga — hallazgos reales

#### ⚠️ H1 — Un problema de rendimiento real, verificado, en producción

`src/lib/reportGenerators.js` importa **estáticamente** en sus tres primeras líneas:

```js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
```

Y **dos archivos de cliente lo importan estáticamente**:

- `src/app/dashboard/logbook/page.js:9` → **la Bitácora**, una de las páginas más usadas de toda
  la aplicación.
- `src/components/suppliers/SupplierDetailPanel.js:4`

Consecuencia: esas pantallas envían al navegador **exceljs (925 KB minificado) + jsPDF +
jspdf-autotable** en la carga inicial, aunque el usuario nunca pida un reporte. Más de **1 MB de
JavaScript inútil** en la ruta crítica.

Lo revelador es que **el patrón correcto ya existe en el proyecto**: los otros cinco sitios que
usan estas librerías lo hacen bien, con `await import(...)` —
`dashboard/reports/page.js`, `dashboard/maintenance/page.js`, `ExportActions.js`,
`FlightPlanner.js`, `AerocivilForm.js`, `flightPlanDocs.js`, `manualActaPdf.js`. Estos dos son
la excepción, no la regla.

Arreglo: convertir esas dos importaciones al mismo patrón dinámico. Es un cambio de dos líneas
con impacto medible en la página más transitada del producto.

> **No se aplica ahora**: es código de producción y estamos en planeación (§0, regla operativa
> #2). Queda documentado para que lo decidas — es de los pocos casos donde el arreglo es tan
> pequeño y el beneficio tan claro que podría justificar un PR aparte, fuera de v2.

#### ⚠️ H2 — Cloudflare parece estar delante de Vercel (doble CDN)

Evidencia documental: el incidente de precios desactualizados de agosto 2026 registró **ambas**
cabeceras — `cf-cache-status: DYNAMIC` **y** `x-vercel-cache: MISS`. Eso solo ocurre si
Cloudflare proxea (nube naranja) delante de Vercel.

Vercel **ya tiene su propia CDN global**. Ponerle Cloudflare delante añade un salto de red y
crea una segunda capa de caché — que es exactamente lo que hizo tan difícil diagnosticar aquel
incidente: hubo que descartar caché del navegador, de Cloudflare y de Vercel, una por una.

Evaluar poner `bitafly.com` en modo **solo DNS** (nube gris), **manteniendo Cloudflare para R2 y
los tres subdominios CDN**, que sí aportan valor real y gratuito. No se puede confirmar desde
este entorno (la política de red bloquea `bitafly.com`) → **pendiente P3**.

#### H3 — `demo-bitafly-enterprise` duplica el tiempo de CI

Cada push construye **dos** proyectos de Vercel, incluso cuando el cambio es solo documentación
(visible en este mismo PR). Si el demo no cambia, sacarlo del repositorio o desactivar sus
builds automáticos reduce a la mitad el tiempo de CI de cada push. Coincide con la deuda de
monorepo ya documentada en la limpieza de agosto 2026.

#### H4 — Un bucket todavía fuera de R2

`vor-mor-attachments` sigue en Supabase Storage (decisión consciente de julio 2026, los adjuntos
pesan poco). Consolidarlo en R2 elimina un sistema de almacenamiento del stack. Impacto bajo,
pero es simplificación real y encaja bien con F1.

#### H5 — Cuatro sistemas de analítica conviviendo

Vercel Analytics + Vercel Speed Insights + Google Tag Manager/Analytics + Microsoft Clarity.
GTM/GA/Clarity ya están correctamente detrás del consentimiento de cookies; Vercel Analytics y
Speed Insights cargan siempre y se solapan parcialmente con GA. Evaluar quedarse con uno de los
dos conjuntos.

#### ✅ H6 — Un pendiente antiguo que ya está resuelto

La auditoría de julio 2026 dejó abierto **M5**: subir el runtime a Node ≥22 antes de enero 2027,
porque el AWS SDK lo exigiría. Ya está hecho — `package.json` declara `"node": "22.x"` y el
proyecto de Vercel reporta `nodeVersion: 22.x`. Se puede tachar de la lista de pendientes.

---

*Documento vivo. Se actualiza al cerrar cada decisión de §11 y al completar cada frente.*
*Última actualización: 2026-08-22 — auditoría del modelo de datos (§16) y cambio de postura a reconstrucción del esquema desde cero.*

---

## 16. Auditoría del modelo de datos y decisión de reconstruir (2026-08-22)

> Cambio de postura del proyecto, a pedido explícito del usuario:
>
> *"No tengo afán en el desarrollo, quiero que esté completamente estructurada, tanto así que si
> es necesario reescribir el código o crear las tablas de cero, lo preferiría con el fin de
> aumentar la escalabilidad, y eliminar tareas repetidas como lo es subir el logo en
> organización y luego volver a subirlo en reportes, o repetir datos innecesarios. Ya que este
> BitaFly que está en línea se fue alimentando según las necesidades más no con un soporte
> sólido de todas las funciones que tiene hoy en día."*

Esto **cambia el plan de raíz**. Las secciones 0–15 se escribieron bajo la premisa de "evolución
aditiva, no tocar nada de lo que funciona". La premisa nueva es: **rediseñar el modelo de datos
desde cero y migrar**. Lo que sigue es la auditoría que hice antes de aceptar ese cambio, con
datos reales de producción — no con impresiones.

### 16.1 El ejemplo del logo: confirmado, y es peor de lo descrito

`src/app/dashboard/reports/page.js:680` contiene un `<FileUpload path="org/logos" label="Actualizar logo" />`
que escribe en `organizations.logo_url` — **exactamente la misma columna** que escribe el hero de
`dashboard/settings/page.js`.

No es que el dato se guarde dos veces: es que **hay dos pantallas distintas pidiendo lo mismo**,
sin que ninguna indique que ya está cargado en la otra. El usuario sube el logo, llega a
Reportes, ve "Actualizar logo" vacío y lo sube otra vez, creyendo que son cosas distintas. Es un
defecto de arquitectura de información, y es sintomático de todo lo demás.

### 16.2 El dato que decide todo: la plataforma es diminuta

| Tabla | Filas reales |
|---|---|
| `flights` | **50** |
| `organizations` | 22 |
| `profiles` | 25 |
| `pilots` | 20 |
| `aircraft` | 16 |
| `batteries` | 14 |
| `maintenance_logs` | 6 |
| `flight_authorizations` | 11 |

**Toda la data operacional real de BitaFly cabe en unos cientos de filas.**

Esto es lo que convierte "reescribir el esquema" de temerario en obviamente correcto. No es una
migración de millones de registros con ventana de mantenimiento y plan de reversión: es un ETL
pequeño, verificable fila por fila, que se puede correr, comparar y volver a correr las veces
que haga falta.

**Y cuanto más se espere, más caro será.** Hoy son 50 vuelos. El costo de esta decisión crece
con cada cliente que entra.

### 16.3 Funcionalidad construida que nunca se usó

De las 84 tablas, estas están en **cero filas** pese a tener interfaz, API y documentación:

`mission_types` · `pilot_endorsements` · **`battery_logs`** · `mission_inventory_logs` ·
`aerocivil_requests` · `aerocivil_submissions` · `automation_jobs` · `maintenance_components` ·
`billing_history` · `aerocivil_monthly_reports` · `training_evaluations` ·
`training_exam_attempts` · `safety_indicator_monthly` · `safety_indicator_actions` ·
`safety_indicator_submissions` · `sms_training_sessions` · `sms_training_attendance` ·
`referrals` · `referral_commissions` · `addon_subscriptions`

**20 tablas vacías. Casi una cuarta parte del esquema.** Dos consecuencias concretas:

- **`battery_logs` vacía rompe una función documentada**: la página de Flota deriva de ahí los
  "chips de batería por aeronave" y Baterías su columna "última aeronave". Ambas muestran vacío
  siempre, y nadie lo ha reportado — señal de que la función no se usa.
- **`safety_indicators` tiene 12 definiciones y `safety_indicator_monthly` tiene 0 filas**: el
  módulo SPI está configurado pero jamás se le han cargado datos mensuales. Es exactamente el
  problema que F3 pretende resolver (§5.1): el SMS no está incompleto, está desconectado.

Esto valida el diagnóstico del usuario mejor que cualquier argumento: se construyó según lo que
se iba necesitando, y buena parte nunca llegó a usarse.

### 16.4 Duplicación de identidad: `profiles` vs `pilots` — **ya divergió en producción**

Las dos tablas comparten **12 columnas**: `avatar_url`, `email`, `emergency_contact_name`,
`emergency_contact_phone`, `id_type`, `license_number`, `medical_expiry`, `organization_id`,
`phone`, más `id`/`created_at`/`updated_at`.

No es duplicación teórica. De los **10 pilotos vinculados a un perfil**:

| Campo duplicado | Filas con valor **divergente** |
|---|---|
| `phone` | **5 de 10** |
| `license_number` | **5 de 10** |
| `emergency_contact_phone` | **5 de 10** |
| `medical_expiry` | **2 de 10** |

**El `medical_expiry` divergente es el hallazgo grave.** BitaFly muestra badges de
"Certificado médico: Vigente / Vence / Vencida" en Tripulación, en Mi Perfil y en el Expediente
de Tripulante en PDF — y no todas leen de la misma tabla (Mi Perfil lee `profiles`, Tripulación
lee `pilots`). Con dos fechas distintas para el mismo piloto, **dos pantallas del mismo sistema
pueden mostrar estados de cumplimiento contradictorios**, y el PDF que se entrega en una
auditoría puede no coincidir con lo que ve el gerente en pantalla.

Es un defecto de cumplimiento regulatorio causado **exclusivamente** por duplicación de esquema.
Ninguna cantidad de corrección de código lo arregla mientras existan las dos columnas.

Además, `pilots` tiene **`medical_url` y `medical_cert_url`** — dos columnas para el mismo
documento. `medical_url` está en **0 filas**: es un resto muerto que nunca se limpió.

Y el nombre de una persona se guarda de **tres formas** entre las dos tablas:
`profiles.first_name` + `profiles.last_name` + `profiles.full_name` + `pilots.name`.

### 16.5 Patrones repetidos que deberían ser uno solo

Auditoría cruzada de columnas sobre las 84 tablas:

| Patrón | Tablas que lo repiten | Debería ser |
|---|---|---|
| `flight_id` + `checks jsonb` | `results_health`, `results_preflight`, `results_briefing`, `results_inventory` — **4 tablas de forma idéntica** | **Una** tabla `flight_checklist_results` con columna `type` |
| `serial_number` + `brand` + `model` | `aircraft`, `batteries`, `inventory_items` | Un concepto **Equipo** con subtipos, no 3 tablas paralelas |
| `recurrence` + `recurrence_days` + `start_date` | `training_sessions`, `sms_training_sessions`, `training_exams` | **Un** motor de recurrencia compartido |
| `token` + `expires_at` + estado | `invitations`, `partner_invitations`, `free_grants` | **Un** modelo de invitación con `kind` |
| `actor_id` + evento + timestamp | `audit_log`, `notifications`, `sms_case_events` | **Un** registro de eventos, con proyecciones distintas |
| Campos de ePayco | `profiles`, `organization_members`, `addon_subscriptions` | **Una** entidad de suscripción |
| `location` en un vuelo | `flight_plans`, `flight_authorizations`, `flights` | **Un** ciclo de vida de vuelo con estados, no 3 tablas que se copian datos |
| `line_of_sight` | `flight_plans`, `flight_authorizations`, `flights` | ídem |
| Intervalos de mantenimiento | `aircraft`: `maintenance_interval_hours/_days` **y** `minor_maintenance_interval_hours/_days`, con sus 4 contadores paralelos | **Una** tabla de programas de mantenimiento por aeronave, con N tipos |

El caso de **`flight_plans` → `flight_authorizations` → `flights`** es el más costoso de todos:
son tres tablas que representan **el mismo vuelo en tres momentos**, y el sistema copia datos de
una a otra a mano en cada transición (el `plan_data jsonb` existe precisamente para arrastrar la
planeación entre ellas). Cada campo nuevo del vuelo hay que agregarlo tres veces — como pasó
literalmente con `line_of_sight` en el reporte mensual UAS.

### 16.6 Otros hallazgos estructurales

- **`organizations` guarda códigos de formato como columnas**: `form_code_master`,
  `form_code_batteries`, `form_code_pilots` — las 22 organizaciones los tienen. Pero hoy hay
  **más de 20 formatos de reporte**, y solo esos 3 persisten; los demás son locales a la
  pantalla y se pierden al recargar (documentado en §Reportes de `CLAUDE.md`). Debería ser una
  tabla `report_formats`, no columnas.
- **`form_definitions` está sobrecargada**: 231 filas sirviendo **6 tipos distintos** de
  formulario (`health`, `preflight`, `briefing`, `maintenance_return`, `inventory`,
  `minor_maintenance`, `sora`), con `aircraft_model` como texto libre para discriminar. Es una
  tabla-navaja-suiza.
- **`sora_assessments` no tiene migración en el repositorio** — se creó directo en Supabase.
  El esquema real y el versionado ya divergen. Un rediseño desde cero cierra ese hueco.
- **Las columnas legacy de `profiles`** (`organization_id`, `role`, `subscription_plan`, campos
  de ePayco) siguen ahí tras las 8 fases del refactor multi-organización, sostenidas por un
  trigger-puente. La Fase 9 quedó bloqueada por dos triggers preexistentes. **Un esquema nuevo
  las elimina de un plumazo, sin Fase 9.**

### 16.7 Decisión: F0 — Modelo de datos rediseñado desde cero

Se acepta el cambio de postura. **F0 pasa a ser el primer frente**, antes que todo lo demás.

**Alcance**
1. **Diseño del esquema objetivo** — normalizado, con los patrones de §16.5 consolidados.
   Principios: identidad de persona en **un** lugar; equipo como concepto único con subtipos;
   vuelo como **un** ciclo de vida con estados; checklists genéricos; eventos unificados;
   suscripción como entidad propia; nada de columnas derivadas (regla que el proyecto ya aplica
   bien en SPI, zonas de riesgo y % de cumplimiento).
2. **Las 20 tablas vacías no se migran**: se rediseñan bien o se eliminan del alcance. Función
   sin uso real no merece cargar esquema.
3. **ETL de migración**, ejecutado contra el Supabase branch, con informe de comparación fila
   por fila. Para los campos divergentes de §16.4 se define una regla de precedencia explícita
   y se registra qué valor se descartó — nada se resuelve en silencio.
4. **La aplicación se reescribe sobre el esquema nuevo**, no se adapta. Aquí es donde el
   rediseño de frontend (F1) deja de ser un frente aparte: **F1 y F0 se ejecutan juntos**,
   porque reescribir la capa de datos y la de presentación por separado significa escribir la
   aplicación dos veces.

**Lo que NO cambia**
- El aislamiento de §0 se mantiene **íntegro y es ahora más importante que nunca**: `main` y la
  base de producción no se tocan hasta el corte final.
- Producción sigue viva y sin cambios durante toda la construcción. Los clientes actuales no se
  enteran hasta el día del corte.
- La lógica de negocio ya probada (límites de plan, motor SORA, estadística SPI, cumplimiento
  de capacitación, matriz de riesgo) **se conserva**: se mueve a `packages/domain` y se le
  agregan pruebas. Reescribir el esquema no significa reinventar las reglas.

**El corte final** deja de ser un merge y pasa a ser una **migración con ventana**: congelar
escrituras, correr el ETL, verificar, apuntar el dominio. Con ~300 filas de datos reales es
cuestión de minutos, y ensayable tantas veces como se quiera contra el branch.

### 16.8 Orden revisado

| # | Frente | Cambio |
|---|---|---|
| **1º** | **F0 + F1 — Esquema nuevo + rediseño de frontend, juntos** | **Nuevo.** F1 sube desde el 5º puesto: separar datos y presentación obligaría a escribir la app dos veces |
| **2º** | **F5 — Tiempos de servicio** | Nace directamente en el esquema nuevo. Sigue siendo el primer módulo funcional por ser incumplimiento actual |
| **3º** | **F3 — SMS** | Sin cambio de posición |
| **4º** | **F4a — Expediente Aerocivil** | Baja un puesto: ya no hay prisa por sacarlo antes del rediseño |
| **5º** | **F2-a — Comando y Control** | Sin cambio |
| **6º** | **F4b — Radicación automática** | Sin cambio |
| **⏸** | **F2-b — Docks en FlightHub 2** | Sin cambio |

**El plazo se alarga y eso es deliberado** — el usuario fue explícito: *"no tengo afán en el
desarrollo, quiero que esté completamente estructurada"*. A cambio, desaparecen las tres deudas
más caras que arrastra la plataforma: la duplicación de identidad que ya está produciendo datos
contradictorios de cumplimiento, las columnas legacy de `profiles` que la Fase 9 no pudo
retirar, y el triple modelado del vuelo que encarece cada campo nuevo.

### 16.9 Lo que hace falta antes de diseñar el esquema

No se puede diseñar el modelo objetivo sin un inventario funcional completo — qué hace hoy cada
módulo, qué datos consume realmente y cuáles no. Ese es el primer entregable de F0, antes de
escribir una sola tabla:

- **Mapa de entidades reales del negocio** (no de tablas actuales): Organización, Persona,
  Membresía, Equipo, Vuelo, Documento, Evento, Suscripción, Programa.
- **Matriz módulo → entidades** para verificar que nada se pierde en la traducción.
- **Reglas de precedencia** para cada campo hoy duplicado (§16.4).
- **Lista explícita de funciones que NO se migran**, con su justificación — para que nadie las
  eche de menos después sin saber por qué.

---
