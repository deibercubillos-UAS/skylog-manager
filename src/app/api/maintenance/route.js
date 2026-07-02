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
            .select('id,aircraft_id,maintenance_type,description,hours_at_service,technician_name,maintenance_date,created_at,attachment_path,return_checklist,return_doc_path,aircraft:aircraft_id(model,serial_number,maintenance_interval_hours,maintenance_interval_days,last_maintenance_date,next_maintenance_date,total_hours,operational_status,created_at),components:maintenance_components(component_type,action,part_old,part_new,notes)')
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
            maintenance_date: body.maintenance_date || today,
            organization_id:  orgId,
            attachment_path:  body.attachment_path || null,
            return_checklist: returnChecklist,
            return_doc_path:  body.return_doc_path || null,
        }]).select().single();

        if (mErr) throw mErr;

        // 2. REINICIAR CONTADORES EN EL DRONE (con filtro de org para evitar cross-tenant)
        const aircraftUpdate = {
            last_maintenance_date: today,
            last_maintenance_hours: body.hours_at_service
        };
        if (['disponible', 'en_mantenimiento'].includes(body.operational_status)) {
            aircraftUpdate.operational_status = body.operational_status;
            aircraftUpdate.last_status_change = new Date().toISOString();
        }
        if (body.next_maintenance_date) {
            aircraftUpdate.next_maintenance_date = body.next_maintenance_date;
        }
        await supabase.from('aircraft').update(aircraftUpdate)
            .eq('id', body.aircraft_id).eq('organization_id', orgId);

        // 3. Trazabilidad + vida útil de componentes
        //    Cada cambio: registra el evento (maintenance_components) y actualiza el
        //    roster vivo (aircraft_components) para que el contador de horas/días
        //    se reinicie SOLO en el componente afectado.
        if (Array.isArray(body.components) && body.components.length > 0) {
            // Odómetro actual de la aeronave (base del conteo por componente)
            const { data: air } = await supabase
                .from('aircraft')
                .select('total_hours')
                .eq('id', body.aircraft_id)
                .eq('organization_id', orgId)
                .single();
            const odo = parseFloat(air?.total_hours || 0);
            const nowIso = new Date().toISOString();

            const clip = (v, n) => (v ? String(v).slice(0, n) : null);

            for (const c of body.components) {
                if (!c) continue;

                // ── Cambio sobre un componente existente del roster ──────────
                if (c.roster_id && (c.action === 'reemplazado' || c.action === 'removido')) {
                    const { data: existing } = await supabase
                        .from('aircraft_components')
                        .select('id,component_type,name,serial')
                        .eq('id', c.roster_id)
                        .eq('organization_id', orgId)
                        .eq('aircraft_id', body.aircraft_id)
                        .eq('status', 'activo')
                        .single();
                    if (!existing) continue;

                    // Retirar el componente saliente (congela sus horas)
                    await supabase.from('aircraft_components')
                        .update({ status: 'retirado', retired_at: nowIso, retired_at_aircraft_hours: odo })
                        .eq('id', existing.id).eq('organization_id', orgId);

                    // Evento de trazabilidad
                    await supabase.from('maintenance_components').insert([{
                        organization_id:    orgId,
                        maintenance_log_id: log.id,
                        aircraft_id:        body.aircraft_id,
                        component_type:     existing.component_type,
                        action:             c.action,
                        part_old:           existing.serial || null,
                        part_new:           c.action === 'reemplazado' ? clip(c.part_new, 200) : null,
                        notes:              clip(c.notes, 500),
                    }]);

                    // Reemplazo → nueva instancia activa, contador en cero (desde el odómetro actual)
                    if (c.action === 'reemplazado') {
                        await supabase.from('aircraft_components').insert([{
                            organization_id:             orgId,
                            aircraft_id:                 body.aircraft_id,
                            component_type:              existing.component_type,
                            name:                        existing.name || null,
                            serial:                      clip(c.part_new, 200),
                            installed_at:                nowIso,
                            installed_at_aircraft_hours: odo,
                            maintenance_log_id:          log.id,
                        }]);
                    }
                    continue;
                }

                // ── Instalación de un componente nuevo ───────────────────────
                if (c.action === 'instalado' && c.component_type) {
                    await supabase.from('aircraft_components').insert([{
                        organization_id:             orgId,
                        aircraft_id:                 body.aircraft_id,
                        component_type:              clip(c.component_type, 120),
                        name:                        clip(c.name, 120),
                        serial:                      clip(c.serial, 200),
                        installed_at:                nowIso,
                        installed_at_aircraft_hours: odo,
                        maintenance_log_id:          log.id,
                    }]);
                    await supabase.from('maintenance_components').insert([{
                        organization_id:    orgId,
                        maintenance_log_id: log.id,
                        aircraft_id:        body.aircraft_id,
                        component_type:     clip(c.component_type, 120),
                        action:             'instalado',
                        part_new:           clip(c.serial, 200),
                        notes:              clip(c.notes, 500),
                    }]);
                }
            }
        }

        return NextResponse.json(log);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
