// GET /api/cron/free-grants — Vercel Cron (daily 13:30 UTC)
// 1. Degrada grants expirados (expires_at <= now, status 'activado' O 'enviado')
// 2. Purga datos operacionales 3 meses después (purge_after <= now, status='degradado')
//
// Secured con Authorization: Bearer CRON_SECRET

import { NextResponse } from 'next/server';
import { createClient }  from '@supabase/supabase-js';
import { Resend }        from 'resend';
import { createNotifications } from '@/lib/notify';
import { escHtml } from '@/lib/emailHelpers';
import { syncOrgMembership } from '@/lib/orgMembership';

export const dynamic = 'force-dynamic';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin  = makeAdmin();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now    = new Date().toISOString();

  const results = { degraded: 0, purged: 0, errors: [] };

  // ── 1. Degradar grants expirados (activado O enviado sin redimir) ─────────
  const { data: expired } = await admin
    .from('free_grants')
    .select('id, email, redeemed_org_id')
    .in('status', ['activado', 'enviado'])   // incluye huérfanos sin redimir
    .lte('expires_at', now);

  for (const grant of expired || []) {
    try {
      // Solo notificar/degradar perfil si el grant fue redimido
      if (grant.redeemed_org_id) {
        const { data: orgAdmin } = await admin
          .from('profiles')
          .select('id, email, organization_id')
          .eq('organization_id', grant.redeemed_org_id)
          .eq('role', 'admin')
          .maybeSingle();

        if (orgAdmin) {
          await admin.from('profiles').update({
            subscription_plan:       'piloto',
            subscription_expires_at: null,
            updated_at:              now,
          }).eq('id', orgAdmin.id);

          await syncOrgMembership(admin, {
            userId: orgAdmin.id,
            organizationId: grant.redeemed_org_id,
            subscriptionPlan: 'piloto',
            subscriptionExpiresAt: null,
          });

          try {
            await createNotifications({
              orgId: grant.redeemed_org_id,
              roles: ['admin'],
              type:  'system',
              title: 'Tu período gratuito ha vencido',
              body:  'Tu acceso piloto gratuito expiró. Suscríbete para seguir usando BitaFly.',
              link:  '/dashboard/subscription',
            });
          } catch { /* no crítico */ }

          try {
            await resend.emails.send({
              from:    'BitaFly <no-reply@bitafly.com>',
              to:      [escHtml(grant.email)],
              subject: 'Tu período gratuito en BitaFly ha vencido',
              html: `
                <p>Hola,</p>
                <p>Tu período gratuito en <strong>BitaFly</strong> ha expirado.</p>
                <p>Tus datos estarán disponibles durante <strong>3 meses</strong> más, pero no podrás realizar nuevas operaciones hasta que te suscribas.</p>
                <p><a href="https://bitafly.co/dashboard/subscription">Ver planes de suscripción</a></p>
                <p>— Equipo BitaFly</p>
              `,
            });
          } catch { /* no crítico */ }
        }
      }

      await admin.from('free_grants')
        .update({ status: 'degradado', updated_at: now })
        .eq('id', grant.id);

      results.degraded++;
      console.log(`[cron/free-grants] degradado grant=${grant.id} email=${grant.email}`);
    } catch (err) {
      results.errors.push(`grant ${grant.id}: ${err.message}`);
      console.error(`[cron/free-grants] error degradando ${grant.id}:`, err.message);
    }
  }

  // ── 2. Purgar grants con purge_after alcanzado ────────────────────────────
  const { data: toPurge } = await admin
    .from('free_grants')
    .select('id, email, redeemed_org_id')
    .eq('status', 'degradado')
    .lte('purge_after', now);

  for (const grant of toPurge || []) {
    try {
      if (grant.redeemed_org_id) {
        const orgId = grant.redeemed_org_id;

        // Eliminar datos operacionales en orden por FK
        await admin.from('flights').delete().eq('organization_id', orgId);
        await admin.from('maintenance_logs').delete().eq('organization_id', orgId);
        await admin.from('batteries').delete().eq('organization_id', orgId);
        await admin.from('aircraft').delete().eq('organization_id', orgId);
        await admin.from('pilots').delete().eq('organization_id', orgId);
        await admin.from('flight_authorizations').delete().eq('organization_id', orgId);
        await admin.from('flight_plans').delete().eq('organization_id', orgId);

        try {
          await resend.emails.send({
            from:    'BitaFly <no-reply@bitafly.com>',
            to:      [escHtml(grant.email)],
            subject: 'Tus datos de BitaFly han sido eliminados',
            html: `
              <p>Hola,</p>
              <p>Han pasado 3 meses desde que venció tu período gratuito en <strong>BitaFly</strong>.</p>
              <p>Conforme a nuestra política de retención, los datos operacionales de tu cuenta han sido eliminados.</p>
              <p>Si deseas volver, puedes <a href="https://bitafly.co/registro">crear una nueva cuenta</a> en cualquier momento.</p>
              <p>— Equipo BitaFly</p>
            `,
          });
        } catch { /* no crítico */ }
      }

      await admin.from('free_grants')
        .update({ status: 'purgado', updated_at: now })
        .eq('id', grant.id);

      results.purged++;
      console.log(`[cron/free-grants] purgado grant=${grant.id} org=${grant.redeemed_org_id}`);
    } catch (err) {
      results.errors.push(`purge ${grant.id}: ${err.message}`);
      console.error(`[cron/free-grants] error purgando ${grant.id}:`, err.message);
    }
  }

  console.log('[cron/free-grants] done', results);
  return NextResponse.json(results);
}
