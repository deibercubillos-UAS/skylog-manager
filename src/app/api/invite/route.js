import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { email, role, orgName, inviterName } = await req.json();

    const data = await resend.emails.send({
      from: 'SkyLog Manager <no-reply@bitafly.com>',, // Luego podrás usar tu propio dominio
      to: [email],
      subject: `🚁 Invitación para unirse a la flota de ${orgName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1A202C;">
          <h2 style="color: #ec5b13;">¡Hola!</h2>
          <p><strong>${inviterName}</strong> te ha invitado a unirte a su equipo en <strong>SkyLog Manager</strong> como <strong>${role}</strong>.</p>
          <p>Con SkyLog podrás gestionar tus vuelos, cumplir con la normativa RAC 100 y mantener tu bitácora digital al día.</p>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.vercel.app'}/registro?email=${email}" 
               style="background-color: #ec5b13; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Aceptar Invitación y Registrarme
            </a>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #718096;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}