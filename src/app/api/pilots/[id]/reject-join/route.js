/**
 * POST /api/pilots/[id]/reject-join
 *
 * Rechaza una solicitud de unión de un piloto independiente (ver
 * approve-join). No crea membresía; elimina la fila `pilots` creada por la
 * solicitud (no hay expediente real que conservar todavía — el solicitante
 * nunca llegó a ser tripulante) y notifica al solicitante.
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { createNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user || !ctx.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canChangeRoles.includes(ctx.role)) {
      return NextResponse.json({ error: 'No tienes permiso para rechazar solicitudes.' }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: pilot, error: pErr } = await admin
      .from('pilots')
      .select('id, profile_id, invitation_status, organization_id')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!pilot || pilot.invitation_status !== 'solicitud_pendiente') {
      return NextResponse.json({ error: 'Solicitud no encontrada o ya resuelta.' }, { status: 404 });
    }

    const { error: delErr } = await admin.from('pilots').delete().eq('id', id);
    if (delErr) throw delErr;

    if (pilot.profile_id) {
      try {
        await createNotifications({
          orgId: ctx.orgId,
          profileIds: [pilot.profile_id],
          type: 'join_request',
          title: 'Tu solicitud fue rechazada',
          body: 'El gerente rechazó tu solicitud de unión a la organización.',
          link: '/dashboard/subscription',
          actorId: ctx.user.id,
        });
      } catch (notifyErr) {
        console.error('[reject-join] notify', notifyErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reject-join]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
