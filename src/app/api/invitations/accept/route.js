// POST /api/invitations/accept  { token }
// El usuario autenticado acepta una invitación: se une a la organización
// (agregando una membresía nueva en organization_members), se marca la
// invitación como aceptada y el piloto destino queda 'accepted' y vinculado.
//
// Fase 5 del refactor multi-organización — cambio de comportamiento
// confirmado con el usuario: antes, si el invitado era dueño único de su
// organización actual, se MIGRABA toda su data (aircraft/flights/pilots/...)
// a la org que lo invitó y su org de origen quedaba "[Migrada]". Con
// membresía múltiple disponible, eso queda superado: aceptar una invitación
// SIEMPRE solo agrega una membresía nueva, nunca migra datos ni toca la
// organización de origen — la cuenta sigue viendo su organización activa
// actual hasta que use el switcher (`POST /api/org/switch-active`) para
// cambiar explícitamente, sin auto-cambio.
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { createNotifications } from '@/lib/notify';
import { labelForRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// Avisa a GG + Jefe de Pilotos que alguien se unió (fire-and-forget)
async function notifyJoin(targetOrgId, name, role, actorId) {
  try {
    await createNotifications({
      orgId: targetOrgId,
      roles: ['admin', 'jefe_pilotos'],
      type: 'invitation',
      title: `${name} se unió al equipo`,
      body: `Aceptó la invitación como ${labelForRole(role)}.`,
      link: '/dashboard/pilots',
      actorId,
    });
  } catch (e) { console.warn('[invitations/accept] notif:', e.message); }
}

export async function POST(request) {
  try {
    const { token } = await request.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();

    // ── Buscar invitación válida ───────────────────────────────────────────
    const { data: inv } = await admin
      .from('invitations')
      .select('id, email, role, organization_id, status, pilot_id')
      .eq('token', token)
      .maybeSingle();

    if (!inv)                       return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    if (inv.status === 'accepted')  return NextResponse.json({ success: true, alreadyAccepted: true });
    if (inv.status !== 'pending')   return NextResponse.json({ error: 'La invitación ya no está disponible' }, { status: 409 });

    // El email de la invitación debe coincidir con el del usuario (anti-phishing)
    const myEmail  = (user.email || '').trim().toLowerCase();
    const invEmail = (inv.email || '').trim().toLowerCase();
    if (myEmail !== invEmail) {
      return NextResponse.json({ error: 'Esta invitación pertenece a otro correo.' }, { status: 403 });
    }

    const { data: prof } = await admin
      .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const targetOrgId = inv.organization_id;
    const joinName = prof?.full_name || user.email || invEmail;

    // ── ¿Ya es miembro de la org invitante? — solo cerrar la invitación ─────
    const { data: existingMembership } = await admin
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', targetOrgId)
      .maybeSingle();

    if (!existingMembership) {
      // ── Agregar la membresía — nunca migra datos ni toca otra org ─────────
      const { error: insertError } = await admin
        .from('organization_members')
        .insert({ user_id: user.id, organization_id: targetOrgId, role: inv.role, subscription_plan: 'piloto' });
      if (insertError) throw insertError;
    }

    // ── Vincular el piloto destino y marcar aceptado ───────────────────────
    if (inv.pilot_id) {
      await admin.from('pilots')
        .update({ invitation_status: 'accepted', profile_id: user.id })
        .eq('id', inv.pilot_id);
    } else {
      // Sin pilot_id: marcar cualquier piloto de esa org con el mismo email
      await admin.from('pilots')
        .update({ invitation_status: 'accepted', profile_id: user.id })
        .eq('organization_id', targetOrgId).ilike('email', invEmail);
    }

    await admin.from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    const { data: org } = await admin
      .from('organizations').select('company_name').eq('id', targetOrgId).maybeSingle();

    await notifyJoin(targetOrgId, joinName, inv.role, user.id);

    return NextResponse.json({ success: true, orgName: org?.company_name || null });
  } catch (err) {
    console.error('[invitations/accept]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
