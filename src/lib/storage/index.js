// ── Capa de almacenamiento — Cloudflare R2 ───────────────────────────────────
//
// Todos los buckets han sido migrados de Supabase Storage a R2 (Fase 8).
// La lógica de fallback y los flags STORAGE_MODE_<BUCKET> fueron eliminados.

import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectsCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Buckets que se sirven públicamente (URL directa / CDN) — el resto es privado.
export const PUBLIC_BUCKETS = new Set([
  'fleet-images', 'partner-logos', 'app-releases', 'vor-mor-attachments',
]);

// ── Cliente S3/R2 (lazy) ──────────────────────────────────────────────────────
let _s3 = null;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3;
}

// Normaliza distintos tipos de body a algo que el SDK de S3 acepta.
function toBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body));
  return body;
}

// ── API pública ───────────────────────────────────────────────────────────────

// Sube un objeto. Devuelve { error }.
export async function storagePut({ bucket, key, body, contentType, cacheControl }) {
  try {
    await s3().send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: toBuffer(body),
      ContentType: contentType || 'application/octet-stream',
      CacheControl: cacheControl,
    }));
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Genera una URL firmada de descarga. Devuelve { data: { signedUrl }, error }.
export async function storageSignedUrl({ bucket, key, expiresIn = 3600 }) {
  try {
    const signedUrl = await getSignedUrl(
      s3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn },
    );
    return { data: { signedUrl }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Genera una URL firmada de SUBIDA (PUT) directa a R2 desde el navegador.
// Devuelve { data: { uploadUrl }, error }.
export async function storageUploadUrl({ bucket, key, contentType, expiresIn = 300 }) {
  try {
    const uploadUrl = await getSignedUrl(
      s3(),
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn },
    );
    return { data: { uploadUrl }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Mapa de dominios CDN por bucket público (cada uno tiene su propio subdominio).
const PUBLIC_CDN = {
  'fleet-images':  process.env.R2_PUBLIC_BASE_URL   || '',   // cdn.bitafly.com
  'partner-logos': process.env.R2_LOGOS_BASE_URL    || '',   // logos.bitafly.com
  'app-releases':  process.env.R2_RELEASES_BASE_URL || '',   // releases.bitafly.com
};

// URL pública directa (buckets públicos). Devuelve { data: { publicUrl } }.
export function storagePublicUrl({ bucket, key }) {
  const base = (PUBLIC_CDN[bucket] || process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return { data: { publicUrl: `${base}/${key}` } };
}

// Elimina objeto(s). Acepta string o array. Devuelve { error }.
export async function storageRemove({ bucket, keys }) {
  const arr = Array.isArray(keys) ? keys : [keys];
  if (arr.length === 0) return { error: null };
  try {
    await s3().send(new DeleteObjectsCommand({
      Bucket: bucket, Delete: { Objects: arr.map((Key) => ({ Key })) },
    }));
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Descarga el contenido de un objeto. Devuelve { data: Buffer, error }.
export async function storageDownload({ bucket, key }) {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await res.Body.transformToByteArray();
    return { data: Buffer.from(bytes), error: null };
  } catch (error) {
    return { data: null, error };
  }
}
