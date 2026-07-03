/**
 * GET  /api/vor-mor          → listar submissions de la org (paginado, filtrable)
 * POST /api/vor-mor          → crear/actualizar definición de formulario (VOR o MOR)
 */
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';

// ─────────────────────────────────────────────────────────────────────────────
//  GET: listar reportes de la org
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
    try {
        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const type   = searchParams.get('type');     // 'VOR' | 'MOR' | null
        const status = searchParams.get('status');   // 'recibido' | etc
        const page   = parseInt(searchParams.get('page') || '1');
        const limit  = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('vor_mor_submissions')
            .select(`
                id, type, status, severity, is_anonymous,
                reporter_name, occurrence_date, occurrence_time,
                location, description, immediate_actions,
                contributing_factors, attachments, custom_responses,
                assigned_to, internal_notes, investigation_summary,
                aerocivil_notified_at, created_at, updated_at,
                assigned_profile:profiles!vor_mor_submissions_assigned_to_fkey(first_name, last_name)
            `, { count: 'exact' })
            .eq('organization_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type)   query = query.eq('type', type);
        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;
        if (error) throw error;

        // Ocultar reporter_email si is_anonymous (solo visibles para superadmin)
        const canSeeEmail = ctx.role === 'superadmin';
        const sanitized = data.map(r => ({
            ...r,
            // reporter_email no se selecciona aquí para evitar exponerlo accidentalmente
            // se obtiene solo en el endpoint [id] con verificación explícita
        }));

        return NextResponse.json({ data: sanitized, total: count, page, limit });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST: crear o actualizar definición VOR/MOR para la org
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Solo admin, gerente_sms y superadmin pueden configurar formularios
        if (!PERMISSIONS.canManageSMS.includes(ctx.role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const { type, title, description, custom_fields, is_active } = body;

        if (!['VOR', 'MOR'].includes(type)) {
            return NextResponse.json({ error: 'type debe ser VOR o MOR' }, { status: 400 });
        }
        if (!title?.trim()) {
            return NextResponse.json({ error: 'El título del formulario es obligatorio' }, { status: 400 });
        }

        // Upsert: si ya existe definición para esta org+type, actualizar
        const { data, error } = await supabase
            .from('vor_mor_definitions')
            .upsert({
                organization_id: ctx.orgId,
                type,
                title: title.trim(),
                description: description?.trim() || null,
                custom_fields: custom_fields || [],
                is_active: is_active !== false,
            }, { onConflict: 'organization_id,type' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, definition: data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
