'use client';

// Skylog V2.0 — Meteorología (Operación). Condiciones actuales + pronóstico
// horario (Open-Meteo + NOAA Kp, mismo score/umbrales RAC 100 que v1) vía
// GET /api/meteorologia/current (endpoint propio de V2 — ver ese archivo
// para por qué no se reutilizó la ruta de v1 tal cual). Geolocalización del
// navegador con fallback Bogotá, mismo patrón que /dashboard/weather de v1.
//
// "Zonas de operación programadas hoy": a diferencia de v1 (que no tenía
// duración estimada por misión y por eso no mostraba una ventana horaria),
// aquí sí hay algo real y nuevo que mostrar — las misiones de Programación
// (V2) que ya tienen geometría de zona marcada (zone_geo), con el clima real
// de su primer punto. Las misiones sin geometría (solo descripción de texto)
// se excluyen honestamente: no hay coordenadas reales de las que partir.

import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const THR = { windSpeed: 25, windGusts: 35, visibility: 5000, precipitation: 0.1 };
const BOGOTA = { lat: 4.711, lon: -74.0721 };

function formatTime24(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Vocabulario deliberadamente NO tajante — pedido explícito del usuario: la
// meteorología es un insumo para que el piloto evalúe su propio entorno, no
// un veredicto "APTO/NO APTO". Única excepción: el índice Kp (actividad
// solar), que sí se mantiene directo — es un umbral objetivo de NOAA que el
// piloto no puede verificar a simple vista en el sitio.
function flyLabel(canFly) {
  return canFly ? { text: 'Favorable', tone: 'emerald' } : { text: 'Verifique su entorno', tone: 'amber' };
}

export default function MeteorologiaPage() {
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoneMissions, setZoneMissions] = useState([]); // [{ mission, weather }]

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(BOGOTA);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setCoords(BOGOTA),
      { timeout: 5000 }
    );
  }, []);

  const loadWeather = useCallback(async (lat, lon) => {
    const res = await fetch(`/api/meteorologia/current?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error consultando el clima');
    return data;
  }, []);

  useEffect(() => {
    if (!coords) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadWeather(coords.lat, coords.lon);
        setWeather(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [coords, loadWeather]);

  // Zonas de operación programadas hoy — misiones con geometría marcada.
  useEffect(() => {
    (async () => {
      try {
        const ctxRes = await fetch('/api/duty/context');
        const ctx = await ctxRes.json();
        const orgId = ctx.organizations?.[0]?.id;
        if (!orgId) return;

        const from = startOfDay(new Date());
        const to = new Date(from);
        to.setDate(to.getDate() + 1);

        const missionsRes = await fetch(`/api/missions?organizationId=${orgId}&from=${from.toISOString()}&to=${to.toISOString()}`);
        const missionsData = await missionsRes.json();
        if (!missionsRes.ok) return;

        const withZone = (missionsData.missions || []).filter((m) => m.status !== 'cancelada' && m.zone_geo?.points?.[0]);
        const results = await Promise.all(
          withZone.map(async (m) => {
            try {
              const w = await loadWeather(m.zone_geo.points[0].lat, m.zone_geo.points[0].lng);
              return { mission: m, weather: w };
            } catch {
              return { mission: m, weather: null };
            }
          })
        );
        setZoneMissions(results);
      } catch {
        // sección informativa — si falla, simplemente no se muestra
      }
    })();
  }, [loadWeather]);

  if (loading || !weather) {
    return (
      <div className="space-y-6">
        <SectionHero eyebrow="Operación" title="Meteorología" description="Condiciones de vuelo por zona de operación." />
        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        ) : (
          <div className="h-full flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando clima…</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { current, hourly, todayHourly, kp, canFly } = weather;
  const heroFly = flyLabel(canFly);

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Operación"
        title="Meteorología"
        description="Condiciones de vuelo por zona de operación."
        metric={{
          value: <span className={heroFly.tone === 'emerald' ? 'text-emerald-300' : 'text-amber-300'}>{heroFly.text}</span>,
          label: canFly ? 'Condiciones dentro de umbral' : 'Evalúe usted mismo antes de volar',
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon="air"
          color={current.windspeed <= THR.windSpeed ? 'emerald' : 'amber'}
          label="Viento"
          value={`${current.windspeed} km/h`}
          sub={current.windspeed <= THR.windSpeed ? 'Dentro de umbral' : `Umbral ${THR.windSpeed}`}
        />
        <StatCard
          icon="storm"
          color={hourly.gusts <= THR.windGusts ? 'emerald' : 'amber'}
          label="Ráfagas"
          value={`${hourly.gusts} km/h`}
          sub={hourly.gusts <= THR.windGusts ? 'Dentro de umbral' : `Umbral ${THR.windGusts}`}
        />
        <StatCard
          icon="visibility"
          color={hourly.visibility >= THR.visibility ? 'emerald' : 'amber'}
          label="Visibilidad"
          value={`${(hourly.visibility / 1000).toFixed(1)} km`}
          sub={hourly.visibility >= THR.visibility ? 'Dentro de umbral' : 'Reducida — verifique'}
        />
        <StatCard
          icon="rainy"
          color={hourly.precipitation <= THR.precipitation ? 'emerald' : 'amber'}
          label="Precipitación"
          value={`${hourly.precipitation} mm/h`}
          sub={hourly.precipitation <= THR.precipitation ? 'Dentro de umbral' : 'Sobre umbral — verifique'}
        />
        <StatCard icon="thermostat" color="blue" label="Temperatura" value={current.temperature != null ? `${current.temperature}°C` : '—'} />
        <StatCard
          icon="bolt"
          color={kp == null ? 'blue' : kp <= 5 ? 'emerald' : 'red'}
          label="Índice Kp"
          value={kp != null ? kp : '—'}
          sub={kp != null ? (kp <= 5 ? 'Normal' : 'Actividad solar alta') : null}
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Pronóstico horario — hoy</h3>
        </div>
        <div className="p-5 grid grid-cols-4 sm:grid-cols-8 gap-2">
          {todayHourly.map((h, i) => (
            <div key={i} className="rounded-2xl border border-navy-100 p-2 text-center hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
              <p className="text-[11px] text-navy-400 font-mono">{h.time}</p>
              <span className="material-symbols-outlined text-2xl text-navy-500">{h.icon}</span>
              <p className="text-xs font-black text-navy">{h.temperature != null ? `${Math.round(h.temperature)}°` : '—'}</p>
              <p
                className={`text-[10px] font-black uppercase mt-0.5 ${
                  h.go === 'GO' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {h.go === 'GO' ? 'Favorable' : h.go === 'Precaución' ? 'Precaución' : 'Revisar'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Zonas de operación programadas hoy</h3>
        </div>
        <div className="p-5">
          {zoneMissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-40 text-center">
              <span className="material-symbols-outlined text-4xl text-navy-300 mb-2">map</span>
              <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin misiones con zona marcada hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {zoneMissions.map(({ mission: m, weather: w }) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-navy-100 px-4 py-2.5 hover:bg-navy-50/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy truncate">{m.name || 'Sin nombre'}</p>
                    <p className="text-xs text-navy-400 truncate">
                      {formatTime24(m.scheduled_at)} · {m.pic?.full_name || '—'} · {m.zone}
                    </p>
                  </div>
                  {w ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border shrink-0 ${
                        w.canFly ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {flyLabel(w.canFly).text}
                    </span>
                  ) : (
                    <span className="text-xs text-navy-300 shrink-0">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
