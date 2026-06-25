import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase
            .from('maintenance_logs')
            .select('id,aircraft_id,maintenance_type,description,hours_at_service,technician_name,created_at,attachment_path,return_checklist,return_doc_path,aircraft:aircraft_id(model,serial_number),components:maintenance_components(component_type,action,part_old,part_new,notes)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const res = NextResponse.json(data || []);
        res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
        return res;
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const today = new Date().toISOString().split('T')[0];

        // 1. Registrar el Mantenimiento (compatibilidad con columnas legadas)
        // Normalizar el checklist de recibo a un objeto compacto { field_number: bool }.
        // Solo se guardan claves numéricas con valor booleano (no se duplica el texto del ítem).
        let returnChecklist = null;
        if (body.return_checklist && typeof body.return_checklist === 'object') {
            const compact = {};
            for (const [k, v] of Object.entries(body.return_checklist)) {
                if (/^\d+$/.test(k) && typeof v === 'boolean') compact[k] = v;
            }
            if (Object.keys(compact).length > 0) returnChecklist = compact;
        }

        const { data: log, error: mErr } = await supabase.from('maintenance_logs').insert([{
            aircraft_id:      body.aircraft_id,
            maintenance_type: body.maintenance_type,
            description:      body.description,
            hours_at_service: body.hours_at_service,
            technician_name:  body.technician_name,
            organization_id:  orgId,
            attachment_path:  body.attachment_path || null,
            return_checklist: returnChecklist,
            return_doc_path:  body.return_doc_path || null,
        }]).select().single();

        if (mErr) throw mErr;

        // 2. REINICIAR CONTADORES EN EL DRONE (con filtro de org para evitar cross-tenant)
        await supabase.from('aircraft').update({
            last_maintenance_date: today,
            last_maintenance_hours: body.hours_at_service
        }).eq('id', body.aircraft_id).eq('organization_id', orgId);

        // 3. Trazabilidad de componentes (Fase B) — solo si llegan filas válidas
        const ACTIONS = ['instalado', 'removido', 'reemplazado'];
        if (Array.isArray(body.components) && body.components.length > 0) {
            const rows = body.components
                .filter(c => c && c.component_type && ACTIONS.includes(c.action))
                .map(c => ({
                    organization_id:    orgId,
                    maintenance_log_id: log.id,
                    aircraft_id:        body.aircraft_id,
                    component_type:     String(c.component_type).slice(0, 120),
                    action:             c.action,
                    part_old:           c.part_old ? String(c.part_old).slice(0, 200) : null,
                    part_new:           c.part_new ? String(c.part_new).slice(0, 200) : null,
                    notes:              c.notes ? String(c.notes).slice(0, 500) : null,
                }));
            if (rows.length > 0) {
                const { error: cErr } = await supabase.from('maintenance_components').insert(rows);
                if (cErr) console.error('[maintenance] components insert error:', cErr.message);
            }
        }

        return NextResponse.json(log);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
