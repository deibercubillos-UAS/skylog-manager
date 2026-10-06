'use client';

// Skylog V2.0 — Bitácora (Operación). Listado + registro de vuelos reales
// sobre la tabla `flights` de V2 (30-entidades.md §2) — la misma que ya
// alimenta el motor de cumplimiento F5 (packages/domain/dutyCompliance.js).
//
// Vista de Gerente General: el listado es por organización (no solo del
// piloto autenticado) — GET /api/flights?organizationId= deja que la RLS de
// `flights` decida qué filas ve cada rol (un piloto ve las suyas, un gestor
// ve todas las de su org), y trae el nombre del piloto asignado embebido.
//
// Libro de vuelo — 2026-10-01 (50-hoja-de-ruta.md §8.2 R8: "son dos
// documentos distintos... se conservan como dos vistas del mismo evento").
// Ya existía la aeronave asignada por vuelo (aircraft_id) desde Flota &
// Equipo; lo que faltaba era la SEGUNDA vista agrupada por aeronave en vez
// de por piloto — se agrega como un segundo modo de la misma tabla
// (`viewMode`), no una página nueva: mismo dato, otro corte.
//
// Replay GPS — 2026-10-01 (36-sitemap.md §3, complemento que no existía en
// V2 todavía). A diferencia de v1 (parseo browser-side + bucket R2 aparte,
// ver CLAUDE.md "Replay de Vuelo"), aquí el log DJI ya se parsea
// server-side con DJI_API_KEY (ver api/flights/import-dji) — la traza
// decimada se guarda inline en `flights.replay_track` (jsonb) y se ve con
// <FlightReplayViewer>, sin bucket ni gzip. Solo existe para vuelos
// confirmados desde un log importado, nunca para carga manual.
//
// Visual: mismo lenguaje moderno del dashboard (/inicio) — hero degradado +
// tarjetas de color, ya no PageHero/KPIStrip planos de @skylog/ui.

import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import FlightReplayViewer from '../../_components/FlightReplayViewer';

const VISUAL_CONDITIONS = ['VLOS', 'EVLOS', 'BVLOS'];

