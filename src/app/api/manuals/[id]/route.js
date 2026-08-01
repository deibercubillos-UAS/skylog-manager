import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { MANUALS_BUCKET } from '@/lib/manualStorage';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['MO', 'SMS', 'MANTENIMIENTO', 'ORGANIZACION', 'SOP', 'OTRO'];

// GET /api/manuals/[id] — detalle del manual + historial de versiones (todos los miembros)
export async function GET(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canViewManuals')) {
      return NextResponse.json({ error: 'Sin permiso para ver manuales.' }, { status: 403 });
    }

    // Ambas consultas filtran directo por params.id/orgId — ninguna depende
    // del resultado de la otra, se corren en paralelo.
    const [{ data: manual, error: mErr }, { data: versions, error: vErr }] = await Promise.all([
      supabase
        .from('company_manuals')
        .select('id,title,category,current_version,current_effective_date,current_file_path,status,created_at,updated_at')
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .maybeSingle(),
      supabase
        .from('manual_versions')
        .select('id,version,effective_date,file_path,comments,uploaded_by,created_at')
        .eq('manual_id', params.id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false }),
    ]);
    if (mErr) throw mErr;
    if (!manual) return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });
    if (vErr) throw vErr;

    return NextResponse.json({ ...manual, versions: versions || [] });
  } catch (err) {
    console.error('[manuals/[id] GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/manuals/[id] — edita metadata del manual (título/categoría/estado) — managers
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canManageManuals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar manuales.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const patch = {};
    if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 200);
    if (typeof body.category === 'string') {
      const cat = body.category.trim().toUpperCase();
      if (VALID_CATEGORIES.includes(cat)) patch.category = cat;
    }
    if (body.status === 'active' || body.status === 'archived') patch.status = body.status;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('company_manuals')
      .update(patch)
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[manuals/[id] PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/manuals/[id] — elimina el manual, sus versiones y archivos — managers
export async function DELETE(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canManageManuals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar manuales.' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Verificar pertenencia + recolectar paths de todas las versiones.
    // Ambas consultas filtran directo por params.id/orgId — independientes,
    // se corren en paralelo (igual que en el GET de arriba).
    const [{ data: manual }, { data: versions }] = await Promise.all([
      admin
        .from('company_manuals')
        .select('id')
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .maybeSingle(),
      admin
        .from('manual_versions')
        .select('file_path')
        .eq('manual_id', params.id)
        .eq('organization_id', orgId),
    ]);
    if (!manual) return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });

    const paths = (versions || []).map(v => v.file_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from(MANUALS_BUCKET).remove(paths);
    }

    // Borrar el manual (manual_versions cae por ON DELETE CASCADE)
    const { error } = await admin
      .from('company_manuals')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', orgId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[manuals/[id] DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
