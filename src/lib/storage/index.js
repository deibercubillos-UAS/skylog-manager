// ── Capa de abstracción de almacenamiento (Supabase Storage ⇄ Cloudflare R2) ──
//
// Objetivo: migrar de Supabase Storage a R2 bucket-por-bucket, SIN cambiar la
// experiencia del frontend y SIN downtime. El comportamiento se controla por un
// flag por bucket (env var `STORAGE_MODE_<BUCKET>`):
//
//   supabase  → todo va a Supabase Storage (estado actual, por defecto)
//   dual      → ESCRIBE en R2; LEE de R2 con *fallback* a Supabase (transición)
//   r2        → todo va a R2 (bucket ya migrado)
//
// Las funciones espejan las formas de retorno del SDK de Supabase
// ({ data, error }) para que el refactor de los callers sea casi 1:1.

import { createClient } from '@supabase/supabase-js';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectsCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Buckets que se sirven públicamente (URL directa / CDN) — el resto es privado.
export const PUBLIC_BUCKETS = new Set([
  'fleet-images', 'partner-logos', 'app-releases', 'vor-mor-attachments',
]);

// ── Selección de modo por bucket ──────────────────────────────────────────────
export function bucketMode(bucket) {
  const key = 'STORAGE_MODE_' + String(bucket).replace(/-/g, '_').toUpperCase();
  const v = (process.env[key] || 'supabase').toLowerCase();
  return ['supabase', 'dual', 'r2'].includes(v) ? v : 'supabase';
}

// ── Clientes (lazy) ───────────────────────────────────────────────────────────
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

let _sb = null;
function sb() {
  if (!_sb) {
    _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _sb;
}

// Normaliza distintos tipos de body a algo que el SDK de S3 acepta.
function toBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body));
  return body; // string u otro soportado por el SDK
}

async function r2Exists(bucket, key) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ── API pública de la capa ────────────────────────────────────────────────────

// Sube un objeto. Devuelve { error }.
export async function storagePut({ bucket, key, body, contentType, upsert = false, cacheControl }) {
  const mode = bucketMode(bucket);
  try {
    if (mode === 'supabase') {
      const { error } = await sb().storage.from(bucket).upload(key, body, {
        contentType, upsert, cacheControl,
      });
      return { error };
    }
    // dual | r2 → escribir en R2
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
  const mode = bucketMode(bucket);
  try {
    if (mode === 'supabase') {
      return await sb().storage.from(bucket).createSignedUrl(key, expiresIn);
    }
    if (mode === 'dual' && !(await r2Exists(bucket, key))) {
      // aún no migrado este objeto → servir desde Supabase
      return await sb().storage.from(bucket).createSignedUrl(key, expiresIn);
    }
    const signedUrl = await getSignedUrl(
      s3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn },
    );
    return { data: { signedUrl }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Genera una URL firmada de SUBIDA (PUT) directa a R2 (para subida desde el
// navegador). Solo aplica en dual|r2. Devuelve { data: { uploadUrl }, error }.
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

// URL pública directa (buckets públicos). Devuelve { data: { publicUrl } }.
export function storagePublicUrl({ bucket, key }) {
  const mode = bucketMode(bucket);
  if (mode === 'supabase') {
    return sb().storage.from(bucket).getPublicUrl(key);
  }
  // dual | r2 → dominio CDN (cdn.bitafly.com). El mapeo dominio↔bucket se
  // define en la fase de buckets públicos.
  const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return { data: { publicUrl: `${base}/${bucket}/${key}` } };
}

// Elimina objeto(s). Acepta string o array. Devuelve { error }.
export async function storageRemove({ bucket, keys }) {
  const mode = bucketMode(bucket);
  const arr = Array.isArray(keys) ? keys : [keys];
  if (arr.length === 0) return { error: null };
  try {
    if (mode === 'supabase') {
      const { error } = await sb().storage.from(bucket).remove(arr);
      return { error };
    }
    await s3().send(new DeleteObjectsCommand({
      Bucket: bucket, Delete: { Objects: arr.map((Key) => ({ Key })) },
    }));
    // en dual, limpiar también la copia legacy en Supabase (best-effort)
    if (mode === 'dual') { try { await sb().storage.from(bucket).remove(arr); } catch {} }
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Descarga el contenido de un objeto. Devuelve { data: Buffer, error }.
export async function storageDownload({ bucket, key }) {
  const mode = bucketMode(bucket);
  try {
    if (mode === 'supabase' || (mode === 'dual' && !(await r2Exists(bucket, key)))) {
      const { data, error } = await sb().storage.from(bucket).download(key);
      if (error || !data) return { data: null, error };
      const buf = Buffer.from(await data.arrayBuffer());
      return { data: buf, error: null };
    }
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await res.Body.transformToByteArray();
    return { data: Buffer.from(bytes), error: null };
  } catch (error) {
    return { data: null, error };
  }
}
