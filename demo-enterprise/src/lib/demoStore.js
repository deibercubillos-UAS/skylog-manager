'use client';

// ── Estado en memoria del demo (con persistencia en localStorage) ─────────────
// Mantiene créditos, pilotos, misiones y vuelos. Expone acciones que D3/D4 usan.
// Todo es simulado: no hay red, no hay backend.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEMO } from '@/demo.config';
import {
  INITIAL_CREDITS, SEED_PILOTS, SEED_MISSIONS, SEED_FLIGHTS,
} from '@/lib/mockData';

const STORAGE_KEY = 'bitafly_demo_enterprise_v1';

const seedState = () => ({
  credits: { ...INITIAL_CREDITS },
  pilots:   SEED_PILOTS.map((p) => ({ ...p })),
  missions: SEED_MISSIONS.map((m) => ({ ...m })),
  flights:  SEED_FLIGHTS.map((f) => ({ ...f })),
});

// Dada una cuenta de créditos, retorna el umbral de alerta más severo cruzado
// (el menor de DEMO.lowBalanceAlerts que sea >= balance), o null si va holgado.
export function getAlertThreshold(balance) {
  const thresholds = [...DEMO.lowBalanceAlerts].sort((a, b) => b - a); // [100,50,25,10,5]
  let active = null;
  for (const t of thresholds) {
    if (balance <= t) active = t; // el último que cumpla = el más pequeño/severo
  }
  return active;
}

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [state, setState] = useState(seedState);
  const [hydrated, setHydrated] = useState(false);

  // Hidratar desde localStorage al montar (evita mismatch SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch { /* ignora datos corruptos */ }
    setHydrated(true);
  }, []);

  // Persistir en cada cambio (solo después de hidratar).
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* sin espacio */ }
  }, [state, hydrated]);

  // ── Acciones ────────────────────────────────────────────────────────────────

  // El piloto acepta la invitación → pasa de 'pendiente' a 'activo'.
  const acceptInvite = useCallback((pilotId) => {
    setState((s) => ({
      ...s,
      pilots: s.pilots.map((p) =>
        p.id === pilotId && p.status === 'pendiente'
          ? { ...p, status: 'activo', joinedAt: new Date().toISOString().slice(0, 10) }
          : p),
    }));
  }, []);

  // La organización reasigna una misión a otro piloto.
  const reassignMission = useCallback((missionId, newPilotId) => {
    setState((s) => ({
      ...s,
      missions: s.missions.map((m) => (m.id === missionId ? { ...m, pilotId: newPilotId } : m)),
    }));
  }, []);

  // Cargar un vuelo de una misión.
  // Regla del modelo: si balance === 0 → RECHAZO DURO (no se carga).
  // Retorna { ok, reason }.
  const loadFlight = useCallback((missionId, partial = {}) => {
    let result = { ok: false, reason: 'unknown' };
    setState((s) => {
      const mission = s.missions.find((m) => m.id === missionId);
      if (!mission) { result = { ok: false, reason: 'mission_not_found' }; return s; }
      if (s.credits.balance <= 0) {
        result = { ok: false, reason: 'no_credits' };
        return s; // rechazo duro: no se inserta el vuelo
      }
      const n = s.flights.length + 1;
      const flight = {
        id: `flt-${String(n).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
        missionId,
        pilotId: mission.pilotId,
        date: new Date().toISOString().slice(0, 10),
        takeoff: new Date().toTimeString().slice(0, 5),
        durationMin: partial.durationMin ?? (10 + Math.floor((n * 7) % 25)), // 10–34m determinista
        aircraft: partial.aircraft ?? 'DJI Mavic 3E',
        maxAlt: partial.maxAlt ?? 110,
        distanceKm: partial.distanceKm ?? 3.5,
        charged: true,
      };
      result = { ok: true, reason: 'charged' };
      return {
        ...s,
        flights: [flight, ...s.flights],
        credits: { ...s.credits, balance: s.credits.balance - 1 },
        missions: s.missions.map((m) =>
          m.id === missionId && m.status === 'programada' ? { ...m, status: 'en_curso' } : m),
      };
    });
    return result;
  }, []);

  // Recargar créditos (reinicia el ciclo mensual al tamaño del paquete).
  const recharge = useCallback((pack) => {
    setState((s) => ({
      ...s,
      credits: { ...s.credits, balance: pack, monthlyPack: pack },
    }));
  }, []);

  // Revocar un piloto (la organización lo desvincula). Conserva sus vuelos.
  const revokePilot = useCallback((pilotId) => {
    setState((s) => ({
      ...s,
      pilots: s.pilots.map((p) => (p.id === pilotId ? { ...p, status: 'revocado' } : p)),
    }));
  }, []);

  // Control de presentación: fijar el saldo (para demostrar alertas rápido).
  const setBalance = useCallback((balance) => {
    setState((s) => ({ ...s, credits: { ...s.credits, balance } }));
  }, []);

  // Reiniciar el demo a su estado semilla.
  const resetDemo = useCallback(() => setState(seedState()), []);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const consumedThisCycle = state.credits.monthlyPack - state.credits.balance;
  const alertThreshold = getAlertThreshold(state.credits.balance);
  const blocked = state.credits.balance <= 0;

  const value = {
    ...state,
    hydrated,
    consumedThisCycle,
    alertThreshold,
    blocked,
    pricePerFlight: DEMO.pricePerFlight,
    // acciones
    acceptInvite, reassignMission, loadFlight, recharge, revokePilot, setBalance, resetDemo,
    // helpers
    pilotById: (id) => state.pilots.find((p) => p.id === id) || null,
    missionById: (id) => state.missions.find((m) => m.id === id) || null,
    flightsOfMission: (id) => state.flights.filter((f) => f.missionId === id),
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo debe usarse dentro de <DemoProvider>');
  return ctx;
}
