import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// Notifica al Jefe de Pilotos (y Gerente General) que un piloto planeó un vuelo.
async function notifyFlightPlan({ orgId, plan, actorId }) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  // Managers de la org — vía organization_members (rol) + profiles.active_organization_id
  // (mismo criterio que notify.js: solo cuentan los que tienen esta org como activa).
  const { data: memberRows } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .in('role', ['jefe_pilotos', 'admin']);
  const candidateIds = (memberRows || []).map(m => m.user_id);

  let managers = [];
  if (candidateIds.length) {
    const { data: profs } = await admin
      .from('profiles')
      .select('email, id')
      .eq('active_organization_id', orgId)
      .in('id', candidateIds);
    managers = profs || [];
  }

  const recipients = managers.filter(m => m.id !== actorId && m.email).map(m => m.email);
  if (recipients.length === 0) return;

  const { data: actor } = await admin
    .from('profiles').select('full_name, email').eq('id', actorId).maybeSingle();
  const { data: org } = await admin
    .from('organizations').select('company_name').eq('id', orgId).maybeSingle();

  const resend  = new Resend(process.env.RESEND_API_KEY);
  const who     = escHtml(actor?.full_name || actor?.email || 'Un piloto');
  const orgNm   = escHtml(org?.company_name || 'la organización');
  const opName  = escHtml(plan?.name || 'Operación sin nombre');
  const when    = escHtml([plan?.flight_date, plan?.takeoff_time].filter(Boolean).join(' ') || 'sin fecha definida');
  const place   = escHtml(plan?.location || 'sin ubicación');

  await resend.emails.send({
    from:    'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to:      recipients,
    subject: `🗺️ ${actor?.full_name || 'Un piloto'} planeó un vuelo: ${plan?.name || ''}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
      <tr><td style="background:#ec5b13;padding:32px 40px;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">BitaFly</h1>
        <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Nueva planeación de vuelo</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
          <strong>${who}</strong> registró una planeación de vuelo en <strong>${orgNm}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;font-size:14px;color:#1a202c;">
          <tr><td style="padding:6px 0;color:#718096;width:120px;">Operación</td><td style="padding:6px 0;font-weight:700;">${opName}</td></tr>
          <tr><td style="padding:6px 0;color:#718096;">Fecha / hora</td><td style="padding:6px 0;font-weight:700;">${when}</td></tr>
          <tr><td style="padding:6px 0;color:#718096;">Ubicación</td><td style="padding:6px 0;font-weight:700;">${place}</td></tr>
        </table>
        <table cellpadding="0" cellspacing="0"><tr><td style="background:#ec5b13;border-radius:10px;">
          <a href="${SITE()}/dashboard/programacion-activa" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">Ver en BitaFly →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
        <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">BitaFly · bitafly.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  });
}

export const dynamic = 'force-dynamic';

// GET /api/flight-plans — lista los planes activos de la organización
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const { data, error } = await supabase
      .from('flight_plans')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[flight-plans GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/flight-plans — crea un plan de vuelo
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    // Mismo permiso que para gestionar operaciones (incluye piloto independiente)
    if (!hasPermission(role, 'canManageOps')) {
      return NextResponse.json({ error: 'Sin permiso para crear planes de vuelo.' }, { status: 403 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre de la operación es obligatorio.' }, { status: 400 });
    }

    // Allowlist explícita de campos (no mass-assignment)
    const record = {
      organization_id: orgId,
      owner_id:        user.id,
      name:            body.name.trim().slice(0, 200),
      geo_type:        body.geo_type || null,
      points:          Array.isArray(body.points) ? body.points : [],
      radius:          body.radius != null ? Number(body.radius) : null,
      altitude:        body.altitude != null ? parseInt(body.altitude) : null,
      flight_date:     body.flight_date || null,
      takeoff_time:    body.takeoff_time || null,
      line_of_sight:   ['VLOS', 'EVLOS', 'BVLOS'].includes(body.line_of_sight) ? body.line_of_sight : null,
      location:        body.location ? String(body.location).slice(0, 300) : null,
      notes:           body.notes ? String(body.notes).slice(0, 2000) : null,
    };

    const { data, error } = await supabase
      .from('flight_plans')
      .insert([record])
      .select()
      .single();

    if (error) throw error;

    // Si quien planea es un piloto (dentro de una org), avisar al Jefe de Pilotos / GG.
    if (role === 'piloto') {
      try { await notifyFlightPlan({ orgId, plan: data, actorId: user.id }); }
      catch (e) { console.warn('[flight-plans] notificación no enviada:', e.message); }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[flight-plans POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/flight-plans?id=XXX — archiva (soft delete) un plan
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 });

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const { error } = await supabase
      .from('flight_plans')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[flight-plans DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
