import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';
import { storagePut, storageDownload, storageRemove } from '@/lib/storage';
import { getOrgPlan } from '@/lib/orgPlan';

export const dynamic = 'force-dynamic';

const BUCKET  = 'flight-replays';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// ── Helpers ────────────────────────────────────────────────────────────
async function getFlightOrg(supabase, flightId, orgId) {
  const { data } = await supabase
    .from('flights')
    .select('id, organization_id, replay_path, flight_date, created_at')
    .eq('id', flightId)
    .eq('organization_id', orgId)
    .single();
  return data ?? null;
}

// Lee la cuota del plan vigente de la org (usa billing=monthly como referencia)
async function getOrgQuota(admin, orgId) {
  const plan = await getOrgPlan(admin, orgId, 'piloto');

  const { data: cfg } = await admin
    .from('epayco_plan_config')
    .select('replay_retention_days, replay_max_flights')
    .eq('plan_key', plan)
    .eq('billing', 'monthly')
    .single();

  return {
    retentionDays: cfg?.replay_retention_days ?? 30,
    maxFlights:    cfg?.replay_max_flights    ?? 10,
    plan,
  };
}

// ── GET /api/flights/[id]/replay ───────────────────────────────────────
// Devuelve una signed URL válida 1h para descargar el replay guardado.
export async function GET(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canViewFlightReplay.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const admin  = createAdminClient();
    const flight = await getFlightOrg(supabase, params.id, ctx.orgId);
    if (!flight)             return NextResponse.json({ error: 'Vuelo no encontrado' }, { status: 404 });
    if (!flight.replay_path) return NextResponse.json({ error: 'Este vuelo no tiene replay guardado' }, { status: 404 });

    // Verificar expiración por cuota del plan.
    // Usamos created_at (fecha de importación/guardado del replay) y NO flight_date,
    // porque un vuelo de hace 40 días importado hoy no debe expirar inmediatamente.
    const quota = await getOrgQuota(admin, ctx.orgId);
    const replayAgeRef = flight.created_at ?? flight.flight_date;
    if (quota.retentionDays > 0 && replayAgeRef) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - quota.retentionDays);
      if (new Date(replayAgeRef) < cutoff) {
        // Limpiar replay expirado
        await storageRemove({ bucket: BUCKET, keys: flight.replay_path });
        await admin.from('flights')
          .update({ replay_path: null })
          .eq('id', params.id)
          .eq('organization_id', ctx.orgId);
        return NextResponse.json({
          error: `Replay expirado (retención: ${quota.retentionDays} días en tu plan ${quota.plan})`,
          expired: true,
        }, { status: 404 });
      }
    }

    // Servir el replay por streaming desde el servidor (mismo origen) en vez de
    // devolver una signed URL a R2 → inmune a extensiones/CORS que bloqueen R2.
    const { data, error } = await storageDownload({ bucket: BUCKET, key: flight.replay_path });
    if (error || !data) throw (error || new Error('Replay no encontrado'));

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': String(data.length),
        'Cache-Control': 'private, max-age=3300',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/flights/[id]/replay ──────────────────────────────────────
// Recibe el JSON de telemetría comprimido (gzip) y lo guarda en Storage.
// Body: application/octet-stream — el blob gzipped enviado desde el browser.
export async function POST(req, { params }) {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canViewFlightReplay.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const flight = await getFlightOrg(supabase, params.id, ctx.orgId);
    if (!flight) return NextResponse.json({ error: 'Vuelo no encontrado' }, { status: 404 });

    const admin = createAdminClient();

    // ── Enforcement de cuota: eliminar el más antiguo si se alcanza el límite ──
    const quota = await getOrgQuota(admin, ctx.orgId);
    if (quota.maxFlights > 0) {
      // Contar replays actuales de la org (excluyendo este vuelo si ya tiene uno)
      const { count } = await admin
        .from('flights')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.orgId)
        .not('replay_path', 'is', null)
        .neq('id', params.id);

      if ((count ?? 0) >= quota.maxFlights) {
        // Eliminar el más antiguo
        const { data: oldest } = await admin
          .from('flights')
          .select('id, replay_path')
          .eq('organization_id', ctx.orgId)
          .not('replay_path', 'is', null)
          .neq('id', params.id)
          .order('flight_date', { ascending: true })
          .limit(1)
          .single();

        if (oldest?.replay_path) {
          await storageRemove({ bucket: BUCKET, keys: oldest.replay_path });
          await admin.from('flights')
            .update({ replay_path: null })
            .eq('id', oldest.id)
            .eq('organization_id', ctx.orgId);
        }
      }
    }

    // Leer body como ArrayBuffer
    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Replay demasiado grande (máx 2 MB)' }, { status: 413 });
    }
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Body vacío' }, { status: 400 });
    }

    const storagePath = `orgs/${ctx.orgId}/replays/${params.id}.json.gz`;

    // Subir a Storage (upsert si ya existe)
    const { error: uploadErr } = await storagePut({
      bucket:       BUCKET,
      key:          storagePath,
      body:         arrayBuffer,
      contentType:  'application/gzip',
      upsert:       true,
      cacheControl: '3600',
    });

    if (uploadErr) throw uploadErr;

    // Actualizar replay_path en la fila del vuelo
    const { error: updateErr } = await admin
      .from('flights')
      .update({ replay_path: storagePath })
      .eq('id', params.id)
      .eq('organization_id', ctx.orgId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true, path: storagePath });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/flights/[id]/replay ───────────────────────────────────
// Elimina el replay guardado (limpieza manual o por cuota en Fase 3).
export async function DELETE(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const flight = await getFlightOrg(supabase, params.id, ctx.orgId);
    if (!flight?.replay_path) return NextResponse.json({ ok: true }); // ya no existe

    const admin = createAdminClient();
    await storageRemove({ bucket: BUCKET, keys: flight.replay_path });
    await admin.from('flights')
      .update({ replay_path: null })
      .eq('id', params.id)
      .eq('organization_id', ctx.orgId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
