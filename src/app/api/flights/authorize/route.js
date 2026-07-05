import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { createNotifications } from '@/lib/notify';
import { logAudit } from '@/lib/auditLog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json([], { status: 401 });

        const { data, error } = await supabase
            .from('flight_authorizations')
            .select(`
                id,mission_id,scheduled_at,location,mission_type,status,created_at,plan_data,
                pilot_id,aircraft_id,organization_id,line_of_sight,aerocivil_auth_number,sora_assessment_id,
                pilots:pilot_id(name, phone, id_number, email),
                aircraft:aircraft_id(model, serial_number, total_hours, minor_maintenance_due),
                payload:payload_id(brand, model, category, serial_number),
                observer:observer_id(name),
                sora_assessment:sora_assessment_id(operation_name, sail_level)
            `)
            .eq('organization_id', orgId)
            .neq('status', 'realizado')
            .neq('status', 'cancelado')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json([], { status: 500 }); }
}

// Campos que el cliente NO puede controlar en una autorización de vuelo
const BLOCKED_AUTHORIZATION_FIELDS = [
  'id', 'organization_id', 'mission_id', 'scheduled_by',
  'status', 'created_at', 'updated_at',
];

// Campos RAC 100 mínimos requeridos para una solicitud de autorización
// (line_of_sight se agregó para el reporte mensual AeroCivil; sora_assessment_id porque el
// análisis SORA es obligatorio al programar cualquier vuelo — ver CLAUDE.md)
const REQUIRED_AUTHORIZATION_FIELDS = ['pilot_id', 'aircraft_id', 'location', 'scheduled_at', 'mission_type', 'line_of_sight', 'sora_assessment_id'];

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, fullName } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();

        // Validar campos obligatorios RAC 100
        const missing = REQUIRED_AUTHORIZATION_FIELDS.filter(f => !body[f]);
        if (missing.length > 0) {
            return NextResponse.json(
                { error: `Campos RAC 100 obligatorios faltantes: ${missing.join(', ')}` },
                { status: 400 }
            );
        }

        // Sanitizar: remover campos controlados por el servidor
        const safeBody = Object.fromEntries(
            Object.entries(body).filter(([key]) => !BLOCKED_AUTHORIZATION_FIELDS.includes(key))
        );

        // Nunca confiar en el sora_assessment_id que manda el cliente: verificar que exista
        // y pertenezca a la misma organización antes de enlazarlo a la misión.
        const { data: soraCheck } = await supabase
            .from('sora_assessments')
            .select('id')
            .eq('id', safeBody.sora_assessment_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!soraCheck) {
            return NextResponse.json({ error: 'La evaluación SORA seleccionada no es válida.' }, { status: 400 });
        }

        // Prefijo de la organización + próximo número de misión en paralelo
        const [orgRes, lastRes] = await Promise.all([
            supabase.from('organizations').select('flight_prefix').eq('id', orgId).single(),
            supabase.from('flight_authorizations')
                .select('mission_id')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        const prefix = orgRes.data?.flight_prefix || 'BIT';

        let nextNumber = 1;
        if (lastRes.data?.mission_id) {
            const parts = lastRes.data.mission_id.split('-');
            const lastNumber = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }

        // Sufijo aleatorio corto para minimizar colisiones en inserciones concurrentes
        const salt = Math.random().toString(36).substring(2, 5).toUpperCase();
        const missionId = `${prefix}-${nextNumber.toString().padStart(3, '0')}-${salt}`;

        // Conflicto de agenda (no bloqueante): ¿el PIC ya tiene misión el mismo día?
        // Granularidad por día calendario — scheduled_at guarda solo la fecha (la hora
        // de despegue vive en plan_data.takeoff_time). Se informa en la respuesta pero
        // NO impide crear la misión.
        let conflictWarning = null;
        try {
            if (safeBody.pilot_id && safeBody.scheduled_at) {
                const day = String(safeBody.scheduled_at).slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
                    const { data: clash } = await supabase
                        .from('flight_authorizations')
                        .select('mission_id, scheduled_at')
                        .eq('organization_id', orgId)
                        .eq('pilot_id', safeBody.pilot_id)
                        .neq('status', 'cancelado')
                        .neq('status', 'realizado')
                        .gte('scheduled_at', `${day}T00:00:00`)
                        .lte('scheduled_at', `${day}T23:59:59.999`)
                        .limit(1);
                    if (clash?.length) {
                        conflictWarning = `El piloto ya tiene una misión (${clash[0].mission_id}) programada ese día.`;
                    }
                }
            }
        } catch { /* el aviso es best-effort, nunca bloquea la creación */ }

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            ...safeBody,
            mission_id:      missionId,
            organization_id: orgId,
            scheduled_by:    user.id,
            status:          'autorizado',
        }]).select();

        if (error) throw error;

        // ── Notificar: Jefe de Pilotos + GG (Programación Activa) y el PIC piloto (Mis Vuelos)
        try {
            const inserted = data[0];
            const when = inserted.scheduled_at ? String(inserted.scheduled_at).slice(0, 10) : null;
            const detail = [inserted.location, when].filter(Boolean).join(' · ') || 'Nueva misión programada';
            const meta = { authorization_id: inserted.id, mission_id: missionId };

            await createNotifications({
                orgId, roles: ['admin', 'jefe_pilotos'], type: 'flight_scheduled',
                title: `Vuelo programado · ${missionId}`, body: detail,
                link: '/dashboard/programacion-activa', actorId: user.id, metadata: meta,
            });

            // El PIC, si es rol piloto, ve sus misiones en "Mis Vuelos"
            if (inserted.pilot_id) {
                const { data: pr } = await supabase
                    .from('pilots').select('profile_id, profiles:profile_id(role)')
                    .eq('id', inserted.pilot_id).maybeSingle();
                if (pr?.profile_id && pr?.profiles?.role === 'piloto') {
                    await createNotifications({
                        orgId, profileIds: [pr.profile_id], type: 'flight_scheduled',
                        title: `Tienes un vuelo asignado · ${missionId}`, body: detail,
                        link: '/dashboard/mis-vuelos', actorId: user.id, metadata: meta,
                    });
                }
            }
        } catch (e) { console.warn('[authorize] notif:', e.message); }

        logAudit({
            orgId, actorId: user.id, actorName: fullName || user.email, action: 'create', module: 'flights',
            entityLabel: `Misión ${missionId}`, metadata: { authorization_id: data[0].id },
        });

        return NextResponse.json({ ...data[0], conflictWarning });
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

// --- MÉTODO NUEVO PARA EDITAR ---
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();
        const { id, pilot_id, aircraft_id, location, scheduled_at, mission_type, line_of_sight, aerocivil_auth_number, sora_assessment_id } = body;

        // Verificamos que la autorización pertenezca a la organización del usuario
        const { data: existing } = await supabase
            .from('flight_authorizations')
            .select('organization_id')
            .eq('id', id)
            .single();

        if (!existing || existing.organization_id !== orgId) {
            return NextResponse.json({ error: "No autorizado para editar esta misión" }, { status: 403 });
        }

        // Nunca confiar en el sora_assessment_id que manda el cliente al reasignarlo
        if (sora_assessment_id !== undefined && sora_assessment_id !== null) {
            const { data: soraCheck } = await supabase
                .from('sora_assessments')
                .select('id')
                .eq('id', sora_assessment_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!soraCheck) {
                return NextResponse.json({ error: 'La evaluación SORA seleccionada no es válida.' }, { status: 400 });
            }
        }

        // Campos parciales — solo se tocan los que vienen en el body (permite editar
        // únicamente el N° de autorización AeroCivil desde Programación Activa sin
        // reenviar pilot_id/aircraft_id/etc.)
        const updates = { updated_at: new Date().toISOString() };
        if (pilot_id !== undefined) updates.pilot_id = pilot_id;
        if (aircraft_id !== undefined) updates.aircraft_id = aircraft_id;
        if (location !== undefined) updates.location = location;
        if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at;
        if (mission_type !== undefined) updates.mission_type = mission_type;
        if (line_of_sight !== undefined) updates.line_of_sight = line_of_sight || null;
        if (aerocivil_auth_number !== undefined) updates.aerocivil_auth_number = aerocivil_auth_number?.trim() || null;
        if (sora_assessment_id !== undefined) updates.sora_assessment_id = sora_assessment_id || null;

        const { data, error } = await supabase
            .from('flight_authorizations')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}