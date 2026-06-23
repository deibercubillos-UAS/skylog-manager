import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { storageUploadUrl, storagePublicUrl, PUBLIC_BUCKETS } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Buckets cuya key DEBE empezar por `{orgId}/` (aislamiento por organización,
// reemplaza la RLS de carpeta de Supabase).
const ORG_SCOPED = new Set(['documents', 'fleet-images', 'maintenance-docs']);
// Buckets permitidos para subida prefirmada desde el navegador.
const ALLOWED = new Set([...ORG_SCOPED, 'company-manuals']);

// POST /api/storage/sign-upload
// Body: { bucket, key, contentType }
// Devuelve { uploadUrl, key, publicUrl? } para que el navegador haga PUT directo a R2.
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user || !orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { bucket, key, contentType } = await request.json();
    if (!bucket || !key) return NextResponse.json({ error: 'Faltan bucket/key' }, { status: 400 });
    if (!ALLOWED.has(bucket)) return NextResponse.json({ error: 'Bucket no permitido' }, { status: 400 });

    // Aislamiento por organización
    const cleanKey = String(key).replace(/^\/+/, '');
    if (ORG_SCOPED.has(bucket) && !cleanKey.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: 'Ruta fuera de la organización' }, { status: 403 });
    }

    const { data, error } = await storageUploadUrl({ bucket, key: cleanKey, contentType });
    if (error || !data?.uploadUrl) {
      return NextResponse.json({ error: 'No se pudo firmar la subida' }, { status: 500 });
    }

    const out = { uploadUrl: data.uploadUrl, key: cleanKey };
    if (PUBLIC_BUCKETS.has(bucket)) {
      out.publicUrl = storagePublicUrl({ bucket, key: cleanKey }).data.publicUrl;
    }
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
