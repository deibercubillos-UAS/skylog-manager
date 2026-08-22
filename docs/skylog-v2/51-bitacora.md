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
