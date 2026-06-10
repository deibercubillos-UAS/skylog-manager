import { createAdminClient, createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/master/weather-dev?lat=4.71&lon=-74.07
// Proxy hacia Open-Meteo + NOAA Kp — solo superadmin
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '4.7110');
    const lon = parseFloat(searchParams.get('lon') || '-74.0721');

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    }

    // ── Open-Meteo (hourly + daily para sunrise/sunset) ───────────────────────
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('hourly', [
      'temperature_2m',
      'relativehumidity_2m',
      'precipitation_probability',
      'precipitation',
      'cloudcover',
      'visibility',
      'windspeed_10m',
      'windspeed_80m',
      'windspeed_120m',
      'windspeed_180m',
      'winddirection_10m',
      'winddirection_80m',
      'windgusts_10m',
      'weathercode',
    ].join(','));
    // daily: resumen por día para vista semanal
    url.searchParams.set('daily', [
      'sunrise', 'sunset', 'daylight_duration',
      'weather_code',
      'temperature_2m_max', 'temperature_2m_min',
      'wind_speed_10m_max', 'wind_gusts_10m_max',
      'precipitation_sum', 'precipitation_probability_max',
    ].join(','));
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    // ── NOAA Kp index (actividad solar) ───────────────────────────────────────
    // forecast endpoint: observado (7d pasados) + estimado + predicho (3d futuros)
    // NOAA cambió el formato de arrays a objetos con keys nombrados:
    //   {time_tag, kp, observed_kp, noaa_kp}  ← forecast endpoint
    //   {time_tag, Kp, a_running, station_count} ← historical endpoint
    // Usamos el forecast porque incluye predicciones de los próximos 3 días.
    const [weatherRes, kpRes] = await Promise.all([
      fetch(url.toString(), { next: { revalidate: 1800 } }),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        next: { revalidate: 900 },
      }),
    ]);

    if (!weatherRes.ok) throw new Error(`Open-Meteo respondió ${weatherRes.status}`);

    const weatherData = await weatherRes.json();

    // Parsear Kp — soporta tanto arrays (formato viejo) como objetos (formato nuevo)
    function parseKpRow(r) {
      if (Array.isArray(r)) {
        // formato array: [time_tag, kp, status, noaa_scale]
        const kp = parseFloat(r[1]);
        return isNaN(kp) ? null : { time: r[0], kp, status: r[2] ?? null };
      }
      // formato objeto: {time_tag, kp, observed_kp, noaa_kp}
      const kp = parseFloat(r.kp ?? r.Kp);
      if (isNaN(kp)) return null;
      const status = r.observed_kp ?? (r.noaa_kp ? 'predicted' : 'observed');
      return { time: r.time_tag, kp, status };
    }

    let kpCurrent = null;
    let kpHistory = [];   // últimas 8 lecturas (24h observadas)
    let kpForecast = [];  // próximas 8 lecturas (24h predichas)

    if (kpRes.ok) {
      const kpRaw = await kpRes.json();
      // Si el primer elemento es cabecera (array de strings), descartarlo
      const rows = (Array.isArray(kpRaw[0]) && typeof kpRaw[0][0] === 'string' && isNaN(parseFloat(kpRaw[0][1])))
        ? kpRaw.slice(1)
        : kpRaw;

      const parsed = rows.map(parseKpRow).filter(Boolean);
      const now = new Date();

      const past   = parsed.filter(r => new Date(r.time.replace(' ', 'T')) <= now);
      const future = parsed.filter(r => new Date(r.time.replace(' ', 'T')) >  now);

      if (past.length) {
        kpCurrent = past[past.length - 1];
        kpHistory = past.slice(-8); // últimas 24h observadas
      }
      kpForecast = future.slice(0, 8); // próximas 24h predichas
    }

    return NextResponse.json({
      ...weatherData,
      kp: { current: kpCurrent, history: kpHistory, forecast: kpForecast },
    });
  } catch (err) {
    console.error('[weather-dev]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
