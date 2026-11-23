// Skylog V2.0 — Manuales: constantes y helpers de subida compartidos por las
// rutas POST (/api/manuales y /api/manuales/[id]/versions) y por la ruta que
// firma la subida directa a R2 (/api/manuales/upload-url).
//
// Por qué subida directa: en Vercel el cuerpo de una función serverless está
// topado en ~4.5 MB, así que un archivo entre 4.5 y 25 MB lo rechaza la
// plataforma con un 413 ANTES de llegar al handler. El navegador sube el
// archivo directo a R2 con una URL prefirmada (sin pasar por la función) y
// luego sólo manda el metadato (`key`) por JSON — un cuerpo diminuto.
import { storageHead } from '@/lib/storage';

export const MANUALES_BUCKET = 'documents';
export const MANUALES_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const MANUALES_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

// Extensión segura a partir del nombre del archivo (sólo letras/números, corta).
function safeExt(fileName) {
  const raw = (fileName || '').split('.').pop() || '';
  return /^[a-z0-9]{1,8}$/i.test(raw) ? raw.toLowerCase() : 'pdf';
}

// Construye la clave del objeto en R2. Para un manual nuevo todavía no hay id,
// así que se usa un token aleatorio bajo `_nuevos/`; para una versión nueva se
// ancla al id del manual (igual que el esquema que ya usaba v1).
export function buildManualKey({ organizationId, manualId, version, fileName, token }) {
  const ext = safeExt(fileName);
  const v = String(version || '').trim().replace(/[^a-z0-9._-]/gi, '') || '0';
  const scope = manualId ? manualId : `_nuevos/${token}`;
  return `v2-orgs/${organizationId}/manuales/${scope}/${Date.now()}-v${v}.${ext}`;
}

// Verifica, tras una subida directa, que el objeto existe en R2 y que su tipo y
// tamaño son admisibles. Devuelve { ok, error, status }. No confía en lo que
// declaró el cliente: relee los metadatos reales desde R2.
export async function verifyUploadedManual({ key, declaredContentType }) {
  if (!key || typeof key !== 'string') return { ok: false, status: 400, error: 'key es requerido' };
  const { data, error } = await storageHead({ bucket: MANUALES_BUCKET, key });
  if (error || !data) return { ok: false, status: 400, error: 'No se encontró el archivo subido — vuelve a intentarlo' };
  const type = data.contentType || declaredContentType || '';
  if (!MANUALES_ALLOWED_TYPES.has(type)) return { ok: false, status: 400, error: 'Formato no soportado — usa PDF, Word o Excel' };
  if (data.size > MANUALES_MAX_BYTES) return { ok: false, status: 413, error: 'El archivo supera el límite de 25 MB' };
  if (data.size === 0) return { ok: false, status: 400, error: 'El archivo llegó vacío — vuelve a intentarlo' };
  return { ok: true, contentType: type, size: data.size };
}
