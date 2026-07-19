import { Resend } from 'resend';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { PERMISSIONS, ASSIGNABLE_ROLES } from '@/lib/roles';
import { roleFromPilotRole, createCrewInvitation } from '@/lib/invitations';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// Roles que pueden ser asignados mediante invitación (fuente única: roles.js)
const INVITABLE_ROLES = ASSIGNABLE_ROLES; // ['admin', 'gerente_sms', 'jefe_pilotos', 'piloto']

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
    const ctx = await getOrgContext(supabase);
    const profile = { role: ctx.role, full_name: ctx.fullName, organization_id: ctx.orgId };

    if (!ctx.role) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
    }

    if (!PERMISSIONS.canChangeRoles.includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permisos para enviar invitaciones" }, { status: 403 });
    }

    // ── Validar payload ──────────────────────────────────────────────────────
    const { email, role: rawRole, pilotId } = await req.json();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // El cliente puede mandar el rol como label textual ("Piloto", "Jefe de
    // Pilotos", "Gerente General") o como rol de sistema. Normalizar siempre.
    const role = roleFromPilotRole(rawRole);

    if (!INVITABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: `Rol inválido. Permitidos: ${INVITABLE_ROLES.join(', ')}` }, { status: 400 });
    }

    // Nombre e org siempre desde el perfil autenticado (nunca del body — previene phishing)
    const senderName = profile.full_name || 'Un administrador';
    const { data: org } = await supabase
      .from('organizations')
      .select('company_name, tax_id, unique_code')
      .eq('id', profile.organization_id)
      .single();
    const orgDisplayName = org?.company_name || 'su organización';
    // NIT para prellenar el modo "unirse" en el enlace (solo aplica a usuarios nuevos)
    const orgNit = (org?.tax_id || org?.unique_code || '').replace(/[\s\-.]/g, '');
    const ROLE_LABEL = { admin: 'Gerente General', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', piloto: 'Piloto' };
    const roleLabel = ROLE_LABEL[role] || 'Tripulante';

    if (!process.env.RESEND_API_KEY) {
      console.error('[invite] RESEND_API_KEY no configurada');
      return NextResponse.json({ error: 'El servicio de correo no está configurado.' }, { status: 500 });
    }

    // ── Registrar la invitación real (bug corregido) ────────────────────────
    // Antes, este endpoint SOLO enviaba el correo — la fila de `invitations`
    // (con token/pilot_id/status='pending') la insertaba el cliente a mano
    // (AddPilotPanel.js) con datos incompletos o un status inválido, lo que
    // dejaba la invitación invisible para el banner de aceptar o sin ningún
    // piloto que vincular al aceptar. Ahora esta ruta es la única fuente de
    // verdad: crea/reutiliza la fila vía el mismo helper que ya usa la
    // importación masiva (`createCrewInvitation`), con `sendEmail:false`
    // porque el correo de abajo ya trae el enlace con NIT para el flujo de
    // unirse (que `sendInvitationEmail` no incluye).
    const admin = createAdminClient();
    const { isExistingUser } = await createCrewInvitation(admin, {
      orgId:      profile.organization_id,
      invitedBy:  user.id,
      pilotId:    pilotId || null,
      name:       null,
      email,
      role,
      orgName:    orgDisplayName,
      senderName,
      sendEmail:  false,
    });

    // ── Enviar invitación (branded, con NIT para el flujo de registro) ──────
    const cta = isExistingUser
      ? { url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/login?next=${encodeURIComponent('/dashboard')}`, label: 'Ver invitación en mi dashboard' }
      : { url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/registro?email=${encodeURIComponent(email.trim())}&join=1${orgNit ? `&nit=${encodeURIComponent(orgNit)}` : ''}`, label: 'Aceptar Invitación y Registrarme' };

    const resend = new Resend(process.env.RESEND_API_KEY);
    // ⚠️ El SDK de Resend NO lanza en errores de API — retorna { data, error }.
    // Hay que inspeccionar `error` o el envío falla silenciosamente.
    const { data, error } = await resend.emails.send({
      from: 'BitaFly <no-reply@bitafly.com>',
      replyTo: 'soporte@bitafly.com',
      to: [email.trim()],
      subject: `🚁 Invitación para unirse a la flota de ${orgDisplayName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1A202C;">
          <h2 style="color: #ec5b13;">¡Hola!</h2>
          <p><strong>${senderName}</strong> te ha invitado a unirte a su equipo en <strong>BitaFly</strong> como <strong>${roleLabel}</strong>.</p>
          <p>Con BitaFly podrás gestionar tus vuelos, cumplir con la normativa RAC 100 y mantener tu bitácora digital al día.</p>
          <div style="margin-top: 30px;">
            <a href="${cta.url}"
               style="background-color: #ec5b13; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              ${cta.label}
            </a>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #718096;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[invite] Resend error:', error);
      return NextResponse.json({ error: error.message || 'No se pudo enviar el correo de invitación.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('[invite]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
