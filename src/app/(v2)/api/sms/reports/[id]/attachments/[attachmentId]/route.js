// Skylog V2.0 — descarga de una evidencia: valida visibilidad con la RLS (la fila solo se devuelve a quien ve
// el reporte) y redirige a una URL firmada de 1 h. Nunca expone la ruta de almacenamiento.
import { createClientSSR } from '@/lib/supabaseServer';
import { storageSignedUrl } from '@/lib/storage';
import { REPORT_ATTACHMENT_BUCKET } from '@/lib/v2/reportAttachments';

export async function GET(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id, attachmentId } = await params;
  const { data, error } = await supabase.from('sms_report_attachments').select('storage_key').eq('id', attachmentId).eq('report_id', id).maybeSingle();
  if (error) return Response.json({ error: 'Error consultando la evidencia' }, { status: 500 });
  if (!data) return Response.json({ error: 'Evidencia no encontrada' }, { status: 404 });

  const { data: signed, error: signError } = await storageSignedUrl({ bucket: REPORT_ATTACHMENT_BUCKET, key: data.storage_key, expiresIn: 3600 });
  if (signError) return Response.json({ error: 'No se pudo generar el enlace' }, { status: 500 });
  return Response.redirect(signed.signedUrl, 302);
}
