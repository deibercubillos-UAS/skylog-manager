import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const BUCKET = 'documents';

// GET /api/documents/open?path=<orgId>/crew/docs/x.pdf
// Valida que el path pertenezca a la org del usuario y redirige (302) a una
// signed URL fresca (1h). Sirve para <a href>, <img src> y links en PDF —
// el enlace nunca expira porque resuelve al vuelo. Bucket `documents` privado.
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user || !orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let path = new URL(request.url).searchParams.get('path') || '';
    path = path.replace(/^\/+/, '');
    // Compatibilidad: aceptar también una URL pública/firmada completa
    const m = path.match(/object\/(?:public|sign)\/documents\/(.+)$/);
    if (m) path = decodeURIComponent(m[1].split('?')[0]);
    if (!path) return NextResponse.json({ error: 'Falta path' }, { status: 400 });

    // Aislamiento por organización: el path debe empezar por {orgId}/
    if (!path.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const res = NextResponse.redirect(data.signedUrl, 302);
    // Cache en el navegador 55 min (< 1h de validez de la signed URL).
    // 'private' evita que proxies intermedios cacheen documentos de un usuario.
    res.headers.set('Cache-Control', 'private, max-age=3300, immutable');
    return res;
  } catch (err) {
    console.error('[documents/open]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
