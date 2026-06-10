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
    // daily: amanecer y atardecer para los próximos 7 días
    url.searchParams.set('daily', 'sunrise,sunset,daylight_duration');
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    // ── NOAA Kp index (actividad solar) ───────────────────────────────────────
    // Endpoint público NOAA — sin API key — actualizado cada 15 min
    // Formato: [[datetime, Kp, observed/estimated/predicted, noaa_scale], ...]
    const [weatherRes, kpRes] = await Promise.all([
      fetch(url.toString(), { next: { revalidate: 1800 } }),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        next: { revalidate: 900 }, // cache 15 min — NOAA actualiza cada 15 min
      }),
    ]);

    if (!weatherRes.ok) throw new Error(`Open-Meteo respondió ${weatherRes.status}`);

    const weatherData = await weatherRes.json();

    // Parsear Kp: el array tiene cabecera como primera fila, luego datos
    let kpCurrent = null;
    let kpForecast = [];
    if (kpRes.ok) {
      const kpRaw = await kpRes.json();
      // kpRaw[0] = cabecera ["time_tag", "kp", "observed", "noaa_scale"]
      // kpRaw[1..] = datos, más reciente al final
      const rows = kpRaw.slice(1).filter(r => r[1] !== null);
      if (rows.length) {
        const last = rows[rows.length - 1];
        kpCurrent = {
          time: last[0],
          kp: parseFloat(last[1]),
          status: last[2], // 'observed' | 'estimated' | 'predicted'
          scale: last[3],  // 'G0'-'G5' o null
        };
        // Últimas 8 lecturas para mini-gráfica (3h cada una = 24h)
        kpForecast = rows.slice(-8).map(r => ({
          time: r[0],
          kp: parseFloat(r[1]),
          status: r[2],
        }));
      }
    }

    return NextResponse.json({
      ...weatherData,
      kp: { current: kpCurrent, forecast: kpForecast },
    });
  } catch (err) {
    console.error('[weather-dev]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
