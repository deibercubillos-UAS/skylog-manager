// Skylog V2.0 — evidencias adjuntas de un reporte VOR/MOR (fotos, PDF). Las usan el formulario interno y
// el público. Sube al bucket PRIVADO `documents` bajo el prefijo `v2-orgs/` (mismo patrón que pólizas y
// documento de propiedad) y registra la fila con service role: la tabla no tiene política de INSERT para
// usuarios, así que nadie puede colgar archivos de un reporte ajeno llamando a la base directo.
import { createAdminClient } from '@/lib/supabaseServer';
import { storagePut, storageRemove } from '@/lib/storage';

export const REPORT_ATTACHMENT_BUCKET = 'documents';
export const MAX_ATTACHMENTS_PER_REPORT = 5;
// 4 MB y no más: el cuerpo de una función en Vercel se corta en ~4,5 MB (413 antes de llegar a este código).
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Valida un archivo recibido; devuelve un mensaje de error o null. */
export function attachmentProblem(file) {
  if (!file || typeof file === 'string') return 'No llegó ningún archivo.';
  if (!ALLOWED_ATTACHMENT_TYPES[file.type]) return 'Formato no soportado: usa PDF, PNG, JPEG o WEBP.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'El archivo supera el límite de 4 MB.';
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

function safeName(name) {
  const base = String(name || 'evidencia').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return base.slice(-80) || 'evidencia';
}

/**
 * Sube el archivo y registra la fila. Devuelve { attachment } o { error, status }.
 * `uploadedBy`: persona (null en reportes públicos sin cuenta).
 */
export async function storeReportAttachment({ organizationId, reportId, file, uploadedBy = null }) {
  const problem = attachmentProblem(file);
  if (problem) return { error: problem, status: 400 };

  const admin = createAdminClient();
  const { count, error: countError } = await admin.from('sms_report_attachments').select('id', { count: 'exact', head: true }).eq('report_id', reportId);
  if (countError) return { error: 'No se pudo verificar los adjuntos del reporte.', status: 500 };
  if ((count || 0) >= MAX_ATTACHMENTS_PER_REPORT) return { error: `Un reporte admite como máximo ${MAX_ATTACHMENTS_PER_REPORT} evidencias.`, status: 409 };

  const key = `v2-orgs/${organizationId}/sms-reports/${reportId}/${Date.now()}-${safeName(file.name)}`;
  const body = Buffer.from(await file.arrayBuffer());
  const { error: putError } = await storagePut({ bucket: REPORT_ATTACHMENT_BUCKET, key, body, contentType: file.type });
  if (putError) {
    console.error('[sms-attachments] la subida a R2 falló:', putError?.message || putError);
    return { error: 'No se pudo subir el archivo.', status: 500 };
  }

  const { data, error } = await admin
    .from('sms_report_attachments')
    .insert({ report_id: reportId, organization_id: organizationId, storage_key: key, file_name: file.name?.slice(0, 200) || 'evidencia', content_type: file.type, size_bytes: file.size, uploaded_by: uploadedBy })
    .select('id, file_name, content_type, size_bytes, created_at')
    .single();
  if (error) {
    await storageRemove({ bucket: REPORT_ATTACHMENT_BUCKET, keys: [key] }); // no dejar un archivo huérfano
    return { error: 'No se pudo registrar el archivo.', status: 500 };
  }
  return { attachment: data };
}
