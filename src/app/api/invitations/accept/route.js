// POST /api/invitations/accept  { token }
// El usuario autenticado acepta una invitación: se une a la organización
// (transfiriendo su data si es dueño único de su org actual), se marca la
// invitación como aceptada y el piloto destino queda 'accepted' y vinculado.
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

// Tablas con organization_id que se transfieren cuando el invitado es dueño
// único de su organización actual (piloto independiente).
const TRANSFER_TABLES = [
  'aircraft', 'batteries', 'flights', 'pilots', 'flight_plans',
  'flight_authorizations', 'sms_reports', 'maintenance_logs',
  'checklist_templates', 'sora_templates', 'inventory_items',
];

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

    // ── Perfil y org actual del usuario ────────────────────────────────────
    const { data: prof } = await admin
      .from('profiles').select('organization_id, role, subscription_plan, full_name, email').eq('id', user.id).maybeSingle();
    const currentOrgId = prof?.organization_id || null;
    const targetOrgId  = inv.organization_id;

    const joinName = prof?.full_name || user.email || invEmail;

    if (currentOrgId === targetOrgId) {
      // Ya está en la org: solo cerrar la invitación y vincular el piloto
      await admin.from('invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', inv.id);
      if (inv.pilot_id) await admin.from('pilots').update({ invitation_status: 'accepted', profile_id: user.id }).eq('id', inv.pilot_id);
      await notifyJoin(targetOrgId, joinName, inv.role, user.id);
      return NextResponse.json({ success: true });
    }

    // ── Transferir data solo si el usuario es dueño ÚNICO de su org actual ──
    // (evita arrastrar data de otros miembros). Si no, solo cambia de org.
    if (currentOrgId) {
      const { data: members } = await admin
        .from('profiles').select('id').eq('organization_id', currentOrgId);
      const isSoleMember = (members?.length || 0) <= 1;

      if (isSoleMember) {
        for (const table of TRANSFER_TABLES) {
          const { error } = await admin
            .from(table).update({ organization_id: targetOrgId }).eq('organization_id', currentOrgId);
          if (error && !/does not exist|column/.test(error.message)) {
            console.warn(`[invitations/accept] warn ${table}:`, error.message);
          }
        }
        // Marcar la org origen como migrada (no se elimina)
        const { data: tOrg } = await admin
          .from('organizations').select('company_name').eq('id', targetOrgId).maybeSingle();
        await admin.from('organizations')
          .update({ company_name: `[Migrada] ${tOrg?.company_name || ''}`.trim() })
          .eq('id', currentOrgId);
      }
    }

    // ── Mover el perfil del usuario a la org destino con el rol invitado ────
    await admin.from('profiles')
      .update({ organization_id: targetOrgId, role: inv.role })
      .eq('id', user.id);

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
