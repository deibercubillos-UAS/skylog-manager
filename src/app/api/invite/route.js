import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { email, role, orgName, inviterName } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = await resend.emails.send({
      from: 'BitaFly <no-reply@bitafly.com>',
      replyTo: 'soporte@bitafly.com',
      to: [email],
      subject: `🚁 Invitación para unirse a la flota de ${orgName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1A202C;">
          <h2 style="color: #ec5b13;">¡Hola!</h2>
          <p><strong>${inviterName}</strong> te ha invitado a unirte a su equipo en <strong>BitaFly</strong> como <strong>${role}</strong>.</p>
          <p>Con BitaFly podrás gestionar tus vuelos, cumplir con la normativa RAC 100 y mantener tu bitácora digital al día.</p>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/registro?email=${email}" 
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