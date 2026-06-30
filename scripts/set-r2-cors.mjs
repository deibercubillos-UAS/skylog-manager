/**
 * set-r2-cors.mjs — Configura la política CORS de los buckets Cloudflare R2.
 *
 * Uso:
 *   node scripts/set-r2-cors.mjs           # aplica CORS a todos los buckets
 *   node scripts/set-r2-cors.mjs --verify  # solo muestra la config actual
 *
 * Requiere en el entorno (o en .env.local):
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * Por qué: la app sube archivos con un PUT prefirmado DIRECTO del navegador a R2
 * (Content-Type no "simple" → preflight CORS). Sin política CORS, R2 rechaza el
 * preflight y la subida del navegador falla en silencio. Esto habilita las subidas.
 * No expone datos: los buckets siguen privados y la URL prefirmada sigue siendo
 * obligatoria; CORS solo autoriza qué orígenes web pueden ejecutar la petición.
 */

import {
  S3Client, PutBucketCorsCommand, GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Cargar .env.local si existe ──────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const ORIGINS = [
  'https://bitafly.com',
  'https://www.bitafly.com',
  'http://localhost:3000',
];

const BUCKETS = [
  'documents', 'fleet-images', 'partner-logos', 'app-releases',
  'maintenance-docs', 'company-manuals', 'flight-replays',
];

const CORS_RULES = [{
  AllowedOrigins: ORIGINS,
  AllowedMethods: ['GET', 'PUT', 'HEAD'],
  AllowedHeaders: ['*'],
  ExposeHeaders: ['ETag'],
  MaxAgeSeconds: 3600,
}];

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const verifyOnly = process.argv.includes('--verify');

for (const bucket of BUCKETS) {
  try {
    if (!verifyOnly) {
      await s3.send(new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: { CORSRules: CORS_RULES },
      }));
    }
    const r = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log(`[${bucket}] ${verifyOnly ? 'CORS actual' : 'CORS aplicado'}:`, JSON.stringify(r.CORSRules));
  } catch (e) {
    console.error(`[${bucket}] ERROR:`, e.name || e.message);
  }
}
console.log('\nOrígenes permitidos:', ORIGINS.join(', '));
