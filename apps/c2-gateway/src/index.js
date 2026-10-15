// Skylog V2.0 — F2 Comando y Control, c2-gateway.
//
// Qué hace: actúa como el broker MQTT al que el DJI Cloud SDK (corriendo
// dentro de Pilot 2 en el RC) se conecta como cliente y publica telemetría
// en `thing/product/{sn}/osd` (0,5 Hz) y estado/eventos en
// `thing/product/{sn}/state` — exactamente el flujo documentado en
// docs/skylog-v2/42-comando-control.md §4.4. Este servicio NUNCA envía
// comandos de vuelo (regla §4.10) — solo recibe, persiste y marca
// online/offline.
//
// ⚠️ Honesto sobre el estado real: escrito y listo para desplegar, pero
// **nunca se ha probado contra un RC/Pilot 2 real** — no hubo hardware DJI
// disponible en el entorno donde se escribió (2026-10-01). No asumas que
// funciona hasta validarlo con un dispositivo real.
//
// ⚠️ Simplificación MVP de seguridad: autenticación con UN secreto
// compartido por todo el gateway (`C2_SHARED_SECRET`), el cliente MQTT se
// identifica con `username = organizationId`. El diseño real (§4.7 del doc)
// pide ACL por organización vía un broker como EMQX — este `aedes` embebido
// es el punto de partida honesto para probar el flujo end-to-end, NO
// producción con múltiples clientes reales todavía. No usarlo con datos de
// un cliente real sin antes moverlo a credenciales por organización.
import Fastify from 'fastify';
import Aedes from 'aedes';
import { createServer } from 'aedes-server-factory';
import { createClient } from '@supabase/supabase-js';

const PORT_MQTT = Number(process.env.C2_MQTT_PORT || 1883);
const PORT_HTTP = Number(process.env.PORT || 8080);
const SHARED_SECRET = process.env.C2_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Offline si no llega heartbeat en este tiempo — DJI pushMode:0 manda OSD
// cada 2s (0,5 Hz); 10s de margen tolera un par de muestras perdidas sin
// parpadear el estado en pantalla.
const OFFLINE_AFTER_MS = 10_000;

if (!SHARED_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[c2-gateway] Faltan env vars requeridas: C2_SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// sessionId en memoria por (organizationId, droneSn) — evita un
// select/insert por cada muestra de telemetría; se repuebla si el proceso
// reinicia (la próxima muestra simplemente abre una sesión nueva).
const sessionCache = new Map(); // key: `${organizationId}:${droneSn}` -> { sessionId, lastHeartbeat }

function cacheKey(organizationId, droneSn) {
  return `${organizationId}:${droneSn}`;
}

async function getOrCreateSession(organizationId, droneSn) {
  const key = cacheKey(organizationId, droneSn);
  const cached = sessionCache.get(key);
  if (cached) return cached.sessionId;

  // Resolver aircraft_id por serial dentro de la org — opcional, una
  // sesión existe aunque el serial del log no calce con ninguna aeronave
  // registrada (no se bloquea la ingesta por eso).
  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('serial_number', droneSn)
    .maybeSingle();

  const { data: session, error } = await supabase
    .from('c2_sessions')
    .insert({
      organization_id: organizationId,
      aircraft_id: aircraft?.id ?? null,
      drone_sn: droneSn,
      status: 'online',
      last_heartbeat_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[c2-gateway] No se pudo crear la sesión C2:', error.message);
    return null;
  }

  sessionCache.set(key, { sessionId: session.id, lastHeartbeat: Date.now() });
  return session.id;
}

async function handleOsd(organizationId, droneSn, osd) {
  const sessionId = await getOrCreateSession(organizationId, droneSn);
  if (!sessionId) return;

  sessionCache.set(cacheKey(organizationId, droneSn), { sessionId, lastHeartbeat: Date.now() });

  await Promise.all([
    supabase.from('c2_telemetry').insert({
      session_id: sessionId,
      latitude: osd.latitude ?? null,
      longitude: osd.longitude ?? null,
      height_m: osd.height ?? null,
      elevation_m: osd.elevation ?? null,
      attitude_pitch: osd.attitude_pitch ?? null,
      attitude_roll: osd.attitude_roll ?? null,
      attitude_head: osd.attitude_head ?? null,
      horizontal_speed_ms: osd.horizontal_speed ?? null,
      vertical_speed_ms: osd.vertical_speed ?? null,
      battery_pct: osd.battery?.capacity_percent ?? null,
      link_quality: osd.wireless_link?.sdr_quality ?? null,
      mode_code: osd.mode_code != null ? String(osd.mode_code) : null,
      mode_code_reason: osd.mode_code_reason != null ? String(osd.mode_code_reason) : null,
    }),
    supabase.from('c2_sessions').update({ status: 'online', last_heartbeat_at: new Date().toISOString() }).eq('id', sessionId),
  ]);
}

async function handleEvent(organizationId, droneSn, eventType, payload) {
  const sessionId = await getOrCreateSession(organizationId, droneSn);
  if (!sessionId) return;
  await supabase.from('c2_events').insert({
    session_id: sessionId,
    organization_id: organizationId,
    event_type: eventType,
    payload: payload ?? {},
  });
}

// ── Broker MQTT (aedes) ──────────────────────────────────────────
const aedes = new Aedes();

aedes.authenticate = (client, username, password, callback) => {
  // MVP: un solo secreto compartido (ver nota de seguridad arriba) —
  // `username` es el organizationId tal cual, `clientId` se usa como
  // droneSn si el topic no lo trae (DJI sí lo trae en el topic, esto es
  // solo una defensa adicional).
  const ok = password && password.toString() === SHARED_SECRET && !!username;
  callback(null, !!ok);
};

aedes.on('publish', async (packet, client) => {
  if (!client) return; // mensajes internos del broker, ignorar
  const topic = packet.topic;
  const match = topic.match(/^thing\/product\/([^/]+)\/(osd|state)$/);
  if (!match) return;

  const [, droneSn, kind] = match;
  const organizationId = client.id ? aedes.clients[client.id]?.req?.auth?.username : null;
  // `aedes-server-factory` expone el username autenticado en distintos
  // lugares según versión — fallback a `client.username` si el handshake
  // lo guardó ahí (comportamiento real a confirmar contra hardware real).
  const orgId = organizationId || client.username;
  if (!orgId) {
    console.warn('[c2-gateway] Mensaje sin organizationId resuelto, descartado:', topic);
    return;
  }

  let body;
  try {
    body = JSON.parse(packet.payload.toString());
  } catch {
    console.warn('[c2-gateway] Payload no-JSON en', topic);
    return;
  }

  if (kind === 'osd') {
    await handleOsd(orgId, droneSn, body);
  } else {
    await handleEvent(orgId, droneSn, body.mode_code_reason || 'state_change', body);
  }
});

createServer(aedes, { ws: false }).listen(PORT_MQTT, () => {
  console.log(`[c2-gateway] Broker MQTT escuchando en :${PORT_MQTT}`);
});

// ── Barrido de offline ───────────────────────────────────────────
setInterval(async () => {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.lastHeartbeat > OFFLINE_AFTER_MS) {
      sessionCache.delete(key);
      await supabase.from('c2_sessions').update({ status: 'offline', ended_at: new Date().toISOString() }).eq('id', entry.sessionId).eq('status', 'online');
    }
  }
}, 5000);

// ── HTTP — solo health check (Railway/Fly lo necesitan para el deploy) ──
const fastify = Fastify({ logger: false });
fastify.get('/health', async () => ({ ok: true, onlineSessions: sessionCache.size }));
fastify.listen({ port: PORT_HTTP, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[c2-gateway] Health check en :${PORT_HTTP}/health`);
});
