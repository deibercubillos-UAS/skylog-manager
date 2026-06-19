import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { storageRemove, storageSignedUrl } from '@/lib/storage';

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

    const { data, error } = await storageSignedUrl({ bucket: 'maintenance-docs', key: path, expiresIn: 3600 });
    if (error || !data?.signedUrl) return NextResponse.json({ error: 'No se pudo generar el enlace.' }, { status: 500 });

    return NextResponse.json({ signedUrl: data.signedUrl });
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
