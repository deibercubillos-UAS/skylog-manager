// Skylog V2.0 — expediente documental de una persona (cédula, curso de piloto, examen teórico, certificado
// médico; RAC 100 §100.535(8)). Los puede cargar y ver la propia persona o un gestor de una organización donde
// participa; nadie más. Mismo almacenamiento que el resto de adjuntos (bucket privado `documents`, 4 MB, URL
// firmada de 1 h) y la ruta del archivo nunca sale del servidor: el listado solo dice qué tipos hay cargados.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storageProblem } from '@/lib/v2/adminKey';
import { storagePut, storageSignedUrl, storageRemove } from '@/lib/storage';
import { DOCUMENT_MAX_BYTES } from '@/lib/v2/rowDocument';

const BUCKET = 'documents';
const TYPES = ['cedula', 'curso_piloto', 'examen_teorico', 'certificado_medico', 'otro'];
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

async function session(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId) return { error: Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 }) };
  return { supabase, personId, memberships };
}

// ¿Puede esta sesión tocar el expediente de `targetId`? Ella misma, o un gestor de una organización compartida.
async function canAccess(s, targetId) {
  if (targetId === s.personId) return true;
  const { data } = await s.supabase.from('memberships').select('organization_id').eq('person_id', targetId).eq('status', 'activa');
  return (data || []).some((m) => isDutyManager(s.memberships, m.organization_id));
}

export async function GET(request) {
  const s = await session(request);
  if (s.error) return s.error;
  const url = new URL(request.url);
  const targetId = url.searchParams.get('personId') || s.personId;
  if (!(await canAccess(s, targetId))) return Response.json({ error: 'No tienes acceso al expediente de esta persona' }, { status: 403 });
  const type = url.searchParams.get('type');

  if (!type) {
    const { data, error } = await s.supabase.from('person_documents').select('doc_type, created_at').eq('person_id', targetId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ documents: data || [], types: TYPES });
  }
  if (!TYPES.includes(type)) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  const { data: row } = await s.supabase.from('person_documents').select('document_path').eq('person_id', targetId).eq('doc_type', type).maybeSingle();
  if (!row) return Response.json({ error: 'No hay documento cargado' }, { status: 404 });
  const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: row.document_path, expiresIn: 3600 });
  if (error) return Response.json({ error: 'No se pudo generar el enlace del documento' }, { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}

export async function POST(request) {
  const issue = storageProblem();
  if (issue) return Response.json({ error: issue, setup: true }, { status: 503 });
  const s = await session(request);
  if (s.error) return s.error;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const docType = form?.get('docType');
  const targetId = form?.get('personId') || s.personId;
  if (!TYPES.includes(docType)) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, PNG, JPEG o WEBP' }, { status: 400 });
  if (file.size > DOCUMENT_MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 4 MB' }, { status: 413 });
  if (!(await canAccess(s, targetId))) return Response.json({ error: 'No tienes acceso al expediente de esta persona' }, { status: 403 });

  const { data: previous } = await s.supabase.from('person_documents').select('document_path').eq('person_id', targetId).eq('doc_type', docType).maybeSingle();
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const key = `v2-people/${targetId}/${docType}-${Date.now()}.${ext}`;
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el documento' }, { status: 500 });

  const { error } = await s.supabase.from('person_documents').upsert({ person_id: targetId, doc_type: docType, document_path: key, uploaded_by: s.personId }, { onConflict: 'person_id,doc_type' });
  if (error) {
    await storageRemove({ bucket: BUCKET, keys: [key] });
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (previous?.document_path) await storageRemove({ bucket: BUCKET, keys: [previous.document_path] });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const s = await session(request);
  if (s.error) return s.error;
  const url = new URL(request.url);
  const targetId = url.searchParams.get('personId') || s.personId;
  const type = url.searchParams.get('type');
  if (!TYPES.includes(type)) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  if (!(await canAccess(s, targetId))) return Response.json({ error: 'No tienes acceso al expediente de esta persona' }, { status: 403 });
  const { data: row } = await s.supabase.from('person_documents').select('id, document_path').eq('person_id', targetId).eq('doc_type', type).maybeSingle();
  if (!row) return Response.json({ ok: true });
  const { error } = await s.supabase.from('person_documents').delete().eq('id', row.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await storageRemove({ bucket: BUCKET, keys: [row.document_path] });
  return Response.json({ ok: true });
}
