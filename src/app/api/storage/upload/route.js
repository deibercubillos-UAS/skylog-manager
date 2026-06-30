import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { storagePut, storagePublicUrl, PUBLIC_BUCKETS } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Subida PROXY por el servidor (mismo origen → sin CORS, sin URL prefirmada).
// El navegador envía el archivo aquí (multipart) y el servidor lo sube a R2.
// Inmune a bloqueos de extensiones/CORS del navegador sobre cloudflarestorage.com.
//
// ⚠️ Límite de cuerpo de funciones serverless en Vercel = 4.5 MB. Capamos a 4.4 MB.
// Para archivos mayores seguiría existiendo la subida prefirmada (sign-upload).

const ORG_SCOPED = new Set(['documents', 'fleet-images', 'maintenance-docs']);
const ALLOWED = new Set([...ORG_SCOPED, 'company-manuals']);
const MAX_BYTES = Math.floor(4.4 * 1024 * 1024);

export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user || !orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const form = await request.formData();
    const bucket = form.get('bucket');
    const key = String(form.get('key') || '').replace(/^\/+/, '');
    const file = form.get('file');

    if (!bucket || !key || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'Faltan bucket, key o archivo' }, { status: 400 });
    }
    if (!ALLOWED.has(bucket)) {
      return NextResponse.json({ error: 'Bucket no permitido' }, { status: 400 });
    }
    // Aislamiento por organización (reemplaza la RLS de carpeta)
    if (ORG_SCOPED.has(bucket) && !key.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: 'Ruta fuera de la organización' }, { status: 403 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 4 MB.' }, { status: 413 });
    }

    const body = Buffer.from(await file.arrayBuffer());
    const { error } = await storagePut({
      bucket,
      key,
      body,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) {
      console.error('[storage/upload] storagePut error:', error?.name, '-', error?.message,
        '| endpoint?', !!process.env.R2_ENDPOINT, '| key?', !!process.env.R2_ACCESS_KEY_ID, '| secret?', !!process.env.R2_SECRET_ACCESS_KEY);
      return NextResponse.json({ error: 'No se pudo subir el archivo.', detail: error?.name || error?.message || 'unknown' }, { status: 500 });
    }

    const out = { key };
    if (PUBLIC_BUCKETS.has(bucket)) {
      out.publicUrl = storagePublicUrl({ bucket, key }).data.publicUrl;
    }
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