// DD/MM/AAAA explícito (pedido del usuario) — no el formato "medium" del
// locale (que muestra el mes abreviado en texto).
function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Horario 24h explícito (pedido del usuario) — no depender del formato por
// defecto del locale, que puede variar por navegador/SO.
function formatTime24(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function BitacoraPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dutyNotice, setDutyNotice] = useState([]); // avisos de §100.540 del último vuelo registrado
  const [pilotFilter, setPilotFilter] = useState('');
  const [fleet, setFleet] = useState([]);
  const [viewMode, setViewMode] = useState('bitacora'); // 'bitacora' (por piloto) | 'libro' (por aeronave)
  const [logbookAircraftId, setLogbookAircraftId] = useState('');
  const [replayFlight, setReplayFlight] = useState(null);
  const [form, setForm] = useState({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS', missionType: '', aircraftId: '', location: '', notes: '' });

  // Importar vuelos — carga MANUAL de logs DJI .txt, la vía real para
  // controles RC / RC2 (sin app compañera que pueda sincronizar solos). Solo
  // analiza (POST /api/flights/import-dji, no inserta nada) — cada fila se
  // revisa/ajusta (condición visual, tipo de misión) y se confirma una por
  // una contra el mismo POST /api/flights del formulario manual, así el
  // chequeo de cumplimiento §100.540 se aplica igual sea log o carga a mano.
  const [showImport, setShowImport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [confirmingIdx, setConfirmingIdx] = useState(null);

  const loadFlights = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flights?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando vuelos');
    setFlights(data.flights || []);
  }, []);

  // Aeronave — opcional (Flota & Equipo Fase 1). Cualquier miembro de la
  // organización puede consultar su flota (RLS de `aircraft`).
  const loadFleet = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/aircraft?organizationId=${orgId}`);
    if (!res.ok) {
      setFleet([]);
      return;
    }
    const data = await res.json();
    setFleet(data.aircraft || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ctxRes = await fetch('/api/duty/context');
        const ctx = await ctxRes.json();
        if (!ctxRes.ok) throw new Error(ctx.error || 'Error cargando contexto');
        setContext(ctx);
        const firstOrgId = ctx.organizations?.[0]?.id || '';
        setOrganizationId(firstOrgId);
        await loadFlights(firstOrgId);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFlights]);

  useEffect(() => {
    if (organizationId) loadFlights(organizationId).catch((e) => setError(e.message));
    if (organizationId) loadFleet(organizationId);
  }, [organizationId, loadFlights, loadFleet]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    setDutyNotice([]);
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          takeoffAt: form.takeoffAt,
          landingAt: form.landingAt,
          totalTime: Number(form.totalTime),
          visualCondition: form.visualCondition,
          missionType: form.missionType || null,
          aircraftId: form.aircraftId || null,
          location: form.location || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el vuelo');
      // El vuelo SIEMPRE se registra; si excede un límite de §100.540 se avisa, no se rechaza.
      setDutyNotice(data.dutyWarnings || []);
      setForm({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS', missionType: '', aircraftId: '', location: '', notes: '' });
      await loadFlights(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyzeFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setAnalyzing(true);
    setImportError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/flights/import-dji', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error analizando los logs');
      setImportRows((prev) => [
        ...prev,
        ...data.results.map((r) => ({ ...r, visualCondition: 'VLOS', missionType: '', aircraftId: '', confirmed: false })),
      ]);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateImportRow(idx, patch) {
    setImportRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleConfirmImportRow(idx) {
    const row = importRows[idx];
    if (!row || row.error || !organizationId) return;
    setConfirmingIdx(idx);
    setImportError(null);
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          takeoffAt: row.takeoffAt,
          landingAt: row.landingAt,
          totalTime: row.totalTime,
          visualCondition: row.visualCondition,
          missionType: row.missionType || null,
          aircraftId: row.aircraftId || null,
          batterySerial: row.batterySerial || null,
          batteryCycles: row.batteryCycles ?? null,
          replayTrack: row.replayTrack || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error importando este vuelo');
      setDutyNotice(data.dutyWarnings || []);
      setImportRows((prev) => prev.filter((_, i) => i !== idx));
      await loadFlights(organizationId);
      await loadFleet(organizationId);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setConfirmingIdx(null);
    }
  }

  // Filtro por piloto — sobre los vuelos ya cargados de la organización, sin
  // ida y vuelta al servidor. Solo tiene sentido para quien ve más de un
  // piloto (Gerente General/gestor); si RLS ya acotó a "solo los míos", la
  // lista de pilotos únicos queda con 1 solo nombre y el filtro no estorba.
  const pilotOptions = Array.from(
    new Map(flights.filter((f) => f.pilot?.full_name).map((f) => [f.pilot_person_id, f.pilot.full_name])).entries()
  ).map(([id, name]) => ({ id, name }));
  const visibleFlights = pilotFilter ? flights.filter((f) => f.pilot_person_id === pilotFilter) : flights;

  const totalHours = visibleFlights.reduce((sum, f) => sum + Number(f.total_time || 0), 0);
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthHours = visibleFlights
    .filter((f) => (f.takeoff_at || '').slice(0, 7) === thisMonthKey)
    .reduce((sum, f) => sum + Number(f.total_time || 0), 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando bitácora…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Operación" title="Bitácora" description="Registro de vuelos y horas de operación." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Operación"
        title="Bitácora"
        description="Registro de vuelos y horas de operación."
        metric={{ value: totalHours.toFixed(1) + 'h', label: 'Horas totales' }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="menu_book" color="primary" label="Vuelos registrados" value={flights.length} />
        <StatCard icon="schedule" color="blue" label="Horas totales" value={`${totalHours.toFixed(1)}h`} />
        <StatCard icon="calendar_month" color="emerald" label="Horas este mes" value={`${thisMonthHours.toFixed(1)}h`} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
      {dutyNotice.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="font-semibold">El vuelo se registró, pero ten en cuenta:</p>
          <ul className="mt-1 space-y-0.5">
            {dutyNotice.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="w-full px-6 py-3.5 flex items-center justify-between gap-2 bg-navy-50/30 hover:bg-navy-50/60 transition-colors"
        >
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary-500">upload_file</span>
            Importar vuelos desde el control
          </h3>
          <span className="material-symbols-outlined text-navy-300">{showImport ? 'expand_less' : 'expand_more'}</span>
        </button>

        {showImport && (
          <div className="p-5 border-t border-navy-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Carga manual — RC / RC2, sin app compañera que sincronice sola */}
              <div className="rounded-2xl border border-navy-100 p-4 bg-navy-50/20">
                <p className="text-xs font-black uppercase text-navy tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary-600">sd_card</span>
                  Carga manual — control RC / RC2
                </p>
                <p className="text-xs text-navy-400 mt-1.5">
                  Estos controles no tienen una app compañera que sincronice los vuelos por sí sola — copia los archivos
                  <code className="mx-1 px-1 py-0.5 bg-navy-100 rounded text-[11px]">.txt</code>
                  de la carpeta FlightRecord al computador o celular y súbelos aquí.
                </p>
                <label className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-primary-100 transition-colors">
                  <span className="material-symbols-outlined text-base">{analyzing ? 'progress_activity' : 'file_upload'}</span>
                  {analyzing ? 'Analizando…' : 'Elegir logs .txt'}
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    disabled={analyzing}
                    className="hidden"
                    onChange={(e) => {
                      handleAnalyzeFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* Sincronización automática — depende de la app móvil/RC de V2, todavía sin construir */}
              <div className="rounded-2xl border border-dashed border-navy-200 p-4 bg-navy-50/10 opacity-70">
                <p className="text-xs font-black uppercase text-navy-400 tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">sync</span>
                  Sincronización automática
                </p>
                <p className="text-xs text-navy-400 mt-1.5">
                  Para el resto de controles (RC Pro, RC-N3, celular) los vuelos se cargarán solos desde el control o el
                  celular en cuanto se instale la app — todavía no está construida en V2.
                </p>
                <span className="inline-block mt-3 text-[11px] font-bold uppercase tracking-wide text-navy-400 bg-navy-100 rounded-full px-3 py-1.5">
                  Próximamente
                </span>
              </div>
            </div>

            {importError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{importError}</p>}

            {importRows.length > 0 && (
              <div className="rounded-2xl border border-navy-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                      <th className="px-4 py-2">Archivo</th>
                      <th className="px-4 py-2">Despegue</th>
                      <th className="px-4 py-2">Aterrizaje</th>
                      <th className="px-4 py-2">Duración</th>
                      <th className="px-4 py-2">Condición</th>
                      <th className="px-4 py-2">Tipo de misión</th>
                      <th className="px-4 py-2">Aeronave</th>
                      <th className="px-4 py-2">Batería (auto)</th>
                      <th className="px-4 py-2">Replay</th>
                      <th className="px-4 py-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {importRows.map((row, idx) => (
                      <tr key={row.fileName + idx}>
                        <td className="px-4 py-2 text-xs font-semibold text-navy-500 max-w-[140px] truncate" title={row.fileName}>
                          {row.fileName}
                        </td>
                        {row.error ? (
                          <td colSpan={8} className="px-4 py-2 text-xs text-red-600">{row.error}</td>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-xs font-mono text-navy-600 whitespace-nowrap">{row.takeoffAt?.slice(0, 16).replace('T', ' ')}</td>
                            <td className="px-4 py-2 text-xs font-mono text-navy-600 whitespace-nowrap">{row.landingAt?.slice(0, 16).replace('T', ' ')}</td>
                            <td className="px-4 py-2 text-xs font-black text-navy-700 whitespace-nowrap">{row.totalTime}h</td>
                            <td className="px-4 py-2">
                              <select
                                value={row.visualCondition}
                                onChange={(e) => updateImportRow(idx, { visualCondition: e.target.value })}
                                className="text-xs border border-navy-200 rounded-lg px-1.5 py-1"
                              >
                                {VISUAL_CONDITIONS.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={row.missionType}
                                onChange={(e) => updateImportRow(idx, { missionType: e.target.value })}
                                placeholder="Opcional"
                                className="text-xs border border-navy-200 rounded-lg px-1.5 py-1 w-28"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={row.aircraftId}
                                onChange={(e) => updateImportRow(idx, { aircraftId: e.target.value })}
                                className="text-xs border border-navy-200 rounded-lg px-1.5 py-1 max-w-[130px]"
                              >
                                <option value="">Sin asignar</option>
                                {fleet
                                  .filter((a) => a.operational_status !== 'fuera_de_servicio')
                                  .map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.model?.brand} {a.model?.model} — {a.serial_number}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">
                              {row.batterySerial ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <span className="material-symbols-outlined text-sm">battery_full</span>
                                  {row.batterySerial}
                                  {row.batteryCycles != null && <span className="text-navy-400">· {row.batteryCycles} ciclos</span>}
                                </span>
                              ) : (
                                <span className="text-navy-300">Sin dato en el log</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">
                              {row.replayTrack ? (
                                <span className="inline-flex items-center gap-1 text-primary-700">
                                  <span className="material-symbols-outlined text-sm">route</span>
                                  {row.replayTrack.length} pts
                                </span>
                              ) : (
                                <span className="text-navy-300">Sin GPS</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {!row.error && (
                            <button
                              type="button"
                              disabled={confirmingIdx === idx}
                              onClick={() => handleConfirmImportRow(idx)}
                              className="text-xs font-bold uppercase text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1 hover:bg-primary-100 transition-colors disabled:opacity-50"
                            >
                              {confirmingIdx === idx ? 'Guardando…' : 'Confirmar'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setImportRows((prev) => prev.filter((_, i) => i !== idx))}
                            className="ml-2 text-navy-300 hover:text-red-500"
                            title="Descartar"
                          >
                            <span className="material-symbols-outlined text-base align-middle">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="inline-flex items-center gap-1 bg-navy-50 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setViewMode('bitacora')}
          className={`text-xs font-bold uppercase tracking-wide px-3.5 py-1.5 rounded-lg transition-colors ${viewMode === 'bitacora' ? 'bg-white text-navy shadow-sm' : 'text-navy-400'}`}
        >
          Bitácora · por piloto
        </button>
        <button
          type="button"
          onClick={() => setViewMode('libro')}
          className={`text-xs font-bold uppercase tracking-wide px-3.5 py-1.5 rounded-lg transition-colors ${viewMode === 'libro' ? 'bg-white text-navy shadow-sm' : 'text-navy-400'}`}
        >
          Libro de vuelo · por aeronave
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {viewMode === 'bitacora' ? (
          <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="px-6 py-3.5 border-b border-navy-50 flex flex-wrap items-center justify-between gap-2 bg-navy-50/30">
              <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Vuelos registrados</h3>
              {pilotOptions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-navy-300">filter_alt</span>
                  <select
                    value={pilotFilter}
                    onChange={(e) => setPilotFilter(e.target.value)}
                    className="text-xs font-semibold border border-navy-200 rounded-lg px-2 py-1 bg-white text-navy-600"
                  >
                    <option value="">Todos los pilotos</option>
                    {pilotOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                    <th className="px-6 py-2.5">Fecha</th>
                    <th className="px-6 py-2.5">Piloto</th>
                    <th className="px-6 py-2.5">Despegue</th>
                    <th className="px-6 py-2.5">Aterrizaje</th>
                    <th className="px-6 py-2.5">Duración</th>
                    <th className="px-6 py-2.5">Condición</th>
                    <th className="px-6 py-2.5">Aeronave</th>
                    <th className="px-6 py-2.5">Tipo de misión</th>
                    <th className="px-6 py-2.5">Replay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {visibleFlights.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center opacity-40">
                        <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">flight_takeoff</span>
                        <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin vuelos registrados todavía</p>
                      </td>
                    </tr>
                  )}
                  {visibleFlights.map((f) => (
                    <tr key={f.id} className="hover:bg-navy-50/40 transition-colors">
                      <td className="px-6 py-2.5 text-xs font-bold text-navy-500 whitespace-nowrap">{formatDate(f.takeoff_at)}</td>
                      <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{f.pilot?.full_name || '—'}</td>
                      <td className="px-6 py-2.5 text-xs font-bold text-navy-500 font-mono whitespace-nowrap">{formatTime24(f.takeoff_at)}</td>
                      <td className="px-6 py-2.5 text-xs font-bold text-navy-500 font-mono whitespace-nowrap">{formatTime24(f.landing_at)}</td>
                      <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums whitespace-nowrap">{Number(f.total_time).toFixed(1)}h</td>
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase border border-blue-100">
                          {f.visual_condition || '—'}
                        </span>
                        {f.weather?.payload?.current && (
                          <span
                            className="material-symbols-outlined text-base align-middle ml-1.5 text-sky-500"
                            title={`Clima al despachar: ${f.weather.payload.current.temperature_2m} °C · viento ${f.weather.payload.current.wind_speed_10m} km/h · rachas ${f.weather.payload.current.wind_gusts_10m} km/h${f.weather.payload.visibility_m != null ? ` · visibilidad ${f.weather.payload.visibility_m} m` : ''}`}
                            aria-label="Clima archivado con este vuelo"
                          >
                            cloud
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">
                        {f.aircraft ? `${f.aircraft.model?.brand} ${f.aircraft.model?.model} — ${f.aircraft.serial_number}` : '—'}
                      </td>
                      <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap" title={f.notes || undefined}>
                        {f.mission_type || '—'}
                        {f.location && <span className="block text-[11px] font-normal text-navy-400 max-w-[220px] truncate">{f.location}</span>}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        {f.has_replay ? (
                          <button
                            type="button"
                            onClick={() => setReplayFlight(f)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1 hover:bg-primary-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">route</span>
                            Ver
                          </button>
                        ) : (
                          <span className="text-navy-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LibroDeVueloPanel
            fleet={fleet}
            flights={flights}
            aircraftId={logbookAircraftId}
            onAircraftChange={setLogbookAircraftId}
            onOpenReplay={setReplayFlight}
          />
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow p-5 h-fit">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Nuevo vuelo
          </p>

          {context.organizations.length > 1 && (
            <Field as="select" label="Organización" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              {context.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Field>
          )}

          <Field
            label="Despegue"
            type="datetime-local"
            value={form.takeoffAt}
            onChange={(e) => setForm((f) => ({ ...f, takeoffAt: e.target.value }))}
            required
          />
          <Field
            label="Aterrizaje"
            type="datetime-local"
            value={form.landingAt}
            onChange={(e) => setForm((f) => ({ ...f, landingAt: e.target.value }))}
            required
          />
          <Field
            label="Duración total (horas)"
            type="number"
            step="0.1"
            min="0"
            value={form.totalTime}
            onChange={(e) => setForm((f) => ({ ...f, totalTime: e.target.value }))}
            required
          />
          <Field as="select" label="Condición visual" value={form.visualCondition} onChange={(e) => setForm((f) => ({ ...f, visualCondition: e.target.value }))}>
            {VISUAL_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Field>
          <Field
            label="Tipo de misión (opcional)"
            value={form.missionType}
            onChange={(e) => setForm((f) => ({ ...f, missionType: e.target.value }))}
          />
          <Field label="Lugar (opcional)" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <Field as="textarea" rows={2} label="Novedades (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <Field as="select" label="Aeronave (opcional)" value={form.aircraftId} onChange={(e) => setForm((f) => ({ ...f, aircraftId: e.target.value }))}>
            <option value="">Sin asignar</option>
            {fleet.filter((a) => a.operational_status !== 'fuera_de_servicio').map((a) => (
              <option key={a.id} value={a.id}>
                {a.model?.brand} {a.model?.model} — {a.serial_number}
              </option>
            ))}
          </Field>

          <Button type="submit" disabled={busy} className="w-full mt-1">
            {busy ? 'Guardando…' : 'Registrar vuelo'}
          </Button>
        </form>
      </div>

      {replayFlight && (
        <FlightReplayViewer
          flightId={replayFlight.id}
          flightLabel={`${formatDate(replayFlight.takeoff_at)} · ${replayFlight.pilot?.full_name || 'Vuelo'}`}
          onClose={() => setReplayFlight(null)}
        />
      )}
    </div>
  );
}

// Libro de vuelo — segunda vista de la misma tabla `flights`, agrupada por
// aeronave en vez de por piloto (ver comentario de cabecera del archivo).
// `aircraft.total_hours` (real, actualizado vía RPC en cada vuelo — ver
// POST /api/flights) es la fuente de horas totales, nunca una suma local
// de los vuelos visibles (que podría no incluir vuelos de otros pilotos si
// la RLS acotara la vista).
function LibroDeVueloPanel({ fleet, flights, aircraftId, onAircraftChange, onOpenReplay }) {
  const activeFleet = fleet.filter((a) => a.operational_status !== 'fuera_de_servicio');
  const aircraft = fleet.find((a) => a.id === aircraftId) || null;
  const aircraftFlights = aircraftId ? flights.filter((f) => f.aircraft_id === aircraftId) : [];
  const flightsHours = aircraftFlights.reduce((sum, f) => sum + Number(f.total_time || 0), 0);

  return (
    <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-6 py-3.5 border-b border-navy-50 flex flex-wrap items-center justify-between gap-2 bg-navy-50/30">
        <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Libro de vuelo</h3>
        <select
          value={aircraftId}
          onChange={(e) => onAircraftChange(e.target.value)}
          className="text-xs font-semibold border border-navy-200 rounded-lg px-2 py-1 bg-white text-navy-600"
        >
          <option value="">Elegir aeronave…</option>
          {activeFleet.map((a) => (
            <option key={a.id} value={a.id}>
              {a.model?.brand} {a.model?.model} — {a.serial_number}
            </option>
          ))}
        </select>
      </div>

      {!aircraft ? (
        <div className="py-16 text-center opacity-40">
          <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">flight</span>
          <p className="text-xs font-black uppercase tracking-widest text-navy-500">Elige una aeronave para ver su libro de vuelo</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 p-5 border-b border-navy-50 bg-navy-50/10">
            <div>
              <p className="text-[10px] font-bold uppercase text-navy-300">Horas totales (aeronave)</p>
              <p className="text-lg font-black text-navy tabular-nums">{Number(aircraft.total_hours).toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-navy-300">Vuelos visibles aquí</p>
              <p className="text-lg font-black text-navy tabular-nums">{aircraftFlights.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-navy-300">Horas (vuelos visibles)</p>
              <p className="text-lg font-black text-navy tabular-nums">{flightsHours.toFixed(1)}h</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                  <th className="px-6 py-2.5">Fecha</th>
                  <th className="px-6 py-2.5">PIC</th>
                  <th className="px-6 py-2.5">Despegue</th>
                  <th className="px-6 py-2.5">Aterrizaje</th>
                  <th className="px-6 py-2.5">Duración</th>
                  <th className="px-6 py-2.5">Condición</th>
                  <th className="px-6 py-2.5">Tipo de misión</th>
                  <th className="px-6 py-2.5">Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {aircraftFlights.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center opacity-40">
                      <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">menu_book</span>
                      <p className="text-xs font-black uppercase tracking-widest text-navy-500">Esta aeronave no tiene vuelos registrados todavía</p>
                    </td>
                  </tr>
                )}
                {aircraftFlights.map((f) => (
                  <tr key={f.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="px-6 py-2.5 text-xs font-bold text-navy-500 whitespace-nowrap">{formatDate(f.takeoff_at)}</td>
                    <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{f.pilot?.full_name || '—'}</td>
                    <td className="px-6 py-2.5 text-xs font-bold text-navy-500 font-mono whitespace-nowrap">{formatTime24(f.takeoff_at)}</td>
                    <td className="px-6 py-2.5 text-xs font-bold text-navy-500 font-mono whitespace-nowrap">{formatTime24(f.landing_at)}</td>
                    <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums whitespace-nowrap">{Number(f.total_time).toFixed(1)}h</td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase border border-blue-100">
                        {f.visual_condition || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{f.mission_type || '—'}</td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      {f.has_replay ? (
                        <button
                          type="button"
                          onClick={() => onOpenReplay(f)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1 hover:bg-primary-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">route</span>
                          Ver
                        </button>
                      ) : (
                        <span className="text-navy-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
