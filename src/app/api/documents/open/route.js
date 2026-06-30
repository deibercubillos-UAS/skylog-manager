import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { storageDownload } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const BUCKET = 'documents';

const MIME = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  svg: 'image/svg+xml',
};
function mimeFor(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// GET /api/documents/open?path=<orgId>/crew/docs/x.pdf
// Valida que el path pertenezca a la org del usuario y SIRVE el archivo por
// streaming desde el servidor (mismo origen). No redirige a R2 → inmune a
// extensiones/CORS que bloqueen cloudflarestorage.com. Bucket `documents` privado.
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

    const { data, error } = await storageDownload({ bucket: BUCKET, key: path });
    if (error || !data) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mimeFor(path),
        'Content-Length': String(data.length),
        // Cache privado en el navegador (no en proxies intermedios)
        'Cache-Control': 'private, max-age=3300',
      },
    });
  } catch (err) {
    console.error('[documents/open]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
