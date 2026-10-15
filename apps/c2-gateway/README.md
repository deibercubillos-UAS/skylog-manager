# c2-gateway

Broker MQTT + ingesta de telemetría para F2 — Comando y Control (Skylog
V2.0). Ver `docs/skylog-v2/42-comando-control.md` para el diseño completo.

**Estado real (2026-10-01): escrito, nunca desplegado ni probado contra
hardware DJI.** No asumas que funciona hasta validarlo con un RC/Pilot 2
real — ver las notas `⚠️` en `src/index.js`.

## Qué hace

Pilot 2 (corriendo en un RC DJI con Cloud API habilitada) se conecta a este
servicio como cliente MQTT y publica telemetría (`thing/product/{sn}/osd`,
cada ~2s) y eventos (`thing/product/{sn}/state`). El servicio:

- Autentica la conexión (MVP: un secreto compartido, ver limitación abajo).
- Guarda cada muestra en `c2_telemetry` (Supabase) y mantiene
  `c2_sessions.status` en `online`/`offline` según si hay heartbeat reciente.
- Expone `GET /health` para el healthcheck del hosting.

**Nunca envía comandos al dron** (regla de producto, §4.10 del doc).

## Limitación de seguridad conocida (léela antes de usar con un cliente real)

El MVP usa **un solo secreto compartido** para todas las organizaciones en
vez de credenciales por organización (lo que pide el diseño real, un broker
tipo EMQX con ACL). Es la forma más simple de probar el flujo end-to-end
primero. **No lo uses con datos de un cliente real de producción** sin
antes moverlo a autenticación por organización.

## Deploy — Railway (no pude hacerlo yo, sin credenciales en este entorno)

1. Desde esta carpeta (`c2-gateway/`), crea un proyecto nuevo en Railway:
   ```
   railway init
   ```
2. Configura las variables de entorno del `.env.example` en el dashboard de
   Railway (Settings → Variables) — genera un `C2_SHARED_SECRET` real y
   copia el `SUPABASE_SERVICE_ROLE_KEY` del proyecto `bqimtkwzayewwubgsaji`
   (branch `develop-v2`, Project Settings → API).
3. **Importante**: Railway expone por defecto solo el puerto HTTP vía
   `$PORT`. El puerto MQTT (1883) necesita exponerse aparte como **TCP
   Proxy** — en el dashboard del servicio: Settings → Networking → "TCP
   Proxy" → puerto `1883`. Railway te dará un host:puerto público distinto
   del dominio HTTP; ESA es la URL que se configura en Pilot 2 (Open
   Platforms → MQTT broker), no la URL HTTP del health check.
4. Deploy:
   ```
   railway up
   ```
5. Aplica la migración `supabase/migrations/20261001020000_c2_telemetry.sql`
   al proyecto/branch si todavía no está aplicada (mismo proceso que ya
   usamos para `flights.replay_track`).
6. Verifica `https://<tu-servicio>.up.railway.app/health` responde
   `{"ok":true,...}` antes de intentar conectar un RC real.

## Lo que falta para que esto sea end-to-end real

- Credenciales DJI Cloud API (APP ID/Key/License) — confirmadas como
  "disponibles" en agosto 2026, verificar que sigan vigentes.
- Un RC/Pilot 2 real para probar la conexión MQTT y validar
  `platformVerifyLicense` (nunca se pudo hacer desde ningún entorno de
  desarrollo hasta ahora).
- La página H5 que Pilot 2 carga (`src/app/(v2)/c2/pilot2/page.js` en el
  repo principal) con la URL pública de este gateway configurada.
- Decisión de servidor de medios para video (IVS vs MediaMTX,
  `42-comando-control.md §4.11`) — sin eso, la telemetría funciona pero no
  hay imagen de cámara.
- Mover el MVP de secreto compartido a credenciales por organización antes
  de usarlo con un cliente real.
