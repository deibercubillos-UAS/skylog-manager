import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dev/parse-flight-path
 *
 * Recibe un archivo .txt de log DJI (multipart, campo "file").
 * Devuelve la traza GPS completa + telemetría frame a frame para visualización.
 *
 * Solo disponible para admin/superadmin — pestaña de desarrollo.
 */
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // ── Leer archivo ────────────────────────────────────────────────
    const formData = await request.formData();
    const file     = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 100 MB)' }, { status: 413 });
    }

    // ── Parsear con dji-log-parser-js ───────────────────────────────
    const DJI_API_KEY = process.env.DJI_API_KEY ?? null;

    const { DJILog } = await import('dji-log-parser-js');
    const parser = new DJILog(buf);

    if (parser.version === 0) {
      return NextResponse.json(
        { error: 'El archivo no es un log DJI válido o el formato no está soportado.' },
        { status: 422 }
      );
    }

    let frames = [];
    let keychainError = null;

    // Intentar con API key primero; si no hay key, intentar sin cifrado (logs v1-v2 abiertos)
    if (DJI_API_KEY) {
      try {
        const keychains = await parser.fetchKeychains(DJI_API_KEY);
        frames = parser.frames(keychains) ?? [];
      } catch (e) {
        keychainError = e.message;
        // Fallback: intentar sin keychains (versiones antiguas sin cifrado)
        try { frames = parser.frames() ?? []; } catch { frames = []; }
      }
    } else {
      // Sin API key → intentar parsear de todas formas (logs DJI Go v1/v2 no cifrados)
      try { frames = parser.frames() ?? []; } catch { frames = []; }
    }

    if (frames.length === 0) {
      return NextResponse.json({
        error: keychainError
          ? `No se pudo descifrar el archivo. ${DJI_API_KEY ? 'Verifica que el DJI_API_KEY sea válido.' : 'Configura DJI_API_KEY en las variables de entorno de Vercel.'}`
          : 'El archivo no contiene frames de vuelo.',
        hint: !DJI_API_KEY ? 'missing_api_key' : undefined,
      }, { status: 422 });
    }

    // ── Extraer traza GPS ────────────────────────────────────────────
    // Muestrear: max 2000 puntos para no saturar el mapa (reducción proporcional)
    const MAX_POINTS = 2000;
    const gpsFrames = frames.filter(f =>
      f.osd?.latitude  && Math.abs(f.osd.latitude)  <= 90  && f.osd.latitude  !== 0 &&
      f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
    );

    const step = gpsFrames.length > MAX_POINTS
      ? Math.floor(gpsFrames.length / MAX_POINTS)
      : 1;

    const path = [];
    for (let i = 0; i < gpsFrames.length; i += step) {
      const f   = gpsFrames[i];
      const osd = f.osd;
      path.push({
        lat:     osd.latitude,
        lng:     osd.longitude,
        alt:     osd.height     ?? osd.altitude   ?? 0,   // metros sobre suelo / despegue
        speed:   osd.speed      ?? osd.hSpeed      ?? 0,  // m/s
        bat:     f.battery?.chargeLevel ?? null,           // %
        satNum:  osd.gpsNum     ?? null,
        t:       f.custom?.dateTime ?? null,               // timestamp ISO string
        mode:    osd.flightAction ?? osd.modeChannel ?? null,
      });
    }

    // ── Metadatos del vuelo ──────────────────────────────────────────
    const details  = parser.details ?? {};
    const records  = (() => { try { return parser.records() ?? []; } catch { return []; } })();
    const recoverRec = records.find(r => r.type === 'Recover')?.content ?? {};

    const altValues   = gpsFrames.map(f => f.osd?.height ?? 0).filter(Boolean);
    const speedValues = gpsFrames.map(f => f.osd?.speed ?? f.osd?.hSpeed ?? 0).filter(Boolean);

    const meta = {
      version:        parser.version,
      totalFrames:    frames.length,
      gpsFrames:      gpsFrames.length,
      pathPoints:     path.length,
      samplingStep:   step,
      serial:         details.aircraftSn ?? recoverRec.aircraftSn ?? null,
      model:          details.subType   ?? details.productType   ?? null,
      startTime:      details.startTime ?? null,
      durationS:      details.totalTime ?? null,
      altMax:         altValues.length   ? Math.max(...altValues)               : null,
      altAvg:         altValues.length   ? altValues.reduce((a,b)=>a+b,0)/altValues.length : null,
      speedMax:       speedValues.length ? Math.max(...speedValues)             : null,
      speedAvg:       speedValues.length ? speedValues.reduce((a,b)=>a+b,0)/speedValues.length : null,
      distanceM:      calcDistance(gpsFrames),
      batStart:       gpsFrames[0]?.battery?.chargeLevel ?? null,
      batEnd:         gpsFrames[gpsFrames.length-1]?.battery?.chargeLevel ?? null,
      missingApiKey:  !DJI_API_KEY,
    };

    return NextResponse.json({ path, meta }, { status: 200 });

  } catch (err) {
    console.error('[dev/parse-flight-path]', err.message);
    return NextResponse.json({ error: 'Error procesando el archivo.' }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Distancia total del vuelo en metros (suma de segmentos haversine) */
function calcDistance(frames) {
  let total = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i-1].osd;
    const b = frames[i].osd;
    if (!a?.latitude || !b?.latitude) continue;
    total += haversineM(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return Math.round(total);
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R  = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dLat/2)**2 +
             Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
