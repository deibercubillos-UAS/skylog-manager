// Skylog V2.0 — firma de un vuelo leído de un log DJI. /api/flights/import-dji firma lo que leyó del archivo y
// /api/flights solo acepta un vuelo como «importado» si la firma coincide; si no, es una carga manual (matriz D5, que el
// Piloto no tiene). Antes bastaba con mandar cualquier `batterySerial` para que un vuelo a mano pasara por importado
// (auditoría 2026-10-16). Solo servidor: la llave se deriva de la llave de servicio y nunca sale de aquí.
import crypto from 'crypto';

const TTL_MS = 24 * 3600 * 1000;

function key() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  return crypto.createHmac('sha256', secret).update('bitafly:flight-import:v1').digest();
}

const canonical = ({ personId, takeoffAt, landingAt, totalTime, batterySerial, batteryCycles }, exp) =>
  JSON.stringify([personId, String(takeoffAt), String(landingAt), Number(totalTime), batterySerial || null, batteryCycles == null ? null : Number(batteryCycles), exp]);

/** Token para el vuelo que el servidor acaba de leer del log, ligado a la persona que lo importó. */
export function signFlightImport(fields, now = Date.now()) {
  const exp = now + TTL_MS;
  const sig = crypto.createHmac('sha256', key()).update(canonical(fields, exp)).digest('base64url');
  return `${exp}.${sig}`;
}

/** ¿El token corresponde exactamente a estos datos, a esta persona y sigue vigente? */
export function verifyFlightImport(token, fields, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now || !sig) return false;
  const expected = crypto.createHmac('sha256', key()).update(canonical(fields, exp)).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
