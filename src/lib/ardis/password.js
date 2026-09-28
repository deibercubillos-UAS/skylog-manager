import crypto from 'crypto';

// scrypt (Node core, sin dependencias nuevas) en vez de bcrypt: ARDIS.md solo
// autoriza añadir chrono-node y web-push como dependencias nuevas.
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const [scheme, saltHex, hashHex] = storedHash.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = crypto.scryptSync(password, salt, KEYLEN);

  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
