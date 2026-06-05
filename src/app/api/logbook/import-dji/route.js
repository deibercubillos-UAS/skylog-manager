import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { parseDjiTxtBuffer } from '@/lib/djiParser';
import { detectAlerts, buildTelemetry, buildPath, buildMeta } from '@/lib/djiTelemetry';
import { canAddResource } from '@/lib/planLimits';

export const dynamic = 'force-dynamic';

const BUCKET   = 'flight-replays';
const MAX_REPLAY = 2 * 1024 * 1024; // 2 MB

/**
 * GET /api/logbook/import-dji?pairs=2026-05-01|18:17,2026-04-30|14:30
 *
 * Recibe pares fecha|hora extraídos de los nombres de archivos DJI
 * y devuelve cuáles ya fueron importados previamente.
 * Una sola consulta a la BD — sin parsear archivos.
 */
export async function GET(request) {
  try {
    const supabaseUser = await createClientSSR();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: prof } = await supabaseUser
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!prof?.organization_id) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pairsParam = searchParams.get('pairs') ?? '';

    if (!pairsParam.trim()) {
      return NextResponse.json({ existing: [] });
    }

    // Parsear pares "YYYY-MM-DD|HH:MM"
    const pairs = pairsParam
      .split(',')
      .map(p => { const [date, time] = p.split('|'); return { date, time }; })
      .filter(p => p.date && p.time);

    if (!pairs.length) return NextResponse.json({ existing: [] });

    const supabaseAdmin = createAdminClient();

    // Una sola consulta: traer todos los vuelos importados en esas fechas
    const uniqueDates = [...new Set(pairs.map(p => p.date))];

    const { data: rows } = await supabaseAdmin
      .from('flights')
      .select('flight_date, takeoff_time')
      .eq('organization_id', prof.organization_id)
      .eq('imported', true)
      .in('flight_date', uniqueDates);

    // Construir set de claves "fecha|hora"
    const existingSet = new Set(
      (rows ?? []).map(r => `${r.flight_date}|${r.takeoff_time}`)
    );

    // Filtrar qué pares enviados ya existen
    const existing = pairs
      .map(p => `${p.date}|${p.time}`)
      .filter(key => existingSet.has(key));

    return NextResponse.json({ existing });

  } catch (err) {
    console.error('[import-dji GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Helpers cuota replay ─────────────────────────────────────────────────────
async function getOrgReplayQuota(admin, orgId) {
  const { data: prof } = await admin
    .from('profiles')
    .select('subscription_plan')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const plan = prof?.subscription_plan ?? 'piloto';

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

export async function POST(request) {
  try {
    // ── 1. Autenticar ────────────────────────────────────────────
    const supabaseUser = await createClientSSR();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: prof } = await supabaseUser
      .from('profiles')
      .select('organization_id, role, subscription_plan')
      .eq('id', user.id)
      .single();

    if (!prof?.organization_id) {
      return NextResponse.json({ error: 'Perfil sin organización asignada' }, { status: 403 });
    }

    // ── 2. Leer archivo ──────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'Archivo no recibido' }, { status: 400 });
    }

    const fileName = file.name ?? 'log.txt';
    const buf = Buffer.from(await file.arrayBuffer());

    if (buf.length < 64) {
      return NextResponse.json({ error: 'Archivo demasiado pequeño — no es un log DJI válido' }, { status: 422 });
    }
    if (buf.length > 50_000_000) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 50 MB)' }, { status: 413 });
    }

    // ── 3. Parsear con dji-log-parser-js ─────────────────────────
    let parsed;
    try {
      parsed = await parseDjiTxtBuffer(buf);
    } catch (err) {
      return NextResponse.json({
        error: err.message,
        file:  fileName,
      }, { status: 422 });
    }

    if (!parsed.serial_aeronave) {
      return NextResponse.json({
        error: 'No se pudo extraer el serial de la aeronave del archivo DJI.',
        file:  fileName,
      }, { status: 422 });
    }

    if (!parsed.fecha) {
      return NextResponse.json({
        error: 'No se pudo determinar la fecha del vuelo.',
        file:  fileName,
      }, { status: 422 });
    }

    const supabaseAdmin = createAdminClient();
    const frames        = parsed._frames ?? [];

    // ── 4. Buscar aeronave por serial ────────────────────────────
    const { data: aircraft } = await supabaseAdmin
      .from('aircraft')
      .select('id, serial_number, total_hours')
      .eq('organization_id', prof.organization_id)
      .ilike('serial_number', parsed.serial_aeronave)
      .maybeSingle();

    if (!aircraft) {
      return NextResponse.json({
        needs_aircraft: true,
        serial:         parsed.serial_aeronave,
        modelo:         parsed._meta?.modelo_aeronave  ?? null,
        nombre:         parsed._meta?.nombre_aeronave  ?? null,
        file:           fileName,
        error:          `Aeronave con serial "${parsed.serial_aeronave}" no registrada en tu flota.`,
      }, { status: 404 });
    }

    // ── 5. Detectar alertas ──────────────────────────────────────
    let alerts     = [];
    let hasAlerts  = false;
    try {
      if (frames.length > 0) {
        alerts    = detectAlerts(frames);
        hasAlerts = alerts.length > 0;
      }
    } catch (alertErr) {
      console.error('[import-dji] alert detection:', alertErr.message);
    }

    // ── 6. Auto-asignar piloto ───────────────────────────────────
    // a) Plan 'piloto' → buscar registro propio del usuario
    // b) Cualquier plan → se completará con la autorización si hay coincidencia
    let pilotId = null;
    if (prof.subscription_plan === 'piloto') {
      try {
        // Primero por email
        const { data: byEmail } = await supabaseAdmin
          .from('pilots')
          .select('id')
          .eq('organization_id', prof.organization_id)
          .eq('email', user.email)
          .maybeSingle();
        if (byEmail) {
          pilotId = byEmail.id;
        } else {
          // Fallback: piloto registrado por este usuario
          const { data: byOwner } = await supabaseAdmin
            .from('pilots')
            .select('id')
            .eq('organization_id', prof.organization_id)
            .eq('owner_id', user.id)
            .maybeSingle();
          pilotId = byOwner?.id ?? null;
        }
      } catch (pErr) {
        console.error('[import-dji] pilot lookup:', pErr.message);
      }
    }

    // ── 7. Buscar autorización de vuelo coincidente ──────────────
    // Coincide si la fecha de la autorización == fecha del vuelo
    // y el aircraft_id coincide (preferido) o no importa.
    let missionId   = null;
    let missionType = parsed.tipo_mision ?? null;
    try {
      const { data: authMatches } = await supabaseAdmin
        .from('flight_authorizations')
        .select('id, mission_id, mission_type, pilot_id, aircraft_id, scheduled_at')
        .eq('organization_id', prof.organization_id)
        .neq('status', 'cancelado')
        .gte('scheduled_at', `${parsed.fecha}T00:00:00`)
        .lte('scheduled_at', `${parsed.fecha}T23:59:59`)
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (authMatches?.length) {
        // Preferir la que coincide con la aeronave; si no, la primera del día
        const match = authMatches.find(a => a.aircraft_id === aircraft.id) ?? authMatches[0];
        missionId   = match.mission_id   ?? null;
        missionType = match.mission_type ?? missionType;
        // Solo auto-asignar piloto de la autorización si no viene del plan piloto
        if (!pilotId && match.pilot_id) pilotId = match.pilot_id;
      }
    } catch (authErr) {
      console.error('[import-dji] authorization lookup:', authErr.message);
    }

    // ── 8. Insertar vuelo ────────────────────────────────────────
    // Con ON CONFLICT DO NOTHING vía el UNIQUE constraint de la BD.
    const meta = parsed._meta ?? {};

    const flightRecord = {
      owner_id:         user.id,
      organization_id:  prof.organization_id,
      aircraft_id:      aircraft.id,
      pilot_id:         pilotId,
      flight_date:      parsed.fecha,
      takeoff_time:     parsed.hora_despegue    ?? null,
      landing_time:     parsed.hora_aterrizaje  ?? null,
      mission_id:       missionId,
      mission_type:     missionType,
      visual_condition: parsed.condicion_visual ?? 'VMC',
      location:         parsed.ubicacion        ?? null,
      notes:            parsed.notas            ?? null,
      incidents:        parsed.incidentes === 'SI',
      imported:         true,
      has_alerts:       hasAlerts,
      alerts_json:      alerts,
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('flights')
      .insert([flightRecord])
      .select('id')
      .single();

    // Código 23505 = unique_violation → vuelo ya existía (duplicado)
    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({
          error: 'Este vuelo ya fue importado anteriormente (misma aeronave, fecha y hora de despegue).',
          file:  fileName,
        }, { status: 409 });
      }
      throw insertErr;
    }

    // ── 9. Actualizar horas totales con incremento atómico (RPC SQL) ──
    if (meta.duracion_s && meta.duracion_s > 0) {
      const addedHours = parseFloat((meta.duracion_s / 3600).toFixed(4));
      await supabaseAdmin.rpc('increment_aircraft_hours', {
        p_id:    aircraft.id,
        p_hours: addedHours,
      });
    }

    // ── 10. Batería: actualizar ciclos o crear automáticamente ───────
    // Todo server-side con supabaseAdmin — no depende del rol del usuario.
    let bateria_actualizada  = null;
    let battery_auto_created = false;

    if (meta.serial_bateria && meta.ciclos_bateria != null) {
      const { data: bat } = await supabaseAdmin
        .from('batteries')
        .select('id, serial_number, cycles')
        .eq('organization_id', prof.organization_id)
        .ilike('serial_number', meta.serial_bateria)
        .maybeSingle();

      if (bat) {
        // Batería ya registrada — actualizar ciclos si es mayor
        const newCycles = Math.max(meta.ciclos_bateria, bat.cycles ?? 0);
        if (newCycles > (bat.cycles ?? 0)) {
          await supabaseAdmin
            .from('batteries')
            .update({ cycles: newCycles })
            .eq('id', bat.id);
        }
        bateria_actualizada = {
          serial:            bat.serial_number,
          ciclos_anteriores: bat.cycles ?? 0,
          ciclos_nuevos:     newCycles,
        };
      } else {
        // Batería no registrada → crear automáticamente si el plan lo permite
        const { count: batCount } = await supabaseAdmin
          .from('batteries')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', prof.organization_id);

        if (canAddResource(prof.subscription_plan, batCount ?? 0, 'battery')) {
          const { error: batInsertErr } = await supabaseAdmin
            .from('batteries')
            .insert([{
              owner_id:        user.id,
              organization_id: prof.organization_id,
              brand:           'DJI',
              model:           meta.modelo_bateria ?? '',
              serial_number:   meta.serial_bateria.trim().toUpperCase(),
              cycles:          meta.ciclos_bateria ?? 0,
              health_status:   100,
              status:          'Operativo',
            }]);

          if (!batInsertErr) {
            battery_auto_created = true;
            bateria_actualizada  = {
              serial:        meta.serial_bateria,
              ciclos_nuevos: meta.ciclos_bateria,
              created:       true,
            };
          } else {
            console.error('[import-dji] battery auto-create:', batInsertErr.message);
          }
        }
      }
    }

    // ── 11. Generar y guardar replay automáticamente ─────────────
    // Build telemetry → Node.js gzip → Supabase Storage, con enforcement de cuota.
    let replayPath = null;
    if (frames.length > 0) {
      try {
        const telemetry = buildTelemetry(frames);
        const path      = buildPath(frames);
        const replayMeta = buildMeta(frames, meta, alerts);
        const payload   = JSON.stringify({ path, telemetry, alerts, meta: replayMeta });
        const { gzipSync } = await import('zlib');
        const gzipped   = gzipSync(Buffer.from(payload));

        if (gzipped.length <= MAX_REPLAY) {
          // Enforcement de cuota (igual que POST /api/flights/[id]/replay)
          const quota = await getOrgReplayQuota(supabaseAdmin, prof.organization_id);
          if (quota.maxFlights > 0) {
            const { count } = await supabaseAdmin
              .from('flights')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', prof.organization_id)
              .not('replay_path', 'is', null)
              .neq('id', inserted.id);

            if ((count ?? 0) >= quota.maxFlights) {
              const { data: oldest } = await supabaseAdmin
                .from('flights')
                .select('id, replay_path')
                .eq('organization_id', prof.organization_id)
                .not('replay_path', 'is', null)
                .neq('id', inserted.id)
                .order('flight_date', { ascending: true })
                .limit(1)
                .single();

              if (oldest?.replay_path) {
                await supabaseAdmin.storage.from(BUCKET).remove([oldest.replay_path]);
                await supabaseAdmin.from('flights')
                  .update({ replay_path: null })
                  .eq('id', oldest.id);
              }
            }
          }

          replayPath = `orgs/${prof.organization_id}/replays/${inserted.id}.json.gz`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(replayPath, gzipped, {
              contentType:  'application/gzip',
              upsert:       true,
              cacheControl: '3600',
            });

          if (uploadErr) {
            console.error('[import-dji] replay upload:', uploadErr.message);
            replayPath = null;
          } else {
            await supabaseAdmin.from('flights')
              .update({ replay_path: replayPath })
              .eq('id', inserted.id);
          }
        }
      } catch (replayErr) {
        console.error('[import-dji] replay build:', replayErr.message);
      }
    }

    // ── 12. Respuesta ─────────────────────────────────────────────
    return NextResponse.json({
      success:             true,
      file:                fileName,
      message:             `Vuelo del ${parsed.fecha} importado correctamente.`,
      fecha:               parsed.fecha,
      serial:              parsed.serial_aeronave,
      duracion:            meta.duracion_s     ?? null,
      altMax:              meta.altitud_max_m  ?? null,
      bateria_actualizada,
      battery_auto_created,
      has_alerts:          hasAlerts,
      alerts_count:        alerts.length,
      mission_auto:        missionId ? true : false,
      pilot_auto:          pilotId   ? true : false,
      replay_auto:         replayPath ? true : false,
    });

  } catch (err) {
    console.error('[import-dji]', err.message);
    return NextResponse.json({ error: 'Error interno al procesar el archivo' }, { status: 500 });
  }
}
