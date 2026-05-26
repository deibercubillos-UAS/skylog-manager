import { Resend } from 'resend';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Roles que pueden ser asignados mediante invitación
const INVITABLE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms', 'admin'];

// Validación de formato de email
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req) {
  try {
    const supabase = await createClient();

    // ── Autenticación ────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // ── Autorización: solo admin o superadmin pueden invitar ─────────────────
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role, full_name, organization_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
    }

    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permisos para enviar invitaciones" }, { status: 403 });
    }

    // ── Validar payload ──────────────────────────────────────────────────────
    const { email, role, orgName, inviterName } = await req.json();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    if (!role || !INVITABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: `Rol inválido. Permitidos: ${INVITABLE_ROLES.join(', ')}` }, { status: 400 });
    }

    // Usar el nombre del perfil autenticado si no viene del body
    const senderName = inviterName || profile.full_name || 'Un administrador';
    const orgDisplayName = orgName || 'su organización';

    // ── Enviar invitación ────────────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = await resend.emails.send({
      from: 'BitaFly <no-reply@bitafly.com>',
      replyTo: 'soporte@bitafly.com',
      to: [email.trim()],
      subject: `🚁 Invitación para unirse a la flota de ${orgDisplayName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1A202C;">
          <h2 style="color: #ec5b13;">¡Hola!</h2>
          <p><strong>${senderName}</strong> te ha invitado a unirte a su equipo en <strong>BitaFly</strong> como <strong>${role}</strong>.</p>
          <p>Con BitaFly podrás gestionar tus vuelos, cumplir con la normativa RAC 100 y mantener tu bitácora digital al día.</p>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/registro?email=${encodeURIComponent(email.trim())}"
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
