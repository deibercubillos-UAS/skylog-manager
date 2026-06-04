import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

const BUCKET  = 'flight-replays';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// ── Helpers ────────────────────────────────────────────────────────────
async function getFlightOrg(supabase, flightId, orgId) {
  const { data } = await supabase
    .from('flights')
    .select('id, organization_id, replay_path')
    .eq('id', flightId)
    .eq('organization_id', orgId)
    .single();
  return data ?? null;
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

    const flight = await getFlightOrg(supabase, params.id, ctx.orgId);
    if (!flight)             return NextResponse.json({ error: 'Vuelo no encontrado' }, { status: 404 });
    if (!flight.replay_path) return NextResponse.json({ error: 'Este vuelo no tiene replay guardado' }, { status: 404 });

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(flight.replay_path, 3600); // 1 hora

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
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

    // Leer body como ArrayBuffer
    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Replay demasiado grande (máx 2 MB)' }, { status: 413 });
    }
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Body vacío' }, { status: 400 });
    }

    const admin       = createAdminClient();
    const storagePath = `orgs/${ctx.orgId}/replays/${params.id}.json.gz`;

    // Subir a Storage (upsert si ya existe)
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
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
    await admin.storage.from(BUCKET).remove([flight.replay_path]);
    await admin.from('flights')
      .update({ replay_path: null })
      .eq('id', params.id)
      .eq('organization_id', ctx.orgId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
