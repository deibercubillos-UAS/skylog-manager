import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { uploadManualFile } from '@/lib/manualStorage';
import { notifyManualChange } from '@/lib/manualNotify';

export const dynamic = 'force-dynamic';

// POST /api/manuals/[id]/versions — publica una nueva versión del manual (managers)
// Body: multipart/form-data { version, effective_date, comments, file }
export async function POST(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canManageManuals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar manuales.' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Verificar que el manual pertenece a la org
    const { data: manual } = await admin
      .from('company_manuals')
      .select('id, title, category')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!manual) return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });

    const form = await request.formData();
    const version        = String(form.get('version') || '').trim();
    const effective_date = String(form.get('effective_date') || '').trim();
    const comments       = String(form.get('comments') || '').trim();
    const file           = form.get('file');

    if (!version)        return NextResponse.json({ error: 'La versión es obligatoria.' }, { status: 400 });
    if (!effective_date) return NextResponse.json({ error: 'La fecha de vigencia es obligatoria.' }, { status: 400 });

    // Subir el archivo de la nueva versión
    const up = await uploadManualFile({ admin, orgId, manualId: manual.id, file });
    if (up.error) return NextResponse.json({ error: up.error }, { status: up.status || 500 });

    // Registrar la versión
    const { data: ver, error: vErr } = await admin
      .from('manual_versions')
      .insert([{
        manual_id:       manual.id,
        organization_id: orgId,
        version:         version.slice(0, 50),
        effective_date,
        file_path:       up.path,
        comments:        comments ? comments.slice(0, 2000) : null,
        uploaded_by:     user.id,
      }])
      .select()
      .single();
    if (vErr) throw vErr;

    // Marcar como versión vigente
    const { data: updated, error: uErr } = await admin
      .from('company_manuals')
      .update({
        current_version:        ver.version,
        current_effective_date: ver.effective_date,
        current_file_path:      ver.file_path,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', manual.id)
      .eq('organization_id', orgId)
      .select()
      .single();
    if (uErr) throw uErr;

    // Notificar a toda la empresa
    try { await notifyManualChange({ orgId, manual: updated, version: ver, actorId: user.id, action: 'updated' }); }
    catch (e) { console.warn('[manuals/versions] notificación no enviada:', e.message); }

    return NextResponse.json({ manual: updated, version: ver }, { status: 201 });
  } catch (err) {
    console.error('[manuals/[id]/versions POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
