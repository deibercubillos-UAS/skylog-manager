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
import { parseDjiTxtBuffer, errorText } from '@/lib/djiParser';
import { signFlightImport } from '@/lib/v2/flightImportToken';
import { getAuthUser } from '@/lib/v2/authUser';
import { checkRateLimit } from '@/lib/rateLimiter';
import { checkDjiImportBatch, DJI_IMPORT_LIMITS, buildTelemetryTrack } from '@skylog/domain';

// Cada log se descifra (WASM) y, si es reciente, pide sus llaves a DJI: puede tardar varios segundos. La pantalla envía un
// log por petición; este margen evita que Vercel corte el análisis a mitad.
export const maxDuration = 60;

// Replay — la serie completa del vuelo sale de `parsed._frames` (cuadros del log, que antes se descartaban tras extraer el resumen):
// posición, altura, velocidades, actitud, satélites GPS, señal del control, palancas, batería, modo de vuelo, cámara y la lista de
// eventos/alertas. Formato v2 por columnas, ~1 punto por segundo (tope 1.500), definido y probado en
// packages/domain/src/flightTelemetry.js. `t` son segundos desde el primer punto con GPS, nunca un reloj.
function buildReplayTrack(frames) {
  return buildTelemetryTrack(frames);
}

// Vuelos que cruzan medianoche: si la hora de aterrizaje es "menor" que la de
// despegue, se asume que aterrizó al día siguiente (mismo criterio ya
// documentado en Cierre de Vuelo de v1 para vuelos NIGHT reales).
function combineDateTime(fecha, hora) {
  return `${fecha}T${hora}:00`;
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // Topes (ver djiImportLimits.js): se rechaza por el encabezado ANTES de leer el cuerpo, y de nuevo con los tamaños reales.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > DJI_IMPORT_LIMITS.maxBytesPerRequest + 1024 * 1024) {
    return Response.json({ error: 'Los archivos juntos pesan demasiado. Sube menos logs por vez.' }, { status: 413 });
  }
  const form = await request.formData();
  const files = form.getAll('files').filter((f) => f && typeof f !== 'string');
  const batch = checkDjiImportBatch(files.map((f) => f.size));
  if (!batch.ok) return Response.json({ error: batch.error }, { status: batch.status });

  // Cada log gasta una llamada a DJI con la llave compartida: el ritmo se cuenta por archivo y por persona
  // (en memoria, por instancia: frena la ráfaga; el tope por petición de arriba es el que no depende de la instancia).
  for (let i = 0; i < files.length; i++) {
    if (!checkRateLimit(`dji-import:${personId}`, { limit: DJI_IMPORT_LIMITS.filesPerWindow, windowMs: DJI_IMPORT_LIMITS.windowMs }).allowed) {
      return Response.json({ error: 'Importaste muchos logs en poco tiempo. Espera unos minutos e inténtalo de nuevo.' }, { status: 429 });
    }
  }

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
      const batterySerial = parsed._meta?.serial_bateria || null;
      const batteryCycles = parsed._meta?.ciclos_bateria ?? null;
      const complete = !!(landingAt && totalTime);

      results.push({
        fileName: file.name,
        takeoffAt,
        landingAt,
        totalTime,
        aircraftModel: parsed._meta?.modelo_aeronave || null,
        batterySerial,
        batteryCycles,
        replayTrack,
        // Firma de lo leído del log: /api/flights solo trata el vuelo como importado si estos datos no cambiaron.
        importToken: complete ? signFlightImport({ personId, takeoffAt, landingAt, totalTime, batterySerial, batteryCycles }) : null,
        error: complete ? null : 'Log incompleto — revisa despegue/aterrizaje antes de confirmar',
      });
    } catch (e) {
      // Queda en los registros de Vercel para diagnosticar (sin datos del vuelo: solo tamaño y causa).
      console.error('[import-dji] no se pudo leer un log:', { bytes: file.size, error: e?.message, detail: e?.detail || errorText(e) });
      results.push({ fileName: file.name, error: (e instanceof Error && e.message) || 'No se pudo leer este log' });
    }
  }

  return Response.json({ results });
}
