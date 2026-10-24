// Skylog V2.0 — adjuntar/descargar UN documento (PDF o imagen) a una fila. Es la tercera vez que se repite el
// patrón de pólizas y propiedad de aeronave, así que se extrae aquí: bucket PRIVADO `documents` bajo
// `v2-orgs/{org}/…`, la ruta se guarda en la propia fila, la descarga redirige a una URL firmada de 1 h tras
// validar membresía y nunca se expone el path. Las rutas existentes (pólizas, propiedad) no se tocaron.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { storageProblem } from '@/lib/v2/adminKey';
import { storagePut, storageSignedUrl, storageRemove } from '@/lib/storage';
import { getAuthUser } from '@/lib/v2/authUser';

const BUCKET = 'documents';
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024; // el cuerpo de una función de Vercel se corta en ~4,5 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

/**
 * Crea { POST, GET, DELETE } para una tabla.
 *  - table / orgColumn: tabla con la columna de organización (por defecto organization_id).
 *  - resolve(request, row): { pathColumn, folder, label } — qué columna y carpeta usar (p. ej. según ?kind=).
 *  - canWrite / canRead: (memberships, organizationId, target) => boolean (`target` = lo que devolvió resolve).
 *  - rowLabel: texto para mensajes ("la designación").
 *  - adminWrites: la tabla no tiene política de UPDATE para el usuario (p. ej. mantenimiento, inmutable): tras validar sesión,
 *    rol y organización con el cliente del usuario, solo la columna del documento se escribe con la llave de servicio.
 */
export function makeRowDocumentRoute({ table, resolve, canWrite, canRead, rowLabel = 'el registro', select = '*', adminWrites = false }) {
  async function load(supabase, id, request, needWrite) {
    const user = await getAuthUser(supabase);
    if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };

    const target = resolve(request);
    if (!target) return { error: Response.json({ error: 'Tipo de documento inválido' }, { status: 400 }) };

    const { data: row, error: fetchError } = await supabase.from(table).select(`organization_id, ${target.pathColumn}`).eq('id', id).maybeSingle();
    if (fetchError) return { error: Response.json({ error: `Error consultando ${rowLabel}` }, { status: 500 }) };
    if (!row) return { error: Response.json({ error: 'No encontrado' }, { status: 404 }) };

    const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
    if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
    const allowed = needWrite ? canWrite(memberships, row.organization_id, target) : canRead(memberships, row.organization_id, target);
    if (!allowed) return { error: Response.json({ error: needWrite ? 'No tienes permiso para adjuntar este documento' : 'No tienes permiso para ver este documento' }, { status: 403 }) };
    return { row, target };
  }

  async function POST(request, { params }) {
    params = await params;
    const storageIssue = storageProblem();
    if (storageIssue) return Response.json({ error: storageIssue, setup: true }, { status: 503 });
    const supabase = await createClientSSR();
    const { id } = await params;
    const loaded = await load(supabase, id, request, true);
    if (loaded.error) return loaded.error;
    const { row, target } = loaded;

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, PNG, JPEG o WEBP' }, { status: 400 });
    if (file.size > DOCUMENT_MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 4 MB' }, { status: 413 });

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
    const key = `v2-orgs/${row.organization_id}/${target.folder}/${id}/${target.label}-${Date.now()}.${ext}`;
    const { error: putError } = await storagePut({ bucket: BUCKET, key, body: Buffer.from(await file.arrayBuffer()), contentType: file.type });
    if (putError) return Response.json({ error: 'No se pudo subir el documento' }, { status: 500 });

    const writer = adminWrites ? createAdminClient() : supabase;
    const { data, error } = await writer.from(table).update({ [target.pathColumn]: key }).eq('organization_id', row.organization_id).eq('id', id).select(`id, ${target.pathColumn}`).single();
    if (error) {
      await storageRemove({ bucket: BUCKET, keys: [key] });
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (row[target.pathColumn]) await storageRemove({ bucket: BUCKET, keys: [row[target.pathColumn]] }); // el anterior queda huérfano
    return Response.json({ row: data });
  }

  async function GET(request, { params }) {
    params = await params;
    const supabase = await createClientSSR();
    const { id } = await params;
    const loaded = await load(supabase, id, request, false);
    if (loaded.error) return loaded.error;
    const path = loaded.row[loaded.target.pathColumn];
    if (!path) return Response.json({ error: 'No hay documento cargado' }, { status: 404 });
    const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: path, expiresIn: 3600 });
    if (error) return Response.json({ error: 'No se pudo generar el enlace del documento' }, { status: 500 });
    return Response.redirect(data.signedUrl, 302);
  }

  async function DELETE(request, { params }) {
    params = await params;
    const supabase = await createClientSSR();
    const { id } = await params;
    const loaded = await load(supabase, id, request, true);
    if (loaded.error) return loaded.error;
    const path = loaded.row[loaded.target.pathColumn];
    if (!path) return Response.json({ ok: true });
    const writer = adminWrites ? createAdminClient() : supabase;
    const { error } = await writer.from(table).update({ [loaded.target.pathColumn]: null }).eq('id', id).eq('organization_id', loaded.row.organization_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await storageRemove({ bucket: BUCKET, keys: [path] });
    return Response.json({ ok: true });
  }

  return { POST, GET, DELETE };
}
