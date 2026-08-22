# Comando y Control (C2 en vivo)

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

> ## ⚠️ Falta la norma que gobierna este módulo
>
> Existe una **directiva vinculante** de la Aerocivil llamada
> **`MAUT-5.0-22-016 "01-23" — Criterios de aceptación del enlace C2 para explotadores UAS`**,
> descubierta el 2026-08-22 al analizar la lista de verificación del Manual de Operaciones
> ([`14-listas-verificacion.md`](14-listas-verificacion.md) §3). El **ítem 23** de esa lista
> evalúa el enlace C2 **exclusivamente contra esa directiva**.
>
> Todo este documento se construyó contra la especificación técnica de DJI y el RAC 100. Eso lo
> hace **técnicamente correcto**, pero no dice nada sobre si lo que el módulo captura, muestra y
> conserva satisface los criterios de aceptación de la autoridad. Hasta leer `MAUT-5.0-22-016`,
> cualquier afirmación de cumplimiento sobre el enlace C2 es una suposición.
>
> **No invalida el diseño técnico** (protocolos, telemetría, servidor de medios). Sí deja abierto
> qué campos son obligatorios, con qué frecuencia y por cuánto tiempo. Pendiente **P-LV-1**.

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
