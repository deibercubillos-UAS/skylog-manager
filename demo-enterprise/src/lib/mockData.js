// ── Datos simulados (semilla) del demo Enterprise ─────────────────────────────
// Todo es ficticio. No hay backend. El estado vive en el navegador (ver demoStore.js).

// Estado inicial de créditos de la organización.
export const INITIAL_CREDITS = {
  balance: 500,          // créditos disponibles (1 crédito = 1 vuelo = 1.000 COP)
  monthlyPack: 500,      // paquete mensual contratado (mínimo 500)
  cycleExpiresAt: '2026-07-18',
};

// Pilotos patrocinados (cuentas independientes vinculadas a la organización).
export const SEED_PILOTS = [
  {
    id: 'plt-01',
    name: 'Carlos Méndez',
    email: 'carlos.mendez@correo.com',
    status: 'activo',          // pendiente | activo | revocado
    paid: false,              // ¿pagó plan Piloto Independiente? (recupera autonomía)
    aircraft: 'DJI Mavic 3E',
    serial: '1581F5B...A2',
    joinedAt: '2026-06-02',
  },
  {
    id: 'plt-02',
    name: 'Laura Gómez',
    email: 'laura.gomez@correo.com',
    status: 'activo',
    paid: false,
    aircraft: 'DJI Matrice 350',
    serial: '1ZNBJ7...91',
    joinedAt: '2026-06-05',
  },
  {
    id: 'plt-03',
    name: 'Andrés Ruiz',
    email: 'andres.ruiz@correo.com',
    status: 'pendiente',       // invitado, aún no acepta
    paid: false,
    aircraft: null,
    serial: null,
    joinedAt: null,
  },
];

// Misiones programadas por la organización y asignadas a pilotos.
// Una misión puede tener varios vuelos.
export const SEED_MISSIONS = [
  {
    id: 'mis-01',
    name: 'Inspección línea 230kV — Tramo A',
    pilotId: 'plt-01',
    date: '2026-06-16',
    location: 'Sogamoso, Boyacá',
    center: [5.7145, -72.9339],
    status: 'completada',      // programada | en_curso | completada
  },
  {
    id: 'mis-02',
    name: 'Levantamiento topográfico cantera',
    pilotId: 'plt-02',
    date: '2026-06-17',
    location: 'Yumbo, Valle del Cauca',
    center: [3.5847, -76.4951],
    status: 'en_curso',
  },
  {
    id: 'mis-03',
    name: 'Monitoreo cultivo — Lote 7',
    pilotId: 'plt-01',
    date: '2026-06-19',
    location: 'Espinal, Tolima',
    center: [4.1497, -74.8859],
    status: 'programada',
  },
];

// Vuelos ya cargados (historial reciente). Cada uno descontó 1 crédito.
export const SEED_FLIGHTS = [
  {
    id: 'flt-01', missionId: 'mis-01', pilotId: 'plt-01',
    date: '2026-06-16', takeoff: '08:12', durationMin: 23, aircraft: 'DJI Mavic 3E',
    maxAlt: 118, distanceKm: 4.2, charged: true,
  },
  {
    id: 'flt-02', missionId: 'mis-01', pilotId: 'plt-01',
    date: '2026-06-16', takeoff: '09:05', durationMin: 19, aircraft: 'DJI Mavic 3E',
    maxAlt: 120, distanceKm: 3.8, charged: true,
  },
  {
    id: 'flt-03', missionId: 'mis-02', pilotId: 'plt-02',
    date: '2026-06-17', takeoff: '07:40', durationMin: 31, aircraft: 'DJI Matrice 350',
    maxAlt: 95, distanceKm: 6.1, charged: true,
  },
];

// Tamaños de paquete ofrecidos para recargar (créditos).
export const CREDIT_PACKS = [500, 1000, 2500, 5000];
