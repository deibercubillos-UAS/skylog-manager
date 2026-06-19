// Genera respuestas JSON de ejemplo de la API a partir del estado actual del demo,
// para que el cliente vea exactamente la forma de los datos que recibiría.

const SUPA = 'https://demo.supabase.co/storage/v1/object/sign/flight-replays';

export function sampleFlights(state) {
  const pilot = (id) => state.pilots.find((p) => p.id === id) || {};
  const mission = (id) => state.missions.find((m) => m.id === id) || {};
  return {
    data: state.flights.map((f) => ({
      id: f.id,
      mission_id: f.missionId,
      mission_name: mission(f.missionId).name || null,
      pilot: {
        id: f.pilotId,
        name: pilot(f.pilotId).name || null,
        email: pilot(f.pilotId).email || null,
      },
      aircraft: f.aircraft,
      date: f.date,
      takeoff_time: f.takeoff,
      duration_min: f.durationMin,
      max_altitude_m: f.maxAlt,
      distance_km: f.distanceKm,
      gps_track_url: `${SUPA}/${f.id}.json.gz`,
      credit_charged: f.charged ? 1 : 0,
    })),
    meta: { total: state.flights.length, page: 1, per_page: 50 },
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
      name: m.name,
      status: m.status,
      location: m.location,
      date: m.date,
      pilot: pilot(m.pilotId).name || null,
      flights: state.flights.filter((f) => f.missionId === m.id).length,
    })),
    meta: { total: state.missions.length },
  };
}

// Definición de endpoints (para tabla de docs).
export const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/flights', desc: 'Lista de vuelos compartidos (paginada, filtros por fecha/aeronave/piloto/misión).' },
  { method: 'GET', path: '/api/v1/flights/{id}', desc: 'Detalle de un vuelo, incluido GPS/replay completo.' },
  { method: 'GET', path: '/api/v1/missions', desc: 'Misiones programadas y su estado.' },
  { method: 'GET', path: '/api/v1/usage', desc: 'Saldo de créditos, consumo del ciclo y vencimiento.' },
];

export const SAMPLE_KEY = 'bf_live_3a9f1c7e8b24d6f0a1e5c9b7';
export const API_BASE = 'https://api.bitafly.com';
