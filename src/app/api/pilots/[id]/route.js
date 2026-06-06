import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/roles';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

// Campos editables de un piloto.
// Bloqueados: organization_id, owner_id, id, created_at, is_active (soft-delete es por DELETE).
const ALLOWED_PILOT_FIELDS = [
  'name', 'email', 'phone', 'license_number', 'medical_expiry',
  'pilot_role', 'position', 'notes', 'avatar_url',
  'aerocivil_theoretical', 'aerocivil_practical',
  'theoretical_approval_date', 'practical_approval_date',
  'address', 'city', 'emergency_contact_name', 'emergency_contact_phone',
];

// OBTENER UN PILOTO ESPECÍFICO (requiere autenticación y org match)
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Piloto no encontrado' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// EDITAR DATOS DEL PILOTO
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updateData } = body;

    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'updateData requerido' }, { status: 400 });
    }

    // Allowlist: evitar mass-assignment de campos sensibles
    const safeUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => ALLOWED_PILOT_FIELDS.includes(key))
    );

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pilots')
      .update({ ...safeUpdate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select();

    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Piloto no encontrado en tu organización' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DAR DE BAJA (SOFT DELETE) — solo admin / jefe_pilotos / superadmin
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verificar rol en servidor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!PERMISSIONS.canManageFleet.includes(profile?.role)) {
      return NextResponse.json({ error: 'Sin permisos para dar de baja tripulantes' }, { status: 403 });
    }

    // Leer datos del piloto ANTES de la baja (para el correo)
    const { data: pilot } = await supabase
      .from('pilots')
      .select('name, email')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    // Leer nombre de la organización
    const { data: org } = await supabase
      .from('organizations')
      .select('company_name')
      .eq('id', orgId)
      .maybeSingle();

    // Borrado lógico verificando org
    const { error } = await supabase
      .from('pilots')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;

    // Enviar correo al piloto si tiene email registrado (fire-and-forget)
    if (pilot?.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const pilotName  = escHtml(pilot.name || 'Piloto');
        const orgName    = escHtml(org?.company_name || 'la organización');
        const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com'}/registro`;

        await resend.emails.send({
          from:    'BitaFly <no-reply@bitafly.com>',
          replyTo: 'soporte@bitafly.com',
          to:      [pilot.email.trim()],
          subject: `Tu acceso a ${org?.company_name || 'BitaFly'} ha finalizado`,
          html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;">

        <!-- Header naranja -->
        <tr>
          <td style="background:#ec5b13;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">BitaFly</h1>
            <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Gestión de operaciones con drones</p>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1a202c;">Hola, <strong>${pilotName}</strong></p>

            <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
              Te informamos que tu perfil ha sido dado de baja en <strong>${orgName}</strong>.
              A partir de ahora ya no tendrás acceso al dashboard de esa organización.
            </p>

            <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.6;">
              Sin embargo, <strong>tu historial de vuelos no desaparece</strong>. Puedes registrarte
              como <strong>Piloto Independiente</strong> en BitaFly y reclamar tu bitácora dentro
              de los próximos <strong>30 días</strong>.
            </p>

            <!-- Cuadro de beneficios -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#fff7f2;border:1px solid #fcd5b8;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:900;color:#c05010;text-transform:uppercase;letter-spacing:0.05em;">
                  Plan Piloto Independiente — Gratis
                </p>
                <table cellpadding="0" cellspacing="0">
                  ${[
                    '1 aeronave registrada',
                    'Hasta 3 baterías y 3 payloads',
                    'Bitácora de vuelos completa',
                    'Mantenimiento de aeronaves',
                    'Planeación y despacho de vuelos',
                    'Replay GPS de tus últimos 10 vuelos',
                  ].map(item => `
                  <tr>
                    <td style="padding:4px 0;vertical-align:top;">
                      <span style="color:#ec5b13;font-size:16px;margin-right:10px;">✓</span>
                    </td>
                    <td style="padding:4px 0;font-size:14px;color:#2d3748;">${item}</td>
                  </tr>`).join('')}
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#ec5b13;border-radius:10px;">
                  <a href="${registerUrl}?tipo=solo"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none;letter-spacing:0.03em;">
                    Crear mi cuenta gratuita →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#718096;line-height:1.6;">
              Si tienes preguntas, escríbenos a
              <a href="mailto:soporte@bitafly.com" style="color:#ec5b13;">soporte@bitafly.com</a>.
              <br>Tu bitácora es tuya — no dejes que se pierda.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
            <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">
              BitaFly · bitafly.com · Este correo fue generado automáticamente.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      } catch (emailErr) {
        // El correo falla en silencio — la baja ya ocurrió
        console.warn('[pilots DELETE] email not sent:', emailErr.message);
      }
    }

    return NextResponse.json({ message: 'Tripulante dado de baja' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
