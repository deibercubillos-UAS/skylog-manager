// Skylog V2.0 — Pólizas: certificado de vigencia (PDF/imagen) de una póliza.
// Mismo patrón que el documento de propiedad de aeronave: bucket PRIVADO
// `documents` bajo el prefijo `v2-orgs/`, ruta guardada directo en la fila
// (todavía no hay tabla `documents` genérica en V2), descarga por redirect a
// una URL firmada tras validar membresía — nunca se expone el path.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storageProblem } from '@/lib/v2/adminKey';
import { storagePut, storageSignedUrl, storageRemove } from '@/lib/storage';

const BUCKET = 'documents';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB: el cuerpo de una función en Vercel se corta en ~4,5 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

async function load(supabase, policyId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };

  const { data: policy, error: fetchError } = await supabase
    .from('insurance_policies')
    .select('organization_id, document_path')
    .eq('id', policyId)
    .maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando la póliza' }, { status: 500 }) };
  if (!policy) return { error: Response.json({ error: 'Póliza no encontrada' }, { status: 404 }) };

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!isDutyManager(memberships, policy.organization_id)) {
    return { error: Response.json({ error: 'Solo un gestor puede gestionar el documento de una póliza' }, { status: 403 }) };
  }
  return { policy };
}

export async function POST(request, { params }) {
  const storageIssue = storageProblem();
  if (storageIssue) return Response.json({ error: storageIssue, setup: true }, { status: 503 });
  const supabase = await createClientSSR();
  const { id } = await params;
  const { error: loadError, policy } = await load(supabase, id);
  if (loadError) return loadError;

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, PNG, JPEG o WEBP' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 4 MB' }, { status: 413 });

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const key = `v2-orgs/${policy.organization_id}/polizas/${id}/certificado-${Date.now()}.${ext}`;

  const body = Buffer.from(await file.arrayBuffer());
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el documento' }, { status: 500 });

  const { data, error } = await supabase
    .from('insurance_policies')
    .update({ document_path: key, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, document_path')
    .single();
  if (error) {
    await storageRemove({ bucket: BUCKET, keys: [key] });
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Reemplazo: el certificado anterior queda huérfano, se limpia (mejor esfuerzo).
  if (policy.document_path) await storageRemove({ bucket: BUCKET, keys: [policy.document_path] });
  return Response.json({ policy: data });
}

export async function GET(request, { params }) {
  const supabase = await createClientSSR();
  const { id } = await params;
  const { error: loadError, policy } = await load(supabase, id);
  if (loadError) return loadError;
  if (!policy.document_path) return Response.json({ error: 'Esta póliza no tiene certificado cargado' }, { status: 404 });

  const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: policy.document_path, expiresIn: 3600 });
  if (error) return Response.json({ error: 'No se pudo generar el enlace del documento' }, { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}
