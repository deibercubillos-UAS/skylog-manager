import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Solo inicializamos Resend si la Key existe para evitar crash
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

        const body = await request.json();

        // 1. Generar ID de Misión (Ej: BITA-001)
        const { count } = await supabase.from('flight_authorizations').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
        const missionId = `BITA-${( (count || 0) + 1).toString().padStart(3, '0')}`;

        // 2. Insertar en la base de datos
        const { data: auth, error: dbError } = await supabase.from('flight_authorizations').insert([{
            owner_id: user.id,
            pilot_id: body.pilot_id,
            aircraft_id: body.aircraft_id,
            location: body.location,
            scheduled_at: body.scheduled_at,
            mission_id: missionId,
            status: 'autorizado'
        }]).select('*, pilots(name, email), aircraft(model)').single();

        if (dbError) throw new Error(`Error DB: ${dbError.message}`);

        // 3. Enviar Correo (Solo si el piloto tiene email y Resend está configurado)
        let emailSent = false;
        if (resend && auth.pilots?.email) {
            try {
                await resend.emails.send({
                    from: 'BitaFly OPS <onboarding@resend.dev>', // Usa este remitente para pruebas
                    to: [auth.pilots.email],
                    subject: `🚁 Misión Autorizada: ${missionId}`,
                    html: `<h2>Orden de Vuelo: ${missionId}</h2><p>Lugar: ${auth.location}</p><p>Drone: ${auth.aircraft.model}</p>`
                });
                emailSent = true;
            } catch (e) {
                console.error("Fallo envío correo:", e.message);
            }
        }

        return NextResponse.json({ success: true, missionId, emailSent });

    } catch (err) {
        console.error("Error en API Authorize:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}