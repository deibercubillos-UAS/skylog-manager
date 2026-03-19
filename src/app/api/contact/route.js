import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { name, email, company, message } = await req.json();

    await resend.emails.send({
      from: 'BitaFly Leads <no-reply@bitafly.com>',
      to: ['tu-correo@empresa.com'], // Donde quieres recibir los leads
      subject: `Nueva Consulta: ${company}`,
      html: `<p><strong>Nombre:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Mensaje:</strong> ${message}</p>`
    });

    return NextResponse.json({ message: "Enviado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}