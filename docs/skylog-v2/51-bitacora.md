# Bitácora de decisiones y fuentes

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 11. Decisiones — estado

### 11.1 Resueltas (2026-08-22)

| # | Decisión | Respuesta | Efecto en el plan |
|---|---|---|---|
| 1 | Cuenta de desarrollador DJI | **Sí, disponible** | Desbloquea la vía A. Falta crear la aplicación "Cloud API" y obtener APP ID / Key / License (§4.2) |
| 2 | Segmento objetivo de C2 | **Solo planes superiores a Escuadrilla** (Flota y Enterprise) | Coincide con el hardware que soporta la Cloud API. C2 vuelve a diferenciar Escuadrilla de Flota (§4.3) |
| 3 | Formato oficial de la matriz de riesgos Aerocivil | **Aún no es público** | F4a se construye con plantilla intercambiable; se emite matriz propia mientras tanto (§6.3) |
| 4 | Intervención del Dock | **No se interviene** — sigue en FlightHub 2 | Vía B: extracción de datos *aguas abajo* vía FlightHub OpenAPI + FlightHub Sync + Event API, sin tocar el Dock (§4.5) |
| 5 | Retención de 5 años vs. planes | **Registros operacionales 5 años. Replay y video se mantienen como están** — la retención regulatoria es **documental**, no de replay | Confirma la distinción de §8.5. Se declara explícitamente en la interfaz para que nadie confunda un replay de 30 días con el archivo obligatorio. ⚠️ **Matizado 2026-08-22**: vale para operación **normal**. El ítem 34 de MAUT-5.0-12-095 exige un procedimiento de *"preservación y custodia de los registros de vuelo (logs de vuelo), grabaciones de audio y video, ante la ocurrencia de un incidente, accidente y/o suceso operacional"* — es decir, al abrirse un caso el material de ese vuelo queda bajo **retención legal** y sale de la purga por cuota. Ver [`14-listas-verificacion.md`](14-listas-verificacion.md) §4.7 |
| 6 | F4b — radicación automática | **Sí, las dos de una vez** (F4a + F4b) | F4 completo entra al alcance. F4b conserva sus salvaguardas: modo asistido con confirmación humana, credenciales cifradas, uso auditado, revocable (§6.4, §10.5) |
| 7 | Proveedores de infraestructura | **Evaluado — ver §15** | Cloudflare **se queda** (migrar a AWS sería ~27× más caro en egress). **AWS no se abre**: MediaMTX co-ubicado con `c2-gateway`. **Cero cuentas nuevas en todo v2** |

### 11.1b Resueltas (2026-08-22, segunda tanda — tras el análisis normativo)

| # | Decisión | Respuesta | Efecto en el plan |
|---|---|---|---|
| 8 | Catálogo de indicadores SPI | Los **11 oficiales UAS precargados + el cliente puede agregar los suyos** | [`13`](13-herramientas-spi.md) §10. Las reglas de qué NO es un SPI aplican igual a los propios; el envío anual conserva el formato oficial |
| 9 | Rol de las listas de verificación oficiales | Son **insumo de diseño, no rúbrica de producto**. Dicen qué ítems son trascendentes; el cliente configura todo según sus manuales | [`14`](14-listas-verificacion.md) recuadro inicial · origen de las reglas **C1–C5** de [`01-reglas.md`](01-reglas.md) §5b |
| 10 | Quién diligencia y quién analiza MOR/VOR | Diligencia **cualquier persona**; el **Gerente SMS** es el asignado para análisis y toma de datos | [`40`](40-sms.md) §5.7. Coincide con el descriptor *Eficaz* del ítem 1.1.1 de [`15`](15-evaluacion-sms.md), que pide que terceros puedan notificar |
| 11 | RAC 114 | **No se toca por ahora** | Sale de la lista de documentos bloqueantes. La bifurcación de accidentes queda sin diseñar, a propósito |
| 12 | Módulo de Proveedores | **Se queda como está.** No se convierte en el registro de interfases del SMS | [`16`](16-asuntos-complementarios.md) §6. La gestión de interfases se atiende en el Manual del SMS del cliente |
| 13 | Acto de aceptación del Ejecutivo Responsable | **No se construye** — ya está en el manual del cliente. Se conserva solo el **nombramiento** | [`16`](16-asuntos-complementarios.md) §2 |
| 14 | Perfil del Gerente SMS | **Sí se construye**, como expediente **con carga de archivos** para tener el registro completo | [`16`](16-asuntos-complementarios.md) §3 |
| 15 | Plan de respuesta ante emergencias | Diseñable **y editable por el cliente**: el sistema garantiza la estructura de los 8 requisitos, el contenido lo escribe la organización | [`16`](16-asuntos-complementarios.md) §8 |
| 16 | Currículo de instrucción SMS | Se ofrece como **recomendación**; el usuario escoge. El **registro** (tipo, intensidad horaria, nombre, fecha, institución) sí se estructura | [`16`](16-asuntos-complementarios.md) §9 |
| 17 | Cultura Justa | **No la manejamos** — ya está en los manuales del cliente. Permanecen solo la confidencialidad del notificante y la retroalimentación, que vienen de otras obligaciones | [`17`](17-implementacion-sms-uas.md) §3 |
| 18 | Proyecto demo en Vercel | **Deja de construirse en cada push**: `demo-enterprise/vercel.json` con `ignoreCommand` | Ver §11.4 |
| 19 | Organización del proyecto | La hoja de ruta se reescribe alrededor del **ciclo de trabajo** de seis etapas | [`50`](50-hoja-de-ruta.md) §3 |
| 20 | **Comando y Control (F2)** | **Omitido por ahora.** Salen F2-a (RC + Pilot 2) y F2-b (Docks / FlightHub 2). El documento técnico se conserva listo para retomarse | [`42`](42-comando-control.md) · [`50`](50-hoja-de-ruta.md) §4. Libera el único bloqueante del plan y deja abiertas las brechas B6/B7/B8 de [`11`](11-rac100-uas.md) |

**Principio transversal que sale de las decisiones 8, 9, 12, 13, 15, 16 y 17**: la norma se
precarga como plantilla, nunca se impone. Formalizado como reglas **C1–C5** en
[`01-reglas.md`](01-reglas.md) §5b, y respaldado por la propia circular MAUT-5.0-22-017, que
presenta su análisis GAP como modelo *"que puede ser personalizado por el explotador UAS"*.

### 11.4 Proyecto demo — cómo se detuvo (2026-08-22)

El proyecto Vercel `demo-bitafly-enterprise` tiene su *root directory* en `demo-enterprise/` y
construía en **cada push a cualquier rama** de este repositorio, incluidas las ramas de
planeación que solo tocan `docs/`. De ahí venían las notificaciones de despliegue sin relación
con el trabajo.

Solución aplicada: `demo-enterprise/vercel.json` con

```json
{ "ignoreCommand": "git diff --quiet HEAD^ HEAD -- ." }
```

Vercel salta el build cuando el comando sale con código 0 — es decir, cuando el commit **no tocó
nada dentro de `demo-enterprise/`**. Si el comando falla por cualquier razón (por ejemplo, un
clon superficial donde `HEAD^` no existe) devuelve un código distinto de cero y el build
procede: el modo de falla es construir de más, nunca dejar de construir algo que sí cambió.

**Nota**: el commit que introduce este archivo **sí toca `demo-enterprise/`**, así que dispara
un último build. A partir del siguiente, se salta.

### 11.2 Pendientes

Ninguna decisión de alcance queda abierta. Lo único pendiente es de ejecución:

| # | Pendiente | Naturaleza |
|---|---|---|
| ~~P1~~ | ~~Validar `platformVerifyLicense` contra un RC real~~ | ⏸ **Suspendido** junto con C2 (decisión 20) |
| ~~P2~~ | ~~Confirmar el alcance de FlightHub OpenAPI / Event API~~ | ⏸ **Suspendido** junto con C2 (decisión 20) |
| P3 | Confirmar si Cloudflare está proxeando delante de Vercel (§15.4) | Requiere inspeccionar cabeceras de `bitafly.com`, bloqueado por la política de red de este entorno |

### 11.3 Verificaciones técnicas — estado (2026-08-22)

| # | Verificación | Estado | Detalle |
|---|---|---|---|
| **V1** | Aplicación Cloud API en el portal DJI (APP ID / Key / License) | ✅ **Resuelto** | Las claves ya están cargadas como variables de entorno en Vercel. **Pendiente funcional**: validar `platformVerifyLicense` contra un RC real — no se puede hacer desde este entorno, requiere hardware |
| **V2** | Alcance de FlightHub OpenAPI / Event API según licencia del cliente | ⏸ **Bloqueado** — "no hay forma al momento" | La **vía B queda documentada pero no verificada**. Se planifica como fase posterior, condicionada a poder confirmar el alcance con una licencia real. **No se compromete cronograma sobre ella** |
| **V3** | Servidor de medios: costo y estabilidad | ✅ **Resuelto** | Cloudflare Stream descartada por incompatibilidad de protocolo (solo RTMPS/SRT; el RC de DJI emite RTMP). Primero se recomendó **Amazon IVS Basic** (≈$69/mes); **corregido** al evaluar la decisión 7: como `c2-gateway` debe correr siempre de todos modos, **MediaMTX co-ubicado** no agrega punto único de falla ni cuenta nueva, y sale más barato. Decisión final: **MediaMTX co-ubicado, cero cuentas nuevas**. Reversible cambiando una URL |

> **Consecuencia de V2 sobre el plan**: la vía B (Docks en FlightHub 2) pasa de "parte de F2" a
> **fase F2-b diferida**. F2 se entrega completa con la vía A (RC + Pilot 2), que es la que
> cubre las brechas B6/B7/B8 del RAC 100 y la que ya tiene todo verificado. Nada del cronograma
> depende de algo que hoy no se puede confirmar.

---

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

**Normativa Aerocivil analizada el 2026-08-22 (documentos primarios provistos por el usuario)**
- `RAC 219` (vigente, Res. 718/2024) · `RAC 100` (modificación integral) →
  [`10-rac219-sms.md`](10-rac219-sms.md) · [`11-rac100-uas.md`](11-rac100-uas.md)
- `MAUT-1.0-22-004` (MOR/VOR) · `MAUT-1.0-22-006` (aceptación, P/S/O/E) →
  [`12-directivas-maut.md`](12-directivas-maut.md)
- `MAUT-1.0-22-005` v02 y el libro `MAUT-1.0-12-002` v01 (SPI) →
  [`13-herramientas-spi.md`](13-herramientas-spi.md)
- `MAUT-5.0-12-095` (lista de verificación del MO) → [`14-listas-verificacion.md`](14-listas-verificacion.md)
- `MAUT-3.0-12-097` v01, ejemplar 17/07/2026 (herramienta de evaluación del SMS) → [`15-evaluacion-sms.md`](15-evaluacion-sms.md)
- `MAUT-1.0-22-007` (asuntos complementarios) → [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md)
- `MAUT-5.0-22-017` (implementación SMS UAS) → [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md)
- `MAUT-5.0-12-055` v01 (análisis de riesgos por autorización) → [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md)

**Correcciones propias registradas** (regla V4)
| Fecha | Qué se afirmó mal | Dónde queda la corrección |
|---|---|---|
| 2026-08-22 | Que el Comité de Seguridad Operacional y el GESO no eran exigibles por no estar en el articulado del RAC 219 | [`10-rac219-sms.md`](10-rac219-sms.md) §recuadro · confirmado por el ítem 52 de `MAUT-5.0-12-095` |
| 2026-08-22 | Que el denominador de los SPI de UAS eran horas de vuelo | [`13-herramientas-spi.md`](13-herramientas-spi.md) §7 — son **ciclos de vuelo** |
| 2026-08-22 | Que convenía abrir una cuenta de AWS para Amazon IVS | Decisión 7 y V3 de este documento — **MediaMTX co-ubicado** |
| 2026-08-22 | Que replay y video quedaban fuera de toda retención regulatoria | Decisión 5 de este documento — hay **retención legal por suceso** |
