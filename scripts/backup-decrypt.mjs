// Descifra un respaldo de /api/cron/backup-r2 (`AAAA-MM-DD.json.gz.enc`) y deja el JSON listo para restaurar.
// Uso: BACKUP_ENCRYPTION_KEY=... node scripts/backup-decrypt.mjs <archivo.json.gz.enc> [salida.json]
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';

const [input, output] = process.argv.slice(2);
const secret = process.env.BACKUP_ENCRYPTION_KEY;
if (!input || !secret) {
  console.error('Uso: BACKUP_ENCRYPTION_KEY=... node scripts/backup-decrypt.mjs <archivo.json.gz.enc> [salida.json]');
  process.exit(1);
}
const buf = fs.readFileSync(input);
if (buf.subarray(0, 6).toString() !== 'BFENC1') {
  console.error('El archivo no es un respaldo cifrado de BitaFly (falta la cabecera BFENC1).');
  process.exit(1);
}
const key = crypto.createHash('sha256').update(secret).digest();
const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(6, 18));
decipher.setAuthTag(buf.subarray(18, 34));
const json = zlib.gunzipSync(Buffer.concat([decipher.update(buf.subarray(34)), decipher.final()]));
const out = output || input.replace(/\.json\.gz\.enc$/, '.json');
fs.writeFileSync(out, json);
console.log(`Respaldo descifrado en ${out} (${json.length} bytes).`);
