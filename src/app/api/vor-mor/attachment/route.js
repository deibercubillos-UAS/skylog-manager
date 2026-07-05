import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const MIME = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};
const mimeFor = (k) => MIME[k.split('.').pop()?.toLowerCase()] || 'application/octet-stream';

// GET /api/vor-mor/attachment?path={orgId}/{archivo}
// Sirve por streaming (mismo origen) los adjuntos que el formulario público
// VOR/MOR sube al bucket de Supabase Storage `vor-mor-attachments` (ver
// POST /api/public/upload/[orgCode]). El path viene con prefijo {orgId}/ —
// se valida contra la org del usuario para impedir acceso cross-tenant. Mismo
// nivel de acceso que GET /api/vor-mor (cualquier miembro de la org: el cuerpo
// del reporte ya es visible para ellos, sería incoherente gatear más el adjunto).
export async function GET(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const path = new URL(request.url).searchParams.get('path');
        if (!path || !String(path).startsWith(`${orgId}/`)) {
            return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
        }

        // Los adjuntos VOR/MOR viven en Supabase Storage (no R2) — se leen con el
        // service role, mismo backend donde los escribe el endpoint público.
        const admin = createAdminClient();
        const { data, error } = await admin.storage.from('vor-mor-attachments').download(path);
        if (error || !data) return NextResponse.json({ error: 'Adjunto no encontrado.' }, { status: 404 });

        const buffer = Buffer.from(await data.arrayBuffer());
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': mimeFor(path),
                'Content-Length': String(buffer.length),
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, max-age=3300',
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
