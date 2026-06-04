import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { parseDjiTxtBuffer } from '@/lib/djiParser';

export const dynamic = 'force-dynamic';

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

export async function POST(request) {
  try {
    // ── 1. Autenticar ────────────────────────────────────────────
    const supabaseUser = await createClientSSR();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: prof } = await supabaseUser
      .from('profiles')
      .select('organization_id, role')
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

    // ── 4. Buscar aeronave por serial ────────────────────────────
    const supabaseAdmin = createAdminClient();

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

    // ── 5. Insertar vuelo con ON CONFLICT DO NOTHING (idempotente + atómico)
    //    El UNIQUE constraint (org, aircraft, date, takeoff_time) en la BD
    //    garantiza que imports concurrentes no generan duplicados.
    const meta = parsed._meta ?? {};

    const flightRecord = {
      owner_id:         user.id,
      organization_id:  prof.organization_id,
      aircraft_id:      aircraft.id,
      flight_date:      parsed.fecha,
      takeoff_time:     parsed.hora_despegue    ?? null,
      landing_time:     parsed.hora_aterrizaje  ?? null,
      mission_type:     parsed.tipo_mision      ?? null,
      visual_condition: parsed.condicion_visual ?? 'VMC',
      location:         parsed.ubicacion        ?? null,
      notes:            parsed.notas            ?? null,
      incidents:        parsed.incidentes === 'SI',
      imported:         true,
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

    // ── 6. Actualizar horas totales con incremento atómico (RPC SQL)
    //    Evita race condition de read-calculate-write en imports paralelos.
    if (meta.duracion_s && meta.duracion_s > 0) {
      const addedHours = parseFloat((meta.duracion_s / 3600).toFixed(4));
      await supabaseAdmin.rpc('increment_aircraft_hours', {
        p_id:    aircraft.id,
        p_hours: addedHours,
      });
    }

    // ── 8. Actualizar ciclos de batería ──────────────────────────
    let bateria_actualizada = null;
    if (meta.serial_bateria && meta.ciclos_bateria != null) {
      const { data: bat } = await supabaseAdmin
        .from('batteries')
        .select('id, serial_number, cycles')
        .eq('organization_id', prof.organization_id)
        .ilike('serial_number', meta.serial_bateria)
        .maybeSingle();

      if (bat) {
        const newCycles = Math.max(meta.ciclos_bateria, bat.cycles ?? 0);
        if (newCycles > (bat.cycles ?? 0)) {
          await supabaseAdmin
            .from('batteries')
            .update({ cycles: newCycles })
            .eq('id', bat.id);
        }
        bateria_actualizada = {
          serial: bat.serial_number,
          ciclos_anteriores: bat.cycles ?? 0,
          ciclos_nuevos:     newCycles,
        };
      }
    }

    // ── 9. Respuesta ─────────────────────────────────────────────
    return NextResponse.json({
      success:             true,
      file:                fileName,
      message:             `Vuelo del ${parsed.fecha} importado correctamente.`,
      fecha:               parsed.fecha,
      serial:              parsed.serial_aeronave,
      duracion:            meta.duracion_s     ?? null,
      altMax:              meta.altitud_max_m  ?? null,
      bateria_actualizada,
    });

  } catch (err) {
    console.error('[import-dji]', err.message);
    return NextResponse.json({ error: 'Error interno al procesar el archivo' }, { status: 500 });
  }
}
