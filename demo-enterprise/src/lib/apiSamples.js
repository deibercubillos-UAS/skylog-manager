// Genera respuestas JSON de ejemplo de la API a partir del estado actual del demo,
// para que el cliente vea exactamente la forma de los datos que recibiría.

import { genPath, toGeoPath, routeCompliance } from '@/lib/genPath';

const SUPA = 'https://demo.supabase.co/storage/v1/object/sign/flight-replays';

// Calcula trayectoria geográfica + cumplimiento de ruta de un vuelo contra su misión.
function flightGeo(flight, mission) {
  const center = mission?.center || [4.65, -74.08];
  const area = mission?.areaRadiusM || 300;
  const geo = toGeoPath(genPath(flight), center, area);
  const compliance = routeCompliance(geo, center, area, 100);
  return { geo, compliance, center, area };
}

export function sampleFlights(state) {
  const pilot = (id) => state.pilots.find((p) => p.id === id) || {};
  const mission = (id) => state.missions.find((m) => m.id === id) || {};
  return {
    data: state.flights.map((f) => {
      const m = mission(f.missionId);
      const { geo, compliance } = flightGeo(f, m);
      return {
        id: f.id,
        tracking_id: m.code || null,           // ID de seguimiento de la misión
        mission_id: f.missionId,
        mission_name: m.name || null,
        pilot: { id: f.pilotId, name: pilot(f.pilotId).name || null, email: pilot(f.pilotId).email || null },
        aircraft: f.aircraft,
        date: f.date,
        takeoff_time: f.takeoff,
        duration_min: f.durationMin,
        max_altitude_m: f.maxAlt,
        distance_km: f.distanceKm,
        gps_points: geo.length,
        gps_track_url: `${SUPA}/${f.id}.json.gz`,
        route_compliance: {
          within_tolerance: compliance.within_tolerance,
          max_deviation_m: compliance.max_deviation_m,
          compliance_pct: compliance.compliance_pct,
          tolerance_m: compliance.tolerance_m,
        },
        credit_charged: f.charged ? 1 : 0,
      };
    }),
    meta: { total: state.flights.length, page: 1, per_page: 50 },
  };
}

// Detalle de un vuelo: incluye la trayectoria GPS completa y el cruce de ruta.
export function sampleFlightDetail(state, flight) {
  const f = flight || state.flights[0];
  if (!f) return { error: 'sin vuelos' };
  const m = state.missions.find((x) => x.id === f.missionId) || {};
  const { geo, compliance, center, area } = flightGeo(f, m);
  const pilot = state.pilots.find((p) => p.id === f.pilotId) || {};
  return {
    id: f.id,
    tracking_id: m.code || null,
    mission_id: f.missionId,
    mission_name: m.name || null,
    pilot: { id: f.pilotId, name: pilot.name || null },
    aircraft: f.aircraft,
    date: f.date,
    takeoff_time: f.takeoff,
    duration_min: f.durationMin,
    // Zona programada contra la que se cruza la ruta
    programmed_zone: {
      geo_type: m.geoType || null,
      center: { lat: center[0], lng: center[1] },
      area_radius_m: area,
    },
    // Resultado del cruce: ¿el vuelo se mantuvo en el área asignada (±100 m)?
    route_compliance: compliance,
    // Coordenadas por donde voló la aeronave (muestra de los primeros puntos)
    gps_track_sample: geo.slice(0, 6),
    gps_track_total_points: geo.length,
    gps_track_url: `${SUPA}/${f.id}.json.gz`,
  };
}

export function sampleUsage(state) {
  return {
    balance: state.credits.balance,
    monthly_pack: state.credits.monthlyPack,
    consumed_this_cycle: state.credits.monthlyPack - state.credits.balance,
    price_per_flight_cop: 1000,
    cycle_expires_at: state.credits.cycleExpiresAt,
    currency: 'COP',
  };
}

export function sampleMissions(state) {
  const pilot = (id) => state.pilots.find((p) => p.id === id) || {};
  return {
    data: state.missions.map((m) => ({
      id: m.id,
      tracking_id: m.code || null,
      name: m.name,
      status: m.status,
      operation_type: m.opType || null,
      location: m.location,
      date: m.date,
      takeoff_time: m.takeoff || null,
      zone: { geo_type: m.geoType || null, center: m.center ? { lat: m.center[0], lng: m.center[1] } : null, area_radius_m: m.areaRadiusM || null },
      max_altitude_m: m.altitude ?? null,
      pilot: pilot(m.pilotId).name || null,
      flights: state.flights.filter((f) => f.missionId === m.id).length,
    })),
    meta: { total: state.missions.length },
  };
}

// Definición de endpoints (para tabla de docs).
export const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/flights', desc: 'Lista de vuelos compartidos con ID de seguimiento y resumen de cumplimiento de ruta.' },
  { method: 'GET', path: '/api/v1/flights/{id}', desc: 'Detalle de un vuelo: trayectoria GPS + cruce contra el área programada (tolerancia 100 m).' },
  { method: 'GET', path: '/api/v1/missions', desc: 'Misiones programadas (ID de seguimiento, zona, altitud) y su estado.' },
  { method: 'GET', path: '/api/v1/usage', desc: 'Saldo de créditos, consumo del ciclo y vencimiento.' },
];

export const SAMPLE_KEY = 'bf_live_3a9f1c7e8b24d6f0a1e5c9b7';
export const API_BASE = 'https://api.bitafly.com';
