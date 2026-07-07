import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { escHtml } from '@/lib/emailHelpers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function POST(req) {
  try {
    // Rate limiting: máx 3 mensajes de contacto por IP cada 10 minutos
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`contact:${ip}`, { limit: 3, windowMs: 600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }, { status: 429 });
    }

    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'BitaFly Soporte <soporte@bitafly.com>',
      to: ['soporte@bitafly.com'],
      replyTo: email,
      subject: `Nueva Consulta desde el landing: ${escHtml(name)}`,
      html: `<p><strong>Nombre:</strong> ${escHtml(name)}</p>
             <p><strong>Email:</strong> ${escHtml(email)}</p>
             <p><strong>Mensaje:</strong> ${escHtml(message)}</p>`,
    });
    if (error) {
      console.error('API Contact — Resend error:', error);
      return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 502 });
    }

    return NextResponse.json({ message: "Enviado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}