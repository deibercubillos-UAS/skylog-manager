import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = prof?.organization_id;

        const [drones, crew, flights] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*').eq('organization_id', orgId).is('landing_time', null)
        ]);

        const today = new Date();

        // AUDITORÍA DE FLOTA
        const fleetAudit = drones.data?.map(d => {
            const hoursUsed = parseFloat(d.total_hours || 0) - parseFloat(d.last_maintenance_hours || 0);
            const lastM = d.last_maintenance_date ? new Date(d.last_maintenance_date) : new Date(d.created_at);
            const daysUsed = Math.ceil(Math.abs(today - lastM) / (1000 * 60 * 60 * 24));
            
            return {
                id: d.id,
                model: d.model,
                sn: d.serial_number,
                isReady: hoursUsed < 200 && daysUsed < 182,
                reason: hoursUsed >= 200 ? 'Límite de 200h alcanzado' : daysUsed >= 182 ? 'Límite de 6 meses vencido' : 'Operativo',
                docs: !!d.image_url && !!d.ruas
            };
        });

        // AUDITORÍA DE TRIPULACIÓN
        const crewAudit = crew.data?.map(p => {
            const medical = p.medical_expiry ? new Date(p.medical_expiry) : null;
            return {
                id: p.id,
                name: p.name,
                isReady: medical && medical > today,
                reason: !medical ? 'Sin examen médico' : medical <= today ? 'Examen Vencido' : 'Vigente',
                docs: !!p.id_doc_url && !!p.medical_cert_url
            };
        });

        return NextResponse.json({
            fleet: fleetAudit || [],
            crew: crewAudit || [],
            activeOperations: flights.data?.length || 0,
            score: calculateScore(fleetAudit, crewAudit)
        });
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

function calculateScore(f, c) {
    if (!f || !c) return 0;
    const total = f.length + c.length;
    const ready = f.filter(x => x.isReady).length + c.filter(x => x.isReady).length;
    return total > 0 ? Math.round((ready / total) * 100) : 100;
}