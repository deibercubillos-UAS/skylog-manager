import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// WMO codes → label + icon (subset suficiente para el widget)
const WMO = {
  0: { label: 'Despejado', icon: 'sunny' },
  1: { label: 'Mayormente despejado', icon: 'partly_cloudy_day' },
  2: { label: 'Parcialmente nublado', icon: 'partly_cloudy_day' },
  3: { label: 'Nublado', icon: 'cloud' },
  45: { label: 'Niebla', icon: 'foggy' },
  48: { label: 'Niebla', icon: 'foggy' },
  51: { label: 'Llovizna leve', icon: 'grain' },
  53: { label: 'Llovizna moderada', icon: 'grain' },
  55: { label: 'Llovizna intensa', icon: 'grain' },
  61: { label: 'Lluvia leve', icon: 'rainy' },
  63: { label: 'Lluvia moderada', icon: 'rainy' },
  65: { label: 'Lluvia intensa', icon: 'rainy' },
  80: { label: 'Chubascos leves', icon: 'rainy' },
  81: { label: 'Chubascos moderados', icon: 'rainy' },
  82: { label: 'Chubascos intensos', icon: 'thunderstorm' },
  95: { label: 'Tormenta', icon: 'thunderstorm' },
  99: { label: 'Tormenta con granizo', icon: 'thunderstorm' },
};

// Umbrales RAC 100 por defecto (sin nubosidad)
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

// GET /api/weather/current?lat=4.71&lon=-74.07
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '4.7110');
    const lon = parseFloat(searchParams.get('lon') || '-74.0721');
    if (isNaN(lat) || isNaN(lon))
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });

    // ── Open-Meteo — solo lo que necesita el widget ───────────────────────────
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('hourly', [
      'temperature_2m', 'windspeed_10m', 'windgusts_10m', 'visibility',
      'precipitation', 'precipitation_probability',
      'relativehumidity_2m', 'weathercode',
    ].join(','));
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    // ── NOAA Kp (solo el valor más reciente) ──────────────────────────────────
    // allSettled (no all): NOAA es intermitente y el Kp es opcional (ver más abajo) —
    // si su fetch falla a nivel de red, no debe tumbar el endpoint completo. Solo
    // Open-Meteo es crítico.
    const [weatherResult, kpResult] = await Promise.allSettled([
      fetch(url.toString(), { next: { revalidate: 1800 } }),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        next: { revalidate: 900 },
      }),
    ]);

    if (weatherResult.status !== 'fulfilled') {
      throw new Error(`Open-Meteo no disponible: ${weatherResult.reason?.message || weatherResult.reason}`);
    }
    const weatherRes = weatherResult.value;
    if (!weatherRes.ok) throw new Error(`Open-Meteo ${weatherRes.status}`);
    const wd = await weatherRes.json();

    // Índice de hora actual
    const now = new Date();
    const hours = (wd.hourly?.time ?? []).map(t => new Date(t));
    const futureIdx = hours.findIndex(h => h > now);
    const idx = futureIdx > 0 ? futureIdx - 1 : Math.max(0, hours.length - 1);

    const h = wd.hourly;
    const windspeed  = wd.current_weather?.windspeed ?? 0;
    const gusts      = h.windgusts_10m?.[idx] ?? 0;
    const visibility = h.visibility?.[idx] ?? 10000;
    const precip     = h.precipitation?.[idx] ?? 0;
    const precipProb = h.precipitation_probability?.[idx] ?? 0;
    const humidity   = h.relativehumidity_2m?.[idx] ?? null;
    const wcode      = h.weathercode?.[idx] ?? wd.current_weather?.weathercode ?? 0;

    // Kp actual — opcional; kpResult puede haber quedado 'rejected' arriba sin afectar el resto
    let kpVal = null;
    if (kpResult.status === 'fulfilled' && kpResult.value.ok) {
      try {
        const raw = await kpResult.value.json();
        const rows = (Array.isArray(raw[0]) && isNaN(parseFloat(raw[0][1]))) ? raw.slice(1) : raw;
        const parsed = rows.map(r => {
          const kp = parseFloat(Array.isArray(r) ? r[1] : (r.kp ?? r.Kp));
          return isNaN(kp) ? null : { time: Array.isArray(r) ? r[0] : r.time_tag, kp };
        }).filter(Boolean);
        const past = parsed.filter(r => new Date(String(r.time).replace(' ', 'T')) <= now);
        if (past.length) kpVal = past[past.length - 1].kp;
      } catch { /* Kp opcional */ }
    }

    // Score e issues
    const score = calcScore(windspeed, gusts, visibility, precip, precipProb, kpVal);
    const issues = [];
    if (windspeed > THR.windSpeed)   issues.push(`Viento ${windspeed} km/h (máx ${THR.windSpeed})`);
    if (gusts > THR.windGusts)       issues.push(`Ráfagas ${gusts} km/h (máx ${THR.windGusts})`);
    if (visibility < THR.visibility) issues.push(`Visibilidad ${(visibility/1000).toFixed(1)} km`);
    if (precip > THR.precipitation)  issues.push(`Lluvia ${precip} mm/h`);

    const wmo = WMO[wcode] ?? { label: `Código ${wcode}`, icon: 'question_mark' };

    // Pronóstico horario del resto del día (mismos datos ya obtenidos de Open-Meteo,
    // sin llamadas adicionales). Kp se asume constante para las próximas horas —
    // no hay pronóstico horario de Kp sin una llamada NOAA extra.
    const HOURS_AHEAD = 8;
    const todayHourly = hours.slice(idx, idx + HOURS_AHEAD).map((d, i) => {
      const j = idx + i;
      const hWs      = h.windspeed_10m?.[j] ?? 0;
      const hGusts   = h.windgusts_10m?.[j] ?? 0;
      const hVis     = h.visibility?.[j] ?? 10000;
      const hPrecip  = h.precipitation?.[j] ?? 0;
      const hCode    = h.weathercode?.[j] ?? 0;
      const hIssue   = hWs > THR.windSpeed || hGusts > THR.windGusts || hVis < THR.visibility || hPrecip > THR.precipitation;
      const hScore   = calcScore(hWs, hGusts, hVis, hPrecip, h.precipitation_probability?.[j] ?? 0, kpVal);
      const hWmo     = WMO[hCode] ?? { label: `Código ${hCode}`, icon: 'question_mark' };
      return {
        time: d.toISOString().slice(11, 16),
        temperature: h.temperature_2m?.[j] ?? null,
        windspeed: hWs,
        icon: hWmo.icon,
        go: !hIssue ? 'GO' : (hScore >= 50 ? 'Precaución' : 'NO-GO'),
      };
    });

    return NextResponse.json({
      score,
      canFly: issues.length === 0,
      issues,
      current: {
        windspeed,
        winddirection: wd.current_weather?.winddirection ?? null,
        temperature:   wd.current_weather?.temperature ?? null,
        weathercode: wcode,
        label: wmo.label,
        icon:  wmo.icon,
      },
      hourly: { gusts, visibility, precipitation: precip, precipitationProbability: precipProb, humidity },
      todayHourly,
      kp: kpVal,
      coords: { lat, lon },
      dataTime: wd.hourly?.time?.[idx] ?? null,
    });
  } catch (err) {
    // err.cause trae el detalle real de undici (ECONNRESET/ENOTFOUND/etc.) —
    // err.message solo dice "fetch failed", inútil para diagnosticar en logs.
    console.error('[weather/current]', err.message, err.cause ? String(err.cause) : '');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
