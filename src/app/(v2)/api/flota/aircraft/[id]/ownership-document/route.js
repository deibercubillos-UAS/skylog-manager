// Skylog V2.0 — Flota & Equipo, Fase 3: Documento de propiedad
// (`100.535(1)`) de una aeronave — título o derecho de uso. Sube al bucket
// PRIVADO `documents` (mismo bucket ya usado en producción para documentos
// sensibles) bajo el prefijo `v2-orgs/` para no chocar con llaves de v1
// (mismo criterio ya usado para el logo de organización). Sin tabla
// `documents` genérica todavía en V2 — la ruta se guarda directo en
// `aircraft.ownership_document_path`, no como Documento polimórfico.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storagePut, storageSignedUrl } from '@/lib/storage';

const BUCKET = 'documents';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB: el cuerpo de una función de Vercel admite ~4,5 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

async function authorize(supabase, userId, aircraftId) {
  const { data: aircraft, error: fetchError } = await supabase.from('aircraft').select('organization_id, ownership_document_path').eq('id', aircraftId).maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando la aeronave' }, { status: 500 }) };
  if (!aircraft) return { error: Response.json({ error: 'Aeronave no encontrada' }, { status: 404 }) };

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, userId);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!isDutyManager(memberships, aircraft.organization_id)) {
    return { error: Response.json({ error: 'Solo un gestor puede subir el documento de propiedad' }, { status: 403 }) };
  }
  return { aircraft };
}

export async function POST(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: authError, aircraft } = await authorize(supabase, user.id, id);
  if (authError) return authError;

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, PNG, JPEG o WEBP' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 4 MB' }, { status: 413 });

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const key = `v2-orgs/${aircraft.organization_id}/aircraft/${id}/ownership-${Date.now()}.${ext}`;

  const body = Buffer.from(await file.arrayBuffer());
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el documento' }, { status: 500 });

  const { data, error } = await supabase.from('aircraft').update({ ownership_document_path: key }).eq('id', id).select('id, ownership_document_path').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ aircraft: data });
}

// GET — sirve el documento vía redirect a una URL firmada (mismo patrón que
// v1 para privados: valida membresía → 302, nunca expone el path directo).
export async function GET(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: aircraft, error: fetchError } = await supabase.from('aircraft').select('organization_id, ownership_document_path').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando la aeronave' }, { status: 500 });
  if (!aircraft) return Response.json({ error: 'Aeronave no encontrada' }, { status: 404 });
  if (!aircraft.ownership_document_path) return Response.json({ error: 'Esta aeronave no tiene documento de propiedad cargado' }, { status: 404 });

  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!orgIds.includes(aircraft.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: aircraft.ownership_document_path, expiresIn: 3600 });
  if (error) return Response.json({ error: 'No se pudo generar el enlace del documento' }, { status: 500 });

  return Response.redirect(data.signedUrl, 302);
}
