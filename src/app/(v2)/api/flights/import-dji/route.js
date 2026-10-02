// Skylog V2.0 — Bitácora. Carga MANUAL de logs DJI (.txt) — la vía real para
// controles RC / RC2, que no tienen una app compañera capaz de sincronizar
// vuelos automáticamente (a diferencia de RC Pro / RC-N3 / celular, donde
// la sincronización es automática una vez instalada la app — ver nota en
// bitacora/page.js sobre ese camino, todavía sin construir en V2).
//
// Solo PARSEA — no inserta. Reutiliza `parseDjiTxtBuffer()` de v1 tal cual
// (función pura sobre un Buffer + DJI_API_KEY, sin ninguna dependencia de
// tablas de v1) para extraer fecha/hora de despegue/aterrizaje y duración de
// cada log; el cliente revisa/ajusta condición visual y tipo de misión por
// vuelo y confirma la inserción real vía el mismo POST /api/flights que ya
// usa el formulario manual — así el chequeo de cumplimiento §100.540 (F5) se
// aplica exactamente igual a un vuelo cargado a mano o importado por log.
//
// Automatización de Flota & Equipo desde el log (a pedido explícito del
// usuario): el log DJI trae `serial_bateria` y `ciclos_bateria` reales
// (leídos del propio firmware de la batería, no inventados) — se exponen
// aquí para que `POST /api/flights` cree/actualice la batería sola al
// confirmar el vuelo, sin que el gestor tenga que crearla ni teclear ciclos
// a mano. **Los componentes (hélices/motores/ESC) NO tienen serial en el
// log DJI** — no hay dato real que automatizar ahí; su reloj de uso ya
// avanza solo porque `aircraft.total_hours` se actualiza en cada vuelo
// (Fase 1) y `usedHours()` en `/flota/baterias` lo resta de
// `installed_at_aircraft_hours` — no hace falta ninguna pieza nueva.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { parseDjiTxtBuffer } from '@/lib/djiParser';

// Replay GPS — decima `parsed._frames` (ya disponibles server-side, antes se
// descartaban tras extraer los campos resumen) a como máximo ~400 puntos con
// GPS válido, con el mismo shape de campo que ya usa el visor de v1
// (lib/djiTelemetry.js#buildTelemetry — osd.flyTime/xSpeed/ySpeed/height,
// no un campo inventado) para poder reutilizar su mapa animado
// (components/dev/FlightAnimMap) sin traducir nada: {t, lat, lng, alt,
// speed, yaw, battery}. `t` es `osd.flyTime` (segundos desde el despegue,
// ya relativo) — nunca un timestamp de reloj, que no aplica para animar.
const REPLAY_MAX_POINTS = 400;

function buildReplayTrack(frames) {
  if (!Array.isArray(frames) || !frames.length) return null;
  const withGps = frames.filter(
    (f) => f.osd?.latitude && Math.abs(f.osd.latitude) <= 90 && f.osd.latitude !== 0 && f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
  );
  if (withGps.length < 2) return null;

  const toPoint = (f) => ({
    t: f.osd.flyTime != null ? Math.round(f.osd.flyTime * 10) / 10 : null,
    lat: f.osd.latitude,
    lng: f.osd.longitude,
    alt: f.osd.height != null ? Math.round(f.osd.height * 10) / 10 : (f.osd.altitude != null ? Math.round(f.osd.altitude * 10) / 10 : null),
    speed: Math.round(Math.hypot(f.osd.xSpeed ?? 0, f.osd.ySpeed ?? 0) * 10) / 10,
    yaw: f.osd.yaw ?? null,
    battery: f.battery?.chargeLevel ?? null,
  });

  const step = Math.max(1, Math.floor(withGps.length / REPLAY_MAX_POINTS));
  const track = [];
  for (let i = 0; i < withGps.length; i += step) {
    track.push(toPoint(withGps[i]));
  }
  // Siempre cerrar con el último punto real, no un múltiplo redondo del paso.
  const last = toPoint(withGps[withGps.length - 1]);
  if (track[track.length - 1]?.t !== last.t) track.push(last);
  return track;
}

// Vuelos que cruzan medianoche: si la hora de aterrizaje es "menor" que la de
// despegue, se asume que aterrizó al día siguiente (mismo criterio ya
// documentado en Cierre de Vuelo de v1 para vuelos NIGHT reales).
function combineDateTime(fecha, hora) {
  return `${fecha}T${hora}:00`;
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const form = await request.formData();
  const files = form.getAll('files').filter((f) => f && typeof f !== 'string');
  if (!files.length) return Response.json({ error: 'Sube al menos un archivo .txt de log DJI' }, { status: 400 });

  const results = [];
  for (const file of files) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await parseDjiTxtBuffer(buf);
      if (!parsed.fecha || !parsed.hora_despegue) {
        results.push({ fileName: file.name, error: 'No se pudo leer la fecha/hora de despegue del log' });
        continue;
      }
      const takeoffAt = combineDateTime(parsed.fecha, parsed.hora_despegue);
      let landingFecha = parsed.fecha;
      if (parsed.hora_aterrizaje && parsed.hora_aterrizaje < parsed.hora_despegue) {
        const d = new Date(`${parsed.fecha}T00:00:00`);
        d.setDate(d.getDate() + 1);
        landingFecha = d.toISOString().slice(0, 10);
      }
      const landingAt = parsed.hora_aterrizaje
        ? combineDateTime(landingFecha, parsed.hora_aterrizaje)
        : null;
      const totalTime = parsed._meta?.duracion_s ? Number((parsed._meta.duracion_s / 3600).toFixed(2)) : null;
      const replayTrack = buildReplayTrack(parsed._frames);

      results.push({
        fileName: file.name,
        takeoffAt,
        landingAt,
        totalTime,
        aircraftModel: parsed._meta?.modelo_aeronave || null,
        batterySerial: parsed._meta?.serial_bateria || null,
        batteryCycles: parsed._meta?.ciclos_bateria ?? null,
        replayTrack,
        error: !landingAt || !totalTime ? 'Log incompleto — revisa despegue/aterrizaje antes de confirmar' : null,
      });
    } catch (e) {
      results.push({ fileName: file.name, error: e.message || 'No se pudo leer este log' });
    }
  }

  return Response.json({ results });
}
