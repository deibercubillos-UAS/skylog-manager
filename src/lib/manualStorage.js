// Constantes y helpers de storage para Manuales de la Empresa.
// Bucket privado company-manuals: path orgs/{orgId}/manuals/{manualId}/...

import { storagePut } from '@/lib/storage';

export const MANUALS_BUCKET = 'company-manuals';
export const MANUAL_MAX_SIZE = 25 * 1024 * 1024; // 25 MB (= límite del bucket)

export const MANUAL_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                       // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'application/vnd.ms-excel',                                                 // .xls
]);

// Sanitiza el nombre de archivo para usarlo en un path de storage.
export function safeFileName(name) {
  return String(name || 'manual')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

/**
 * Valida y sube un archivo de manual al bucket privado.
 * @returns {{ path?: string, error?: string, status?: number }}
 */
export async function uploadManualFile({ admin, orgId, manualId, file }) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { error: 'Archivo del manual obligatorio.', status: 400 };
  }
  if (file.size > MANUAL_MAX_SIZE) {
    return { error: 'Archivo demasiado grande (máx 25 MB).', status: 413 };
  }
  if (file.type && !MANUAL_ALLOWED_MIME.has(file.type)) {
    return { error: `Tipo de archivo no permitido (${file.type}). Usa PDF, Word o Excel.`, status: 415 };
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) return { error: 'El archivo está vacío.', status: 400 };

  const path = `orgs/${orgId}/manuals/${manualId}/${Date.now()}-${safeFileName(file.name)}`;

  const { error } = await storagePut({
    bucket:      MANUALS_BUCKET,
    key:         path,
    body:        buffer,
    contentType: file.type || 'application/octet-stream',
    upsert:      false,
  });

  if (error) return { error: error.message, status: 500 };
  return { path };
}
