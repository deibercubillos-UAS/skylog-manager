import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { uploadManualFile } from '@/lib/manualStorage';
import { notifyManualChange } from '@/lib/manualNotify';
import { createNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['MO', 'SMS', 'MANTENIMIENTO', 'ORGANIZACION', 'SOP', 'OTRO'];

// GET /api/manuals — lista los manuales de la organización (todos los miembros)
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canViewManuals')) {
      return NextResponse.json({ error: 'Sin permiso para ver manuales.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('company_manuals')
      .select('id,title,category,current_version,current_effective_date,current_file_path,current_version_id,status,created_at,updated_at')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (error) throw error;

    // Estado de acuse del usuario actual sobre la versión vigente de cada manual
    const { data: myAcks } = await supabase
      .from('manual_acknowledgments')
      .select('version_id')
      .eq('organization_id', orgId)
      .eq('profile_id', user.id);
    const ackedVersions = new Set((myAcks || []).map(a => a.version_id));

    const withAck = (data || []).map(m => ({
      ...m,
      acknowledged: !!m.current_version_id && ackedVersions.has(m.current_version_id),
    }));
    return NextResponse.json(withAck);
  } catch (err) {
    console.error('[manuals GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/manuals — crea un manual con su primera versión (managers: GG/GSMS/JP)
// Body: multipart/form-data { title, category, version, effective_date, comments, file }
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canManageManuals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar manuales.' }, { status: 403 });
    }

    const form = await request.formData();
    const title          = String(form.get('title') || '').trim();
    const category       = String(form.get('category') || 'OTRO').trim().toUpperCase();
    const version        = String(form.get('version') || '').trim();
    const effective_date = String(form.get('effective_date') || '').trim();
    const comments       = String(form.get('comments') || '').trim();
    const file           = form.get('file');

    if (!title)          return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });
    if (!version)        return NextResponse.json({ error: 'La versión es obligatoria.' }, { status: 400 });
    if (!effective_date) return NextResponse.json({ error: 'La fecha de vigencia es obligatoria.' }, { status: 400 });
    const cat = VALID_CATEGORIES.includes(category) ? category : 'OTRO';

    const admin = createAdminClient();

    // 1. Crear la fila del manual (sin archivo aún) para obtener su id
    const { data: manual, error: mErr } = await admin
      .from('company_manuals')
      .insert([{
        organization_id: orgId,
        title:           title.slice(0, 200),
        category:        cat,
        status:          'active',
        created_by:      user.id,
      }])
      .select()
      .single();
    if (mErr) throw mErr;

    // 2. Subir el archivo
    const up = await uploadManualFile({ admin, orgId, manualId: manual.id, file });
    if (up.error) {
      // Rollback: eliminar la fila huérfana del manual
      await admin.from('company_manuals').delete().eq('id', manual.id);
      return NextResponse.json({ error: up.error }, { status: up.status || 500 });
    }

    // 3. Registrar la primera versión
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

    // 4. Marcar como versión vigente
    const { data: updated, error: uErr } = await admin
      .from('company_manuals')
      .update({
        current_version:        ver.version,
        current_effective_date: ver.effective_date,
        current_file_path:      ver.file_path,
        current_version_id:     ver.id,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', manual.id)
      .select()
      .single();
    if (uErr) throw uErr;

    // 5. Notificar a toda la empresa (correo + campana in-app, fire-and-forget)
    try { await notifyManualChange({ orgId, manual: updated, version: ver, actorId: user.id, action: 'created' }); }
    catch (e) { console.warn('[manuals] notificación no enviada:', e.message); }
    try {
      await createNotifications({
        orgId,
        roles: ['admin', 'gerente_sms', 'jefe_pilotos', 'piloto'],
        type: 'manual_published',
        title: `Manual cargado · ${updated.title}`,
        body: `Versión ${ver.version} vigente desde ${ver.effective_date}.`,
        link: '/dashboard/manuales',
        actorId: user.id,
        metadata: { manual_id: updated.id, version_id: ver.id },
      });
    } catch (e) { console.warn('[manuals] notif in-app:', e.message); }

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('[manuals POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
