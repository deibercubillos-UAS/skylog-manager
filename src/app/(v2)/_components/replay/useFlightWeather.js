'use client';

// Clima de la fecha y hora del vuelo, por hora, desde Open-Meteo (sin llave). Para vuelos de los últimos ~90 días se usa el
// pronóstico con datos pasados (trae visibilidad); para los más antiguos, el archivo histórico. Son valores MODELADOS para
// el punto del vuelo, no una medición en el sitio. Colombia no tiene horario de verano: hora local = UTC−5.
import { useEffect, useMemo, useState } from 'react';

const HOURLY = 'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,weather_code';
const localDay = (ms) => new Date(ms - 5 * 3600e3).toISOString().slice(0, 10);
const localHour = (ms) => `${new Date(ms - 5 * 3600e3).toISOString().slice(0, 13)}:00`;

export function useFlightWeather({ lat, lng, takeoffAt, durationS }) {
  const [state, setState] = useState({ status: 'loading', hourly: null });
  const takeoffMs = takeoffAt ? Date.parse(takeoffAt) : NaN;

  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(takeoffMs)) { setState({ status: 'error', hourly: null }); return undefined; }
    const ctrl = new AbortController();
    const recent = Date.now() - takeoffMs < 85 * 86400e3;
    const base = recent ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive';
    const fields = recent ? `${HOURLY},visibility` : HOURLY;
    const url = `${base}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=${fields}&wind_speed_unit=ms&timezone=America%2FBogota&start_date=${localDay(takeoffMs)}&end_date=${localDay(takeoffMs + (durationS || 0) * 1000)}`;
    setState({ status: 'loading', hourly: null });
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('clima'))))
      .then((d) => setState(d?.hourly?.time?.length ? { status: 'ready', hourly: d.hourly } : { status: 'error', hourly: null }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ status: 'error', hourly: null }); });
    return () => ctrl.abort();
  }, [lat, lng, takeoffMs, durationS]);

  const index = useMemo(() => (state.hourly ? new Map(state.hourly.time.map((t, i) => [t, i])) : null), [state.hourly]);
  /** Clima de la hora en que va el replay (t = segundos desde el inicio). */
  const at = (t) => {
    if (!state.hourly || !index) return null;
    const i = index.get(localHour(takeoffMs + t * 1000));
    if (i == null) return null;
    const h = state.hourly;
    const pick = (k) => (h[k] ? h[k][i] : null);
    return { time: h.time[i], temp: pick('temperature_2m'), humidity: pick('relative_humidity_2m'), rain: pick('precipitation'), cloud: pick('cloud_cover'), wind: pick('wind_speed_10m'), gust: pick('wind_gusts_10m'), windDir: pick('wind_direction_10m'), pressure: pick('pressure_msl'), code: pick('weather_code'), visibility: pick('visibility') };
  };
  return { status: state.status, at, dateLabel: Number.isNaN(takeoffMs) ? '' : localDay(takeoffMs) };
}
