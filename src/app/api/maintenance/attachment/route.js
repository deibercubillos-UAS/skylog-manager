import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { storageRemove, storageDownload } from '@/lib/storage';

const MIME = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};
const mimeFor = (k) => MIME[k.split('.').pop()?.toLowerCase()] || 'application/octet-stream';

export const dynamic = 'force-dynamic';

// GET /api/maintenance/attachment?path=orgs/{orgId}/... — signed URL 1h
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const path = new URL(request.url).searchParams.get('path');
    if (!path || !String(path).startsWith(`orgs/${orgId}/`)) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

    // Servir por streaming desde el servidor (mismo origen) → inmune a
    // extensiones/CORS que bloqueen cloudflarestorage.com.
    const { data, error } = await storageDownload({ bucket: 'maintenance-docs', key: path });
    if (error || !data) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mimeFor(path),
        'Content-Length': String(data.length),
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3300',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/maintenance/attachment — rollback: borrar adjunto huérfano
// Body: { path: 'orgs/{orgId}/...' }
export async function DELETE(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { path } = await request.json();
    if (!path || !String(path).startsWith(`orgs/${orgId}/`)) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

    await storageRemove({ bucket: 'maintenance-docs', keys: path });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
