import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { escHtml } from '@/lib/emailHelpers';

export async function POST(req) {
  try {
    const { name, email, company, message } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'BitaFly Soporte <soporte@bitafly.com>',
      to: ['soporte@bitafly.com'],
      replyTo: email,
      subject: `Nueva Consulta: ${escHtml(company)}`,
      html: `<p><strong>Nombre:</strong> ${escHtml(name)}</p>
             <p><strong>Email:</strong> ${escHtml(email)}</p>
             <p><strong>Mensaje:</strong> ${escHtml(message)}</p>`,
    });

    return NextResponse.json({ message: "Enviado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}