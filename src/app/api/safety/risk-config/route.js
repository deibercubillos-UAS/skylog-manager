import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DIMENSIONS = ['probabilidad', 'gravedad'];
const ZONES = ['inaceptable', 'tolerable', 'aceptable'];
const PROB_CODES = ['1', '2', '3', '4', '5'];
const SEV_CODES = ['A', 'B', 'C', 'D', 'E'];

// GET /api/safety/risk-config — escalas de probabilidad/gravedad + matriz de
// tolerabilidad de la org. Arrays vacíos si todavía no se ha configurado
// (el cliente ofrece "Cargar matriz estándar OACI" en ese caso).
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const [{ data: scales, error: sErr }, { data: tolerability, error: tErr }] = await Promise.all([
            supabase.from('safety_risk_scales').select('*').eq('organization_id', orgId).order('order_index', { ascending: false }),
            supabase.from('safety_risk_tolerability').select('*').eq('organization_id', orgId),
        ]);
        if (sErr) throw sErr;
        if (tErr) throw tErr;

        return NextResponse.json({
            probability: (scales || []).filter(s => s.dimension === 'probabilidad'),
            severity:    (scales || []).filter(s => s.dimension === 'gravedad'),
            tolerability: tolerability || [],
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/safety/risk-config — guarda la matriz completa (escalas +
// tolerabilidad) de una sola vez, igual sea la primera carga de la semilla
// OACI o una edición posterior — un solo mecanismo de guardado.
// Body: { scales: [{dimension, code, order_index, label, description}], tolerability: [{probability_code, severity_code, zone}] }
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const scales = Array.isArray(body.scales) ? body.scales : [];
        const tolerability = Array.isArray(body.tolerability) ? body.tolerability : [];

        for (const s of scales) {
            if (!DIMENSIONS.includes(s.dimension)) return NextResponse.json({ error: 'Dimensión inválida' }, { status: 400 });
            if (!s.code || !s.label?.trim()) return NextResponse.json({ error: 'Código y etiqueta son obligatorios' }, { status: 400 });
        }
        for (const t of tolerability) {
            if (!PROB_CODES.includes(t.probability_code) || !SEV_CODES.includes(t.severity_code)) {
                return NextResponse.json({ error: 'Celda de tolerabilidad inválida' }, { status: 400 });
            }
            if (!ZONES.includes(t.zone)) return NextResponse.json({ error: 'Zona de tolerabilidad inválida' }, { status: 400 });
        }

        if (scales.length) {
            const rows = scales.map(s => ({
                organization_id: orgId,
                dimension: s.dimension,
                code: s.code,
                order_index: s.order_index,
                label: s.label.trim(),
                description: s.description?.trim() || null,
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
                .from('safety_risk_scales')
                .upsert(rows, { onConflict: 'organization_id,dimension,code' });
            if (error) throw error;
        }

        if (tolerability.length) {
            const rows = tolerability.map(t => ({
                organization_id: orgId,
                probability_code: t.probability_code,
                severity_code: t.severity_code,
                zone: t.zone,
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
                .from('safety_risk_tolerability')
                .upsert(rows, { onConflict: 'organization_id,probability_code,severity_code' });
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
