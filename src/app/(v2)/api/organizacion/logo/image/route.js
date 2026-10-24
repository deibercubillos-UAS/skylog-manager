// Skylog V2.0 — sirve el logo de la organización desde el mismo origen para que los PDF lo puedan
// descargar sin depender de CORS del CDN (el navegador puede tener la imagen en caché sin cabeceras CORS
// por haberla mostrado en el sidebar con <img>). Solo acepta URLs del bucket de logos.
import { createClientSSR } from '@/lib/supabaseServer';
import { storagePublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const url = new URL(request.url).searchParams.get('url') || '';
  const allowed = storagePublicUrl({ bucket: 'partner-logos', key: 'v2-orgs/' }).data.publicUrl;
  if (!allowed.startsWith('https://') || !url.startsWith(allowed) || url.includes('..')) {
    return Response.json({ error: 'URL no permitida' }, { status: 400 });
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return Response.json({ error: 'Logo no disponible' }, { status: 404 });
  return new Response(await res.arrayBuffer(), { headers: { 'Content-Type': res.headers.get('content-type') || 'image/png', 'Cache-Control': 'private, max-age=300' } });
}
