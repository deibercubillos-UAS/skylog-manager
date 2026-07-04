import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SOURCES = ['manual', 'gap', 'spi', 'vormor'];
const STATUSES = ['abierto', 'mitigado', 'cerrado'];
const PROB_CODES = ['1', '2', '3', '4', '5'];
const SEV_CODES = ['A', 'B', 'C', 'D', 'E'];

// GET /api/safety/hazards — lista el registro de peligros de la org
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data, error } = await supabase
            .from('safety_hazards')
            .select('*')
            .eq('organization_id', orgId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/safety/hazards — registra un peligro nuevo
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.description?.trim()) return NextResponse.json({ error: 'La descripción del peligro es obligatoria' }, { status: 400 });
        if (!PROB_CODES.includes(body.initial_probability_code) || !SEV_CODES.includes(body.initial_severity_code)) {
            return NextResponse.json({ error: 'Probabilidad/gravedad inicial inválida' }, { status: 400 });
        }
        if (body.residual_probability_code && !PROB_CODES.includes(body.residual_probability_code)) {
            return NextResponse.json({ error: 'Probabilidad residual inválida' }, { status: 400 });
        }
        if (body.residual_severity_code && !SEV_CODES.includes(body.residual_severity_code)) {
            return NextResponse.json({ error: 'Gravedad residual inválida' }, { status: 400 });
        }
        const source = SOURCES.includes(body.source) ? body.source : 'manual';
        const status = STATUSES.includes(body.status) ? body.status : 'abierto';

        const { data, error } = await supabase
            .from('safety_hazards')
            .insert([{
                organization_id: orgId,
                description: body.description.trim(),
                source,
                source_ref_id: body.source_ref_id || null,
                initial_probability_code: body.initial_probability_code,
                initial_severity_code: body.initial_severity_code,
                mitigation: body.mitigation?.trim() || null,
                residual_probability_code: body.residual_probability_code || null,
                residual_severity_code: body.residual_severity_code || null,
                responsible: body.responsible?.trim() || null,
                due_date: body.due_date || null,
                status,
                created_by: user.id,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
