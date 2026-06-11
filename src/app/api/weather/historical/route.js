import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WMO = {
  0:  { label: 'Despejado',             icon: 'sunny' },
  1:  { label: 'Mayormente despejado',  icon: 'partly_cloudy_day' },
  2:  { label: 'Parcialmente nublado',  icon: 'partly_cloudy_day' },
  3:  { label: 'Nublado',               icon: 'cloud' },
  45: { label: 'Niebla',                icon: 'foggy' },
  48: { label: 'Niebla',                icon: 'foggy' },
  51: { label: 'Llovizna leve',         icon: 'grain' },
  53: { label: 'Llovizna moderada',     icon: 'grain' },
  55: { label: 'Llovizna intensa',      icon: 'grain' },
  61: { label: 'Lluvia leve',           icon: 'rainy' },
  63: { label: 'Lluvia moderada',       icon: 'rainy' },
  65: { label: 'Lluvia intensa',        icon: 'rainy' },
  80: { label: 'Chubascos leves',       icon: 'rainy' },
  81: { label: 'Chubascos moderados',   icon: 'rainy' },
  82: { label: 'Chubascos intensos',    icon: 'thunderstorm' },
  95: { label: 'Tormenta',             icon: 'thunderstorm' },
  99: { label: 'Tormenta con granizo', icon: 'thunderstorm' },
};

const THR = { windSpeed: 25, windGusts: 35, visibility: 5000, precipitation: 0.1 };

function calcScore(windspeed, gusts, visibility, precipitation, precipProb, kpVal) {
  const s = v => Math.max(0, Math.min(100, v));
  const wind    = s(100 - (windspeed / 25) * 100);
  const gust    = s(100 - (gusts / 35) * 100);
  const vis     = s((visibility / 10000) * 100);
  const precip  = precipitation <= 0.1 ? 100 : s(100 - ((precipitation - 0.1) / 2) * 100);
  const precipP = s(100 - precipProb);
  const kp      = kpVal != null ? s(100 - (kpVal / 6) * 100) : 80;
  return Math.round(wind*0.30 + gust*0.22 + vis*0.22 + precip*0.16 + precipP*0.05 + kp*0.05);
}

// GET /api/weather/historical?lat=4.71&lon=-74.07&date=2026-05-14&hour=10
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lat  = parseFloat(searchParams.get('lat'));
    const lon  = parseFloat(searchParams.get('lon'));
    const date = searchParams.get('date'); // YYYY-MM-DD
    const hour = parseInt(searchParams.get('hour') ?? '0', 10);

    if (isNaN(lat) || isNaN(lon))
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: 'Fecha inválida — formato YYYY-MM-DD' }, { status: 400 });
    if (isNaN(hour) || hour < 0 || hour > 23)
      return NextResponse.json({ error: 'Hora inválida (0-23)' }, { status: 400 });

    // Open-Meteo Archive — datos históricos (desde 1940, gratis, sin API key)
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude',   lat);
    url.searchParams.set('longitude',  lon);
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date',   date);
    url.searchParams.set('hourly', [
      'windspeed_10m', 'windgusts_10m', 'visibility',
      'precipitation', 'precipitation_probability',
      'relativehumidity_2m', 'weathercode', 'temperature_2m',
      'winddirection_10m',
    ].join(','));
    url.searchParams.set('timezone',       'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } }); // datos del pasado no cambian
    if (!res.ok) throw new Error(`Open-Meteo Archive ${res.status}`);
    const wd = await res.json();

    const h   = wd.hourly;
    const idx = Math.min(hour, (h?.time?.length ?? 1) - 1);

    const windspeed  = h.windspeed_10m?.[idx]   ?? 0;
    const winddirRaw = h.winddirection_10m?.[idx] ?? null;
    const gusts      = h.windgusts_10m?.[idx]   ?? 0;
    const visibility = h.visibility?.[idx]       ?? 10000;
    const precip     = h.precipitation?.[idx]    ?? 0;
    const precipProb = h.precipitation_probability?.[idx] ?? 0;
    const humidity   = h.relativehumidity_2m?.[idx] ?? null;
    const wcode      = h.weathercode?.[idx]      ?? 0;
    const temperature = h.temperature_2m?.[idx]  ?? null;

    const score  = calcScore(windspeed, gusts, visibility, precip, precipProb, null);
    const issues = [];
    if (windspeed > THR.windSpeed)   issues.push(`Viento ${windspeed} km/h (máx ${THR.windSpeed})`);
    if (gusts > THR.windGusts)       issues.push(`Ráfagas ${gusts} km/h (máx ${THR.windGusts})`);
    if (visibility < THR.visibility) issues.push(`Visibilidad ${(visibility/1000).toFixed(1)} km`);
    if (precip > THR.precipitation)  issues.push(`Lluvia ${precip} mm/h`);

    const wmo = WMO[wcode] ?? { label: `Código ${wcode}`, icon: 'question_mark' };

    return NextResponse.json({
      score,
      canFly: issues.length === 0,
      issues,
      historical: true,
      flightDate: date,
      flightHour: hour,
      current: {
        windspeed,
        winddirection: winddirRaw,
        temperature,
        weathercode: wcode,
        label: wmo.label,
        icon:  wmo.icon,
      },
      hourly: { gusts, visibility, precipitation: precip, precipitationProbability: precipProb, humidity },
      kp:     null, // Kp histórico no disponible para fechas > 7 días; se puede extender
      coords: { lat, lon },
      dataTime: h.time?.[idx] ?? null,
    });
  } catch (err) {
    console.error('[weather/historical]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
