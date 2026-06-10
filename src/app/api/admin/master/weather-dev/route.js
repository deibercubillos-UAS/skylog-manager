import { createAdminClient, createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/master/weather-dev?lat=4.71&lon=-74.07
// Proxy hacia Open-Meteo con cache 30 min — solo superadmin
export async function GET(request) {
  try {
    const supabase = createClientSSR();
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

    // Open-Meteo — gratuito, sin API key, datos GFS/ECMWF
    // windspeed_10m/80m/120m/180m = viento a distintas altitudes (como UAV Forecast)
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
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'America/Bogota');
    url.searchParams.set('windspeed_unit', 'kmh');

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 }, // cache 30 min en servidor
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo respondió ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[weather-dev]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
