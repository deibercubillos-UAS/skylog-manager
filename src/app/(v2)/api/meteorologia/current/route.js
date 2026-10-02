// Skylog V2.0 — Meteorología (Operación). Misma lógica exacta que
// `src/app/api/weather/current/route.js` (v1: Open-Meteo + NOAA Kp, score de
// vuelo, umbrales RAC 100) — solo cambia el guard de autenticación. No se
// pudo reutilizar la ruta de v1 tal cual: usa `getOrgContext()`
// (`lib/apiAuth.js`), que consulta `profiles`/`organization_members` — esas
// tablas NO existen en el esquema de V2 (identidad propia:
// people/accounts/memberships), así que la llamada fallaría con
// "relation does not exist". Aquí el guard es solo sesión autenticada
// (mismo criterio que el resto de endpoints de V2 que no dependen de una
// organización específica para responder).
//
// Ruta en `/api/meteorologia/current` (no `/api/weather/current`) para no
// colisionar con la ruta ya existente de v1 en esa misma URL — Next.js no
// permite dos route.js resolviendo el mismo path.
import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

const THR = { windSpeed: 25, windGusts: 35, visibility: 5000, precipitation: 0.1 };

function calcScore(windspeed, gusts, visibility, precipitation, precipProb, kpVal) {
  const s = (v) => Math.max(0, Math.min(100, v));
  const wind = s(100 - (windspeed / 25) * 100);
  const gust = s(100 - (gusts / 35) * 100);
  const vis = s((visibility / 10000) * 100);
  const precip = precipitation <= 0.1 ? 100 : s(100 - ((precipitation - 0.1) / 2) * 100);
  const precipP = s(100 - precipProb);
  const kp = kpVal != null ? s(100 - (kpVal / 6) * 100) : 80;
  return Math.round(wind * 0.3 + gust * 0.22 + vis * 0.22 + precip * 0.16 + precipP * 0.05 + kp * 0.05);
}

export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '4.7110');
    const lon = parseFloat(searchParams.get('lon') || '-74.0721');
    if (isNaN(lat) || isNaN(lon)) return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set(
      'hourly',
      ['temperature_2m', 'windspeed_10m', 'windgusts_10m', 'visibility', 'precipitation', 'precipitation_probability', 'relativehumidity_2m', 'weathercode'].join(',')
    );
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    const [weatherResult, kpResult] = await Promise.allSettled([
      fetch(url.toString(), { next: { revalidate: 1800 } }),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', { next: { revalidate: 900 } }),
    ]);

    if (weatherResult.status !== 'fulfilled') {
      throw new Error(`Open-Meteo no disponible: ${weatherResult.reason?.message || weatherResult.reason}`);
    }
    const weatherRes = weatherResult.value;
    if (!weatherRes.ok) throw new Error(`Open-Meteo ${weatherRes.status}`);
    const wd = await weatherRes.json();

    const now = new Date();
    const hours = (wd.hourly?.time ?? []).map((t) => new Date(t));
    const futureIdx = hours.findIndex((h) => h > now);
    const idx = futureIdx > 0 ? futureIdx - 1 : Math.max(0, hours.length - 1);

    const h = wd.hourly;
    const windspeed = wd.current_weather?.windspeed ?? 0;
    const gusts = h.windgusts_10m?.[idx] ?? 0;
    const visibility = h.visibility?.[idx] ?? 10000;
    const precip = h.precipitation?.[idx] ?? 0;
    const precipProb = h.precipitation_probability?.[idx] ?? 0;
    const humidity = h.relativehumidity_2m?.[idx] ?? null;
    const wcode = h.weathercode?.[idx] ?? wd.current_weather?.weathercode ?? 0;

    let kpVal = null;
    if (kpResult.status === 'fulfilled' && kpResult.value.ok) {
      try {
        const raw = await kpResult.value.json();
        const rows = Array.isArray(raw[0]) && isNaN(parseFloat(raw[0][1])) ? raw.slice(1) : raw;
        const parsed = rows
          .map((r) => {
            const kp = parseFloat(Array.isArray(r) ? r[1] : r.kp ?? r.Kp);
            return isNaN(kp) ? null : { time: Array.isArray(r) ? r[0] : r.time_tag, kp };
          })
          .filter(Boolean);
        const past = parsed.filter((r) => new Date(String(r.time).replace(' ', 'T')) <= now);
        if (past.length) kpVal = past[past.length - 1].kp;
      } catch {
        /* Kp opcional */
      }
    }

    const score = calcScore(windspeed, gusts, visibility, precip, precipProb, kpVal);
    const issues = [];
    if (windspeed > THR.windSpeed) issues.push(`Viento ${windspeed} km/h (máx ${THR.windSpeed})`);
    if (gusts > THR.windGusts) issues.push(`Ráfagas ${gusts} km/h (máx ${THR.windGusts})`);
    if (visibility < THR.visibility) issues.push(`Visibilidad ${(visibility / 1000).toFixed(1)} km`);
    if (precip > THR.precipitation) issues.push(`Lluvia ${precip} mm/h`);

    const wmo = WMO[wcode] ?? { label: `Código ${wcode}`, icon: 'question_mark' };

    const HOURS_AHEAD = 8;
    const todayHourly = hours.slice(idx, idx + HOURS_AHEAD).map((d, i) => {
      const j = idx + i;
      const hWs = h.windspeed_10m?.[j] ?? 0;
      const hGusts = h.windgusts_10m?.[j] ?? 0;
      const hVis = h.visibility?.[j] ?? 10000;
      const hPrecip = h.precipitation?.[j] ?? 0;
      const hCode = h.weathercode?.[j] ?? 0;
      const hIssue = hWs > THR.windSpeed || hGusts > THR.windGusts || hVis < THR.visibility || hPrecip > THR.precipitation;
      const hScore = calcScore(hWs, hGusts, hVis, hPrecip, h.precipitation_probability?.[j] ?? 0, kpVal);
      const hWmo = WMO[hCode] ?? { label: `Código ${hCode}`, icon: 'question_mark' };
      return {
        time: d.toISOString().slice(11, 16),
        temperature: h.temperature_2m?.[j] ?? null,
        windspeed: hWs,
        icon: hWmo.icon,
        go: !hIssue ? 'GO' : hScore >= 50 ? 'Precaución' : 'NO-GO',
      };
    });

    return NextResponse.json({
      score,
      canFly: issues.length === 0,
      issues,
      current: {
        windspeed,
        winddirection: wd.current_weather?.winddirection ?? null,
        temperature: wd.current_weather?.temperature ?? null,
        weathercode: wcode,
        label: wmo.label,
        icon: wmo.icon,
      },
      hourly: { gusts, visibility, precipitation: precip, precipitationProbability: precipProb, humidity },
      todayHourly,
      kp: kpVal,
      coords: { lat, lon },
      dataTime: wd.hourly?.time?.[idx] ?? null,
    });
  } catch (err) {
    console.error('[meteorologia/current]', err.message, err.cause ? String(err.cause) : '');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
