import { describe, it, expect } from 'vitest';
import { validateApkRelease, normalizeApkSha256 } from './apkRelease.js';

const SHA = 'a'.repeat(64);

describe('validateApkRelease', () => {
  it('acepta https en el host permitido con huella válida (y la pasa a minúsculas)', () => {
    const r = validateApkRelease({ apkUrl: 'https://releases.bitafly.com/bitafly-v1.2.0.apk', apkSha256: SHA.toUpperCase() });
    expect(r).toEqual({ ok: true, apkUrl: 'https://releases.bitafly.com/bitafly-v1.2.0.apk', apkSha256: SHA });
  });
  it('rechaza http, otro host, credenciales, puerto y URL inválida', () => {
    for (const apkUrl of ['http://releases.bitafly.com/a.apk', 'https://evil.com/a.apk', 'https://releases.bitafly.com.evil.com/a.apk', 'https://u:p@releases.bitafly.com/a.apk', 'https://releases.bitafly.com:8443/a.apk', 'no es url', '']) {
      expect(validateApkRelease({ apkUrl, apkSha256: SHA }).ok).toBe(false);
    }
  });
  it('exige la huella SHA-256', () => {
    for (const apkSha256 of [undefined, '', 'abc', 'g'.repeat(64), SHA + 'a']) {
      expect(validateApkRelease({ apkUrl: 'https://releases.bitafly.com/a.apk', apkSha256 }).ok).toBe(false);
    }
  });
  it('normalizeApkSha256 devuelve null si no es válida', () => {
    expect(normalizeApkSha256(' ' + SHA + ' ')).toBe(SHA);
    expect(normalizeApkSha256('xyz')).toBeNull();
  });
});
