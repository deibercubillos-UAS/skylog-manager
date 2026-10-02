// Skylog V2.0 — Manuales: descarga vía URL firmada (1h). Cualquier miembro
// activo de la org. ?versionId= para descargar una versión del historial en
// vez de la vigente.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { storageSignedUrl } from '@/lib/storage';

const BUCKET = 'documents';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error } = await supabase.from('manuales').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(manual.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('versionId');

  let filePath = manual.current_file_path;
  if (versionId) {
    const { data: versionRow, error: versionError } = await supabase
      .from('manual_versions')
      .select('file_path, manual_id')
      .eq('id', versionId)
      .maybeSingle();
    if (versionError) return Response.json({ error: versionError.message }, { status: 500 });
    if (!versionRow || versionRow.manual_id !== manual.id) return Response.json({ error: 'Versión no encontrada' }, { status: 404 });
    filePath = versionRow.file_path;
  }
  if (!filePath) return Response.json({ error: 'Este manual no tiene ningún archivo cargado' }, { status: 404 });

  const { data: signed, error: signError } = await storageSignedUrl({ bucket: BUCKET, key: filePath, expiresIn: 3600 });
  if (signError) return Response.json({ error: 'No se pudo generar el enlace de descarga' }, { status: 500 });

  return Response.redirect(signed.signedUrl, 302);
}
