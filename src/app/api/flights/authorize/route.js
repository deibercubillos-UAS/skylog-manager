import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await request.json();

        // 1. Generar ID de Misión Único
        const countRes = await supabase.from('flight_authorizations').select('id', { count: 'exact', head: true });
        const missionId = `AUTH-${(countRes.count + 1).toString().padStart(3, '0')}`;

        // 2. Guardar en Base de Datos
        const { data: auth, error } = await supabase.from('flight_authorizations').insert([{
            owner_id: user.id,
            pilot_id: body.pilot_id,
            aircraft_id: body.aircraft_id,
            location: body.location,
            scheduled_at: body.scheduled_at,
            mission_id: missionId
        }]).select('*, pilots(name, email), aircraft(model)').single();

        if (error) throw error;

        // 3. Enviar Email al Piloto
        await resend.emails.send({
            from: 'BitaFly OPS <ops@bitafly.com>',
            to: [auth.pilots.email],
            subject: `🚁 Misión Autorizada: ${missionId}`,
            html: `
                <div style="font-family: sans-serif; color: #1A202C;">
                    <h2 style="color: #ec5b13;">ORDEN DE VUELO AUTORIZADA</h2>
                    <p>Estimado piloto <b>${auth.pilots.name}</b>,</p>
                    <p>Se ha generado una nueva autorización para su operación:</p>
                    <ul>
                        <li><b>ID Misión:</b> ${missionId}</li>
                        <li><b>Equipo:</b> ${auth.aircraft.model}</li>
                        <li><b>Lugar:</b> ${auth.location}</li>
                        <li><b>Fecha/Hora:</b> ${new Date(auth.scheduled_at).toLocaleString()}</li>
                    </ul>
                    <p>Por favor, proceda al dashboard para completar el <b>Inventario de Misión</b> antes de salir a campo.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true, missionId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}