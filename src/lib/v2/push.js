// Skylog V2.0 — envío de notificaciones push nativas (FCM HTTP v1).
// «Mejor esfuerzo», igual que los correos y la campana: si falta configuración o algo falla,
// se registra y NUNCA rompe la operación que lo dispara. Lo llama createNotifications tras
// crear los avisos de la campana, para que además salten como ventana flotante del sistema.
//
// Credenciales por variables de entorno (cuenta de servicio de Firebase):
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
// Si no están, el envío simplemente no ocurre (la campana sigue funcionando).
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabaseServer';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

// Caché del access token OAuth del servicio (válido ~1 h) entre invocaciones calientes.
let cachedToken = null; // { value, expiresAt }

function fcmConfig() {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  // La clave suele venir con "\n" literales al guardarla como variable de entorno.
  const privateKey = (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const b64url = (input) => Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getAccessToken(cfg) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: cfg.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signingInput = `${header}.${claims}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(cfg.privateKey);
  const assertion = `${signingInput}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

/**
 * Envía una notificación push a todos los dispositivos de las personas dadas.
 * @param {{personIds: string[], title: string, body?: string, link?: string}} msg
 */
export async function sendPushToPersons(msg, admin = null) {
  try {
    const cfg = fcmConfig();
    if (!cfg) return { sent: 0 };
    const personIds = (msg?.personIds || []).filter(Boolean);
    if (!personIds.length || !msg.title) return { sent: 0 };

    const db = admin || createAdminClient();
    const { data: rows, error } = await db.from('push_tokens').select('id, token').in('person_id', personIds);
    if (error || !rows?.length) return { sent: 0 };

    const accessToken = await getAccessToken(cfg);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`;
    const data = msg.link ? { link: String(msg.link) } : {};

    let sent = 0;
    const staleIds = [];
    for (const row of rows) {
      const payload = {
        message: {
          token: row.token,
          notification: { title: String(msg.title).slice(0, 160), body: msg.body ? String(msg.body).slice(0, 240) : '' },
          data,
          android: { priority: 'high', notification: { channel_id: 'bitafly_default', default_sound: true } },
        },
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        sent += 1;
      } else if (res.status === 404 || res.status === 400) {
        // Token caducado/no registrado: se limpia para no reintentar eternamente.
        staleIds.push(row.id);
      }
    }
    if (staleIds.length) await db.from('push_tokens').delete().in('id', staleIds).then(() => {}, () => {});
    return { sent };
  } catch (e) {
    console.error('[push] no se pudo enviar el push:', e.message);
    return { sent: 0 };
  }
}
