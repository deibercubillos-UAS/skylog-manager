import crypto from 'crypto';

export const ARDIS_COOKIE_NAME = 'ardis_session';
export const ARDIS_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 días — uso personal, sin re-login constante

function sign(payload) {
  const secret = process.env.ARDIS_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionCookieValue() {
  const payload = Buffer.from(JSON.stringify({ iat: Date.now() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(cookieValue) {
  if (!cookieValue || !process.env.ARDIS_SESSION_SECRET) return false;

  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const { iat } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!iat || Date.now() - iat > ARDIS_COOKIE_MAX_AGE * 1000) return false;
    return true;
  } catch {
    return false;
  }
}
