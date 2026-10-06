// Skylog V2.0 — archiva el clima con el que se decidió volar. Mejor esfuerzo: si Open-Meteo no responde o la misión
// no tiene zona geolocalizada, el despacho NO se detiene (es una constancia, no una verificación) — simplemente
// no queda observación y el vuelo lo dice. Lo escribe el servidor con service role (`weather_observations` no
// tiene política de escritura). Una observación por despacho (`dispatch_id` único): reintentar no duplica.
const TIMEOUT_MS = 4000;

/** Primer punto de la geometría de la misión, o null (se necesita un lugar real; nunca se inventa uno). */
export function missionPoint(zoneGeo) {
  const p = zoneGeo?.points?.[0];
  const lat = Number(p?.lat);
  const lon = Number(p?.lng ?? p?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

export async function fetchCurrentWeather({ lat, lon }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m'].join(','));
  url.searchParams.set('hourly', 'visibility');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'America/Bogota');
  url.searchParams.set('wind_speed_unit', 'kmh');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.current) return null;
    // Visibilidad de la hora en curso (Open-Meteo solo la da por hora).
    const hourIdx = (d.hourly?.time || []).findIndex((t) => t === d.current.time?.slice(0, 13) + ':00');
    return { current: d.current, units: d.current_units, visibility_m: hourIdx >= 0 ? d.hourly.visibility?.[hourIdx] ?? null : null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Guarda la observación del despacho. Devuelve { archived, reason? } y nunca lanza. */
export async function archiveDispatchWeather(admin, { organizationId, dispatchId, missionId }) {
  try {
    const { data: mission } = await admin.from('missions').select('zone_geo').eq('id', missionId).maybeSingle();
    const point = missionPoint(mission?.zone_geo);
    if (!point) return { archived: false, reason: 'sin_zona_geolocalizada' };
    const snapshot = await fetchCurrentWeather(point);
    if (!snapshot) return { archived: false, reason: 'servicio_no_disponible' };
    const { error } = await admin.from('weather_observations').upsert(
      { organization_id: organizationId, dispatch_id: dispatchId, lat: point.lat, lon: point.lon, observed_at: new Date().toISOString(), source: 'open-meteo', payload: snapshot },
      { onConflict: 'dispatch_id', ignoreDuplicates: true }
    );
    if (error) return { archived: false, reason: 'no_se_pudo_guardar' };
    return { archived: true };
  } catch {
    return { archived: false, reason: 'error' };
  }
}

/** Enlaza la observación del despacho al vuelo recién cerrado. Mejor esfuerzo. */
export async function linkFlightWeather(admin, { dispatchId, flightId }) {
  try {
    const { data: obs } = await admin.from('weather_observations').select('id').eq('dispatch_id', dispatchId).maybeSingle();
    if (!obs) return false;
    const { error } = await admin.from('flights').update({ weather_observation_id: obs.id }).eq('id', flightId);
    return !error;
  } catch {
    return false;
  }
}
