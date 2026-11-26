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

import { useCallback, useEffect, useRef, useState } from 'react';
import BrandLoader from '@/components/BrandLoader';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import FlightReplayViewer from '../../_components/FlightReplayViewer';
import { fetchDutyContext, pickOrganizationId } from '@/lib/v2/dutyContextClient';
import { DJI_IMPORT_LIMITS } from '@skylog/domain';
import { pullSharedFlightFiles, onSharedFlightFiles } from '@/lib/flightShare';
import {
  isFolderImportAvailable,
  checkFolderPermission,
  pickFlightFolder,
  hasFlightFolder,
  clearFlightFolder,
  listFolderFlightFiles,
  readFolderFlightFile,
} from '@/lib/flightImportBridge';
import FlightEditDialog from './_FlightEditDialog';
import ZoneReportDialog from './_ZoneReportDialog';
// Leaflet toca `window` al importar; como en programación, se carga sin SSR.

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
  const [bookBusy, setBookBusy] = useState(null);
  async function downloadBook(flightId) {
    setBookBusy(flightId);
    try {
      const { downloadFlightBook } = await import('@/lib/v2/flightBook');
      await downloadFlightBook({ organizationId, flightId });
    } catch (e) {
      alert(e.message);
    } finally {
      setBookBusy(null);
    }
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dutyNotice, setDutyNotice] = useState([]); // avisos de §100.540 del último vuelo registrado
  const [pilotFilter, setPilotFilter] = useState('');
  const [fleet, setFleet] = useState([]);
  const [viewMode, setViewMode] = useState('bitacora'); // 'bitacora' (por piloto) | 'libro' (por aeronave)
  const [logbookAircraftId, setLogbookAircraftId] = useState('');
  const [replayFlight, setReplayFlight] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [totals, setTotals] = useState(null); // totales de toda la organización (no solo de lo cargado)
  const [loadingMore, setLoadingMore] = useState(false);
  const [flightAction, setFlightAction] = useState(null); // { flight, mode: 'edit' | 'void' }
  const [voidedFlights, setVoidedFlights] = useState([]);
  const [showVoided, setShowVoided] = useState(false);
  const canManageFlights = context?.organizations?.find((o) => o.id === organizationId)?.permissions?.D6 === 'edit';
  const canManualFlight = context?.organizations?.find((o) => o.id === organizationId)?.permissions?.D5 === 'edit';
  const [form, setForm] = useState({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS', missionType: '', flightOrder: '', aircraftId: '', location: '', notes: '' });

  // Importar vuelos — carga MANUAL de logs DJI .txt, la vía real para
  // controles RC / RC2 (sin app compañera que pueda sincronizar solos). Solo
  // analiza (POST /api/flights/import-dji, no inserta nada) — cada fila se
  // revisa/ajusta (condición visual, tipo de misión) y se confirma una por
  // una contra el mismo POST /api/flights del formulario manual, así el
  // chequeo de cumplimiento §100.540 se aplica igual sea log o carga a mano.
  const [showImport, setShowImport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importError, setImportError] = useState(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(null); // { current, total } mientras se analizan los logs
  const [importRows, setImportRows] = useState([]);
  const [confirmingIdx, setConfirmingIdx] = useState(null);
  // Importación por carpeta — solo app nativa Android (en web es no-op); se decide tras montar
  // para no desalinear la hidratación con el render del servidor.
  const [nativeFolder, setNativeFolder] = useState(false);
  // Salida de zona: la zona de operación NO se define en la Bitácora — se toma de las coordenadas
  // dejadas en la Programación (missions.zone_geo), que el vuelo hereda al despachar. Aquí solo se
  // reacciona a la evaluación ya hecha: si un vuelo salió de su zona, se abre el reporte de motivos
  // del piloto. El banner de pendientes y el enlace `?vuelo=` llevan al mismo diálogo.
  const [zoneReportFlight, setZoneReportFlight] = useState(null); // vuelo para el diálogo de motivos
  const [zoneParamHandled, setZoneParamHandled] = useState(false); // ?vuelo= ya atendido (abrir una sola vez)

  const loadFlights = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flights?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando vuelos');
    setFlights(data.flights || []);
    setHasMore(Boolean(data.hasMore));
    setTotals(data.totals || null);
  }, []);

  // Los vuelos llegan de 200 en 200: «Cargar más» pide la siguiente tanda y la agrega.
  async function loadMoreFlights() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/flights?organizationId=${organizationId}&offset=${flights.length}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando más vuelos');
      setFlights((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        return [...prev, ...(data.flights || []).filter((f) => !seen.has(f.id))];
      });
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  // Vuelos anulados: solo quien puede editar/anular los ve (D6); los demás reciben un 403 que se ignora.
  const loadVoided = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flights?organizationId=${orgId}&voided=1`);
    setVoidedFlights(res.ok ? (await res.json()).voided || [] : []);
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
        const ctxRes = await fetchDutyContext();
        const ctx = await ctxRes.json();
        if (!ctxRes.ok) throw new Error(ctx.error || 'Error cargando contexto');
        setContext(ctx);
        const firstOrgId = pickOrganizationId(ctx);
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
    if (organizationId && canManageFlights) loadVoided(organizationId);
    else setVoidedFlights([]);
  }, [organizationId, loadFlights, loadFleet, loadVoided, canManageFlights]);

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
          flightOrder: form.flightOrder || null,
          aircraftId: form.aircraftId || null,
          location: form.location || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el vuelo');
      // El vuelo SIEMPRE se registra; si excede un límite de §100.540 se avisa, no se rechaza.
      setDutyNotice(data.dutyWarnings || []);
      setForm({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS', missionType: '', flightOrder: '', aircraftId: '', location: '', notes: '' });
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
    const pending = (r) => ({ ...r, visualCondition: 'VLOS', missionType: '', flightOrder: '', aircraftId: '', confirmed: false });
    const mb = (n) => (n / 1024 / 1024).toFixed(1).replace('.', ',');
    // Un log por petición: Vercel rechaza peticiones de más de 4,5 MB antes de que lleguen al servidor, y un lote grande
    // también puede pasar del tiempo máximo. Así, si un log falla, los demás siguen y cada fila dice qué pasó con el suyo.
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setAnalyzeProgress({ current: i + 1, total: files.length });
      if (file.size > DJI_IMPORT_LIMITS.maxBytesPerFile) {
        setImportRows((prev) => [...prev, { fileName: file.name, error: `Este log pesa ${mb(file.size)} MB; por ahora el máximo es ${mb(DJI_IMPORT_LIMITS.maxBytesPerFile)} MB por archivo.` }]);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('files', file);
        const res = await fetch('/api/flights/import-dji', { method: 'POST', body: fd });
        // Si Vercel corta la petición (tamaño o tiempo) responde texto, no JSON: se traduce a un mensaje claro.
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          const reason = data?.error
            || (res.status === 413 ? 'El archivo es demasiado pesado para subirlo.'
              : res.status === 504 ? 'El análisis tardó demasiado. Intenta de nuevo con este log.'
              : `El servidor no pudo analizar este log (error ${res.status}).`);
          if (res.status === 429) {
            setImportError(reason);
            break;
          }
          setImportRows((prev) => [...prev, { fileName: file.name, error: reason }]);
          continue;
        }
        setImportRows((prev) => [...prev, ...data.results.map(pending)]);
      } catch {
        setImportRows((prev) => [...prev, { fileName: file.name, error: 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.' }]);
      }
    }
    setAnalyzeProgress(null);
    setAnalyzing(false);
  }

  // Importación por "Compartir" (solo app nativa Android): los .txt que el piloto envía desde
  // DJI Fly / el gestor de archivos entran directo al mismo análisis que el <input> manual,
  // abriendo el panel de importación. En navegador no-op. Ref para no reatar el efecto en cada render.
  const analyzeRef = useRef(null);
  analyzeRef.current = handleAnalyzeFiles;
  useEffect(() => {
    let cancelled = false;
    const intake = async () => {
      const files = await pullSharedFlightFiles();
      if (cancelled || !files.length) return;
      setShowImport(true);
      analyzeRef.current?.(files);
    };
    intake(); // arranque en frío: la app se abrió por un "Compartir"
    const off = onSharedFlightFiles(intake); // app ya abierta: recibe otro "Compartir"
    return () => { cancelled = true; off(); };
  }, []);

  // App nativa Android: la importación por carpeta es AUTOMÁTICA (auto-escaneo al abrir),
  // así que el panel va siempre abierto y sin el botón/colapsable manual (decisión usuario 2026-11-26).
  useEffect(() => {
    const native = isFolderImportAvailable();
    setNativeFolder(native);
    if (native) setShowImport(true);
  }, []);

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
          flightOrder: row.flightOrder || null,
          aircraftId: row.aircraftId || null,
          batterySerial: row.batterySerial || null,
          batteryCycles: row.batteryCycles ?? null,
          replayTrack: row.replayTrack || null,
          // La zona de operación se toma de la Programación (no se define en la Bitácora).
          zoneGeo: null,
          importToken: row.importToken || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error importando este vuelo');
      setDutyNotice(data.dutyWarnings || []);
      setImportRows((prev) => prev.filter((_, i) => i !== idx));
      await loadFlights(organizationId);
      await loadFleet(organizationId);
      // El dron salió de la zona: se le pide al piloto el reporte de motivos (ya se avisó al SMS).
      if (data.zoneExcursion?.outside && data.flight?.id) {
        setZoneReportFlight({ id: data.flight.id, zone_excursion: data.zoneExcursion });
      }
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

  // Salida de zona pendiente de reporte — solo del piloto actual (solo él puede registrar los motivos).
  const pendingZoneFlights = flights.filter((f) => f.zone_report_status === 'pendiente' && f.pilot_person_id === context?.personId);

  // La notificación de salida de zona enlaza a ?vuelo=<id>: al llegar, se abre el diálogo de motivos
  // para ese vuelo si sigue pendiente y es del piloto actual. Se hace una sola vez por carga.
  useEffect(() => {
    if (zoneParamHandled || !context?.personId || !flights.length) return;
    const wanted = new URLSearchParams(window.location.search).get('vuelo');
    if (!wanted) return;
    const match = pendingZoneFlights.find((f) => f.id === wanted);
    if (match) setZoneReportFlight(match);
    setZoneParamHandled(true);
  }, [flights, context?.personId, zoneParamHandled, pendingZoneFlights]);

  // Con filtro de piloto se suma lo cargado de ese piloto; sin filtro se usan los totales reales de la organización.
  const useServerTotals = totals && !pilotFilter;
  const totalHours = useServerTotals ? totals.hours : visibleFlights.reduce((sum, f) => sum + Number(f.total_time || 0), 0);
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthHours = useServerTotals ? totals.monthHours : visibleFlights
    .filter((f) => (f.takeoff_at || '').slice(0, 7) === thisMonthKey)
    .reduce((sum, f) => sum + Number(f.total_time || 0), 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <BrandLoader bare />
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
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="menu_book" color="primary" label="Vuelos registrados" value={useServerTotals ? totals.count : visibleFlights.length} />
        <StatCard icon="schedule" color="blue" label="Horas totales" value={`${totalHours.toFixed(1)}h`} />
        <StatCard icon="calendar_month" color="emerald" label="Horas este mes" value={`${thisMonthHours.toFixed(1)}h`} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
      {dutyNotice.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="font-semibold">El vuelo se guardó, pero ten en cuenta:</p>
          <ul className="mt-1 space-y-0.5">
            {dutyNotice.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {pendingZoneFlights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 space-y-2">
          <p className="text-sm font-black text-amber-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">wrong_location</span>
            {pendingZoneFlights.length === 1 ? 'Un vuelo salió de la zona de operación' : `${pendingZoneFlights.length} vuelos salieron de la zona de operación`}
          </p>
          <ul className="space-y-1.5">
            {pendingZoneFlights.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-amber-800 min-w-0 truncate">{formatDate(f.takeoff_at)}{f.aircraft?.serial_number ? ` · ${f.aircraft.serial_number}` : ''}</span>
                <button
                  type="button"
                  onClick={() => setZoneReportFlight(f)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700"
                >
                  Reportar motivos
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {nativeFolder ? (
          // App nativa: sin botón — la importación por carpeta es automática al abrir.
          <div className="w-full px-6 py-3.5 flex items-center gap-2 bg-navy-50/30">
            <span className="material-symbols-outlined text-base text-primary-500">folder_open</span>
            <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Importación de vuelos</h3>
          </div>
        ) : (
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
        )}

        {showImport && (
          <div className="p-5 border-t border-navy-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* App nativa: importación por carpeta AUTOMÁTICA (va primero, es la vía principal). */}
              {nativeFolder && <FolderImportCard onFiles={handleAnalyzeFiles} analyzing={analyzing} />}
              {/* Carga manual — RC / RC2: SOLO en web de escritorio. En la app (Android) la vía es la
                  carpeta automática; en celular (Android/iPhone) no se muestra la carga manual —
                  los .txt se sacan del control desde un computador. */}
              {!nativeFolder && (
              <div className="hidden lg:block rounded-2xl border border-navy-100 p-4 bg-navy-50/20">
                <p className="text-xs font-black uppercase text-navy tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary-600">sd_card</span>
                  Carga manual — control RC / RC2
                </p>
                <p className="text-xs text-navy-400 mt-1.5">
                  Estos controles no tienen una app compañera que sincronice los vuelos por sí sola — copia los archivos
                  <code className="mx-1 px-1 py-0.5 bg-navy-100 rounded text-[11px]">.txt</code>
                  de la carpeta FlightRecord al computador o celular y súbelos aquí.
                </p>
                <details className="mt-2 text-xs text-navy-500 group">
                  <summary className="cursor-pointer font-bold text-primary-700">¿Cómo saco los logs del RC 2?</summary>
                  <ol className="list-decimal pl-5 mt-1.5 space-y-1">
                    <li>Conecta el RC 2 encendido a un <b>computador</b> con un cable USB-C de datos. Aparece como «DJI RC 2».</li>
                    <li>Abre <b>Almacenamiento interno compartido → Android → data → dji.go.v5 → files → FlightRecord</b>. La ruta puede variar con la versión de DJI Fly: si no la ves, busca archivos llamados <code className="px-1 bg-navy-100 rounded">DJIFlightRecord_…txt</code>.</li>
                    <li>Copia los archivos <b>.txt</b> (no la carpeta «Logs» ni los de «MCDatFlightRecords»).</li>
                    <li>Entra a BitaFly desde ese computador (o pásalos al celular) y súbelos aquí con «Elegir logs .txt».</li>
                  </ol>
                  <p className="mt-1.5 text-navy-400">DJI Fly puede subir los registros a la nube de DJI, pero no hay una opción documentada para descargarlos desde allí como archivo: la copia confiable es la del control.</p>
                </details>
                <label className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-primary-100 transition-colors">
                  <span className="material-symbols-outlined text-base">{analyzing ? 'progress_activity' : 'file_upload'}</span>
                  {analyzing ? `Analizando${analyzeProgress ? ` ${analyzeProgress.current} de ${analyzeProgress.total}` : ''}…` : 'Elegir logs .txt'}
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
              )}

              {/* En web/iPhone no hay acceso a carpeta: aviso de que esa vía vive en la app móvil de Android. */}
              {!nativeFolder && (
                <div className="rounded-2xl border border-dashed border-navy-200 p-4 bg-navy-50/10 opacity-70">
                  <p className="text-xs font-black uppercase text-navy-400 tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">folder_open</span>
                    Importar desde la carpeta del control
                  </p>
                  <p className="text-xs text-navy-400 mt-1.5">
                    Desde la app de BitaFly para Android eliges una vez la carpeta FlightRecord del control
                    o celular y subes los logs en lote, sin sacarlos por USB.
                  </p>
                  <span className="inline-block mt-3 text-[11px] font-bold uppercase tracking-wide text-navy-400 bg-navy-100 rounded-full px-3 py-1.5">
                    En la app móvil
                  </span>
                </div>
              )}
            </div>

            {importError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{importError}</p>}

            {importRows.length > 0 && (
              <div className="md:hidden space-y-3">
                {importRows.map((row, idx) => (
                  <ImportRowCard
                    key={row.fileName + idx}
                    row={row}
                    fleet={fleet}
                    confirming={confirmingIdx === idx}
                    onChange={(patch) => updateImportRow(idx, patch)}
                    onConfirm={() => handleConfirmImportRow(idx)}
                    onDiscard={() => setImportRows((prev) => prev.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            )}

            {importRows.length > 0 && (
              <div className="hidden md:block rounded-2xl border border-navy-100 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                      <th className="px-4 py-2">Archivo</th>
                      <th className="px-4 py-2">Despegue</th>
                      <th className="px-4 py-2">Aterrizaje</th>
                      <th className="px-4 py-2">Duración</th>
                      <th className="px-4 py-2">Condición</th>
                      <th className="px-4 py-2">Orden de vuelo</th>
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
                          <td colSpan={9} className="px-4 py-2 text-xs text-red-600">{row.error}</td>
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
                                value={row.flightOrder}
                                onChange={(e) => updateImportRow(idx, { flightOrder: e.target.value })}
                                placeholder="OV-2026-014"
                                className="text-xs font-mono border border-navy-200 rounded-lg px-1.5 py-1 w-28"
                              />
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
                                  {Array.isArray(row.replayTrack) ? row.replayTrack.length : row.replayTrack.n} pts
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
            {visibleFlights.length === 0 ? (
              <div className="py-16 text-center opacity-40">
                <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">flight_takeoff</span>
                <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin vuelos registrados todavía</p>
              </div>
            ) : (
              // Filas de 2 líneas (sin scroll horizontal): la info secundaria baja a la 2.ª línea en gris.
              <ul className="divide-y divide-navy-50">
                {visibleFlights.map((f) => (
                  <li key={f.id} className="px-4 sm:px-6 py-3.5 hover:bg-navy-50/40 transition-colors">
                    {/* línea 1 — orden de vuelo + fecha; a la derecha: duración, condición y acciones */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {f.flight_order ? (
                        <span className="inline-flex items-center rounded-md bg-navy text-white font-mono font-bold text-[11px] tracking-wide px-2 py-1">{f.flight_order}</span>
                      ) : (
                        <span className="text-navy-300 text-xs">—</span>
                      )}
                      <span className="text-sm font-semibold text-navy-600">{formatDate(f.takeoff_at)}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <span className="text-sm font-black tabular-nums text-navy-700">{Number(f.total_time).toFixed(1)} h</span>
                        <span className="inline-flex items-center rounded-full border border-navy-100 bg-navy-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-navy-500">
                          {f.visual_condition || '—'}
                        </span>
                        {f.weather?.payload?.current && (
                          <span
                            className="material-symbols-outlined text-base text-sky-500"
                            title={`Clima al despachar: ${f.weather.payload.current.temperature_2m} °C · viento ${f.weather.payload.current.wind_speed_10m} km/h · rachas ${f.weather.payload.current.wind_gusts_10m} km/h${f.weather.payload.visibility_m != null ? ` · visibilidad ${f.weather.payload.visibility_m} m` : ''}`}
                            aria-label="Clima archivado con este vuelo"
                          >
                            cloud
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {f.has_replay && (
                            <button type="button" onClick={() => setReplayFlight(f)} title="Ver replay" aria-label="Ver replay" className="flex size-8 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                              <span className="material-symbols-outlined text-base">route</span>
                            </button>
                          )}
                          <button type="button" disabled={bookBusy === f.id} onClick={() => downloadBook(f.id)} title="Libro de vuelo (PDF)" aria-label="Libro de vuelo (PDF)" className="flex size-8 items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-navy-600 hover:bg-navy-100 transition-colors disabled:opacity-50">
                            <span className={`material-symbols-outlined text-base ${bookBusy === f.id ? 'animate-spin' : ''}`}>{bookBusy === f.id ? 'progress_activity' : 'picture_as_pdf'}</span>
                          </button>
                          {canManageFlights && (
                            <>
                              <button type="button" onClick={() => setFlightAction({ flight: f, mode: 'edit' })} title="Editar vuelo" aria-label="Editar vuelo" className="flex size-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 hover:text-primary-700">
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button type="button" onClick={() => setFlightAction({ flight: f, mode: 'void' })} title="Anular vuelo" aria-label="Anular vuelo" className="flex size-8 items-center justify-center rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600">
                                <span className="material-symbols-outlined text-base">block</span>
                              </button>
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                    {/* línea 2 — piloto · horario · aeronave · tipo de misión / lugar (gris) */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-navy-400" title={f.notes || undefined}>
                      <span className="font-bold text-navy-600">{f.pilot?.full_name || '—'}</span>
                      <span className="text-navy-200">·</span>
                      <span className="font-mono">{formatTime24(f.takeoff_at)}–{formatTime24(f.landing_at)}</span>
                      {f.aircraft && (<><span className="text-navy-200">·</span><span>{f.aircraft.model?.brand} {f.aircraft.model?.model} — {f.aircraft.serial_number}</span></>)}
                      {f.mission_type && (<><span className="text-navy-200">·</span><span>{f.mission_type}</span></>)}
                      {f.location && (<><span className="text-navy-200">·</span><span className="truncate max-w-[220px]">{f.location}</span></>)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hasMore && (
              <div className="px-6 py-3 border-t border-navy-50 text-center">
                <button type="button" onClick={loadMoreFlights} disabled={loadingMore} className="min-h-[44px] px-5 rounded-xl border border-navy-200 text-xs font-bold uppercase tracking-wide text-navy-600 hover:bg-navy-50 disabled:opacity-50">
                  {loadingMore ? 'Cargando…' : `Cargar más vuelos (mostrando ${flights.length}${totals ? ` de ${totals.count}` : ''})`}
                </button>
              </div>
            )}
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

        {/* Registrar vuelo (captura manual) — SOLO web de escritorio. En el celular (Android/iPhone)
            los vuelos entran por la carpeta/control, no se escriben a mano (`hidden lg:block`). */}
        {canManualFlight && (
        <form onSubmit={handleSubmit} className="hidden lg:block bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow p-5 h-fit">
          <div className="flex items-center gap-3 border-b border-navy-50 pb-4 mb-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <span className="material-symbols-outlined">add</span>
            </span>
            <div>
              <p className="text-sm font-bold text-navy">Registrar vuelo</p>
              <p className="text-xs text-navy-400">Captura manual</p>
            </div>
          </div>

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
            label="Orden de vuelo (opcional)"
            value={form.flightOrder}
            onChange={(e) => setForm((f) => ({ ...f, flightOrder: e.target.value }))}
            placeholder="Código del cliente — ej. OV-2026-014"
            className="border-primary-200 bg-primary-50/40 font-mono"
          />
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
        )}
      </div>

      {canManageFlights && voidedFlights.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setShowVoided((v) => !v)} className="w-full px-6 py-3.5 flex items-center justify-between gap-2 bg-navy-50/30 hover:bg-navy-50/60 transition-colors">
            <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Vuelos anulados ({voidedFlights.length})</h3>
            <span className="material-symbols-outlined text-navy-300">{showVoided ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showVoided && (
            <ul className="divide-y divide-navy-50">
              {voidedFlights.map((v) => (
                <li key={v.id} className="px-6 py-3 text-xs text-navy-500">
                  <p className="font-bold text-navy">{formatDate(v.takeoff_at)} · {v.pilot?.full_name || '—'} · {Number(v.total_time).toFixed(1)}h</p>
                  <p>Anulado el {formatDate(v.voided_at)} por {v.voider?.full_name || '—'}: {v.void_reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {flightAction && (
        <FlightEditDialog
          flight={flightAction.flight}
          mode={flightAction.mode}
          fleet={fleet}
          onClose={() => setFlightAction(null)}
          onDone={async (result) => {
            setFlightAction(null);
            setDutyNotice(result?.dutyWarnings || []);
            await Promise.all([loadFlights(organizationId), loadFleet(organizationId), loadVoided(organizationId)]).catch((e) => setError(e.message));
          }}
        />
      )}

      {replayFlight && (
        <FlightReplayViewer
          flightId={replayFlight.id}
          flightLabel={`${formatDate(replayFlight.takeoff_at)} · ${replayFlight.pilot?.full_name || 'Vuelo'}`}
          takeoffAt={replayFlight.takeoff_at}
          onClose={() => setReplayFlight(null)}
        />
      )}

      {zoneReportFlight && (
        <ZoneReportDialog
          flight={zoneReportFlight}
          excursion={zoneReportFlight.zone_excursion}
          onClose={() => setZoneReportFlight(null)}
          onDone={() => { setZoneReportFlight(null); loadFlights(organizationId); }}
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
          {aircraftFlights.length === 0 ? (
            <div className="py-16 text-center opacity-40">
              <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">menu_book</span>
              <p className="text-xs font-black uppercase tracking-widest text-navy-500">Esta aeronave no tiene vuelos registrados todavía</p>
            </div>
          ) : (
            // Filas de 2 líneas (sin scroll horizontal). Aquí la aeronave es fija (la seleccionada).
            <ul className="divide-y divide-navy-50">
              {aircraftFlights.map((f) => (
                <li key={f.id} className="px-4 sm:px-6 py-3.5 hover:bg-navy-50/40 transition-colors">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {f.flight_order ? (
                      <span className="inline-flex items-center rounded-md bg-navy text-white font-mono font-bold text-[11px] tracking-wide px-2 py-1">{f.flight_order}</span>
                    ) : (
                      <span className="text-navy-300 text-xs">—</span>
                    )}
                    <span className="text-sm font-semibold text-navy-600">{formatDate(f.takeoff_at)}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-sm font-black tabular-nums text-navy-700">{Number(f.total_time).toFixed(1)} h</span>
                      <span className="inline-flex items-center rounded-full border border-navy-100 bg-navy-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-navy-500">
                        {f.visual_condition || '—'}
                      </span>
                      {f.has_replay && (
                        <button type="button" onClick={() => onOpenReplay(f)} title="Ver replay" aria-label="Ver replay" className="flex size-8 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                          <span className="material-symbols-outlined text-base">route</span>
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-navy-400">
                    <span className="font-bold text-navy-600">{f.pilot?.full_name || '—'}</span>
                    <span className="text-navy-200">·</span>
                    <span className="font-mono">{formatTime24(f.takeoff_at)}–{formatTime24(f.landing_at)}</span>
                    {f.mission_type && (<><span className="text-navy-200">·</span><span>{f.mission_type}</span></>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// Vuelo leído de un log, en tarjeta para el celular: en la tabla de 10 columnas el botón Confirmar quedaba fuera de la
// pantalla y el recuadro no dejaba desplazar. Mismos campos y acciones que la fila de la tabla de escritorio.
function ImportRowCard({ row, fleet, confirming, onChange, onConfirm, onDiscard }) {
  const fmt = (v) => v?.slice(0, 16).replace('T', ' ');
  const inputCls = 'w-full min-h-[44px] text-base border border-navy-200 rounded-xl px-3 bg-white';
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-navy-500 break-all">{row.fileName}</p>
        <button type="button" onClick={onDiscard} className="shrink-0 size-9 flex items-center justify-center rounded-lg text-navy-300 hover:text-red-500" aria-label="Descartar">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      {row.error ? (
        <p className="text-sm text-red-600">{row.error}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="text-navy-300 font-bold uppercase">Despegue</dt><dd className="font-mono text-navy-700">{fmt(row.takeoffAt)}</dd></div>
            <div><dt className="text-navy-300 font-bold uppercase">Aterrizaje</dt><dd className="font-mono text-navy-700">{fmt(row.landingAt)}</dd></div>
            <div><dt className="text-navy-300 font-bold uppercase">Duración</dt><dd className="font-black text-navy-700">{row.totalTime}h</dd></div>
            <div>
              <dt className="text-navy-300 font-bold uppercase">Replay</dt>
              <dd className={row.replayTrack ? 'text-primary-700' : 'text-navy-300'}>{row.replayTrack ? `${Array.isArray(row.replayTrack) ? row.replayTrack.length : row.replayTrack.n} puntos GPS` : 'Sin GPS'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-navy-300 font-bold uppercase">Batería</dt>
              <dd className={row.batterySerial ? 'text-emerald-700' : 'text-navy-300'}>
                {row.batterySerial ? `${row.batterySerial}${row.batteryCycles != null ? ` · ${row.batteryCycles} ciclos` : ''}` : 'Sin dato en el log'}
              </dd>
            </div>
          </dl>
          <label className="block text-xs font-bold text-navy-400">
            Condición
            <select value={row.visualCondition} onChange={(e) => onChange({ visualCondition: e.target.value })} className={`mt-1 ${inputCls}`}>
              {VISUAL_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-navy-400">
            Orden de vuelo
            <input value={row.flightOrder} onChange={(e) => onChange({ flightOrder: e.target.value })} placeholder="Código del cliente — OV-2026-014" className={`mt-1 font-mono ${inputCls}`} />
          </label>
          <label className="block text-xs font-bold text-navy-400">
            Tipo de misión
            <input value={row.missionType} onChange={(e) => onChange({ missionType: e.target.value })} placeholder="Opcional" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-xs font-bold text-navy-400">
            Aeronave
            <select value={row.aircraftId} onChange={(e) => onChange({ aircraftId: e.target.value })} className={`mt-1 ${inputCls}`}>
              <option value="">Sin asignar</option>
              {fleet
                .filter((a) => a.operational_status !== 'fuera_de_servicio')
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.model?.brand} {a.model?.model} — {a.serial_number}</option>
                ))}
            </select>
          </label>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="w-full min-h-[48px] rounded-xl bg-primary text-white text-sm font-black uppercase tracking-wide disabled:opacity-50"
          >
            {confirming ? 'Guardando…' : 'Confirmar vuelo'}
          </button>
        </>
      )}
    </div>
  );
}

// Importación por carpeta — SOLO app nativa Android (en web este componente no se monta), AUTOMÁTICA.
// El piloto elige UNA vez la carpeta FlightRecord del control/celular (selector del sistema, SAF); desde
// ahí, al montar y al volver a la app, BitaFly escanea sola y mete los .txt NUEVOS al MISMO análisis
// (handleAnalyzeFiles → /api/flights/import-dji), listos para confirmar (§100.540 por vuelo: nada se
// guarda sin confirmar). Sirve a DJI Pilot 2 (Matrice, enterprise), con logs en almacenamiento público.
// NO reactiva el worker de fondo (parqueado): la automatización es solo del ESCANEO, no del guardado.
// Clave de "logs ya vistos" del auto-escaneo: evita volver a meter al análisis un .txt que ya se
// procesó (confirmado o descartado) en otra sesión o al volver a la app. Por nombre + fecha/tamaño.
const FOLDER_SEEN_KEY = 'bf_folder_seen_v1';
const folderFileKey = (f) => `${f.name || ''}|${f.mtime || f.size || ''}`;
function loadFolderSeen() { try { return new Set(JSON.parse(localStorage.getItem(FOLDER_SEEN_KEY) || '[]')); } catch { return new Set(); } }
function saveFolderSeen(set) { try { localStorage.setItem(FOLDER_SEEN_KEY, JSON.stringify([...set].slice(-800))); } catch { /* no-op */ } }

function FolderImportCard({ onFiles, analyzing }) {
  const [perm, setPerm] = useState(null);           // { granted, allFiles, folder }
  const [scanning, setScanning] = useState(false);
  const [reading, setReading] = useState(null);     // { current, total } mientras lee los .txt nuevos
  const [err, setErr] = useState(null);
  const [lastScan, setLastScan] = useState(null);   // { total, nuevos } del último escaneo
  const scanningRef = useRef(false);                // evita escaneos solapados (montaje + resume)
  // onFiles (handleAnalyzeFiles) cambia de identidad en cada render; en una ref para que autoScan
  // sea estable y los effects no se re-disparen en bucle.
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  const connected = !!(perm?.folder || perm?.allFiles);
  const busy = scanning || !!reading || analyzing;

  // Escaneo automático: lista la carpeta, lee los .txt no vistos y los manda al análisis (listos para
  // confirmar). `force` (al elegir/cambiar carpeta o "Buscar ahora") reconsidera también los ya vistos.
  const autoScan = useCallback(async (force = false) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    setErr(null);
    try {
      const found = await listFolderFlightFiles();
      found.sort((a, b) => (b.mtime || 0) - (a.mtime || 0)); // más reciente primero
      const seen = loadFolderSeen();
      const nuevos = force ? found : found.filter((f) => !seen.has(folderFileKey(f)));
      if (nuevos.length) {
        const out = [];
        setReading({ current: 0, total: nuevos.length });
        for (let i = 0; i < nuevos.length; i++) {
          setReading({ current: i + 1, total: nuevos.length });
          const file = await readFolderFlightFile(nuevos[i].path); // secuencial: no carga todo a memoria
          if (file) out.push(file);
          seen.add(folderFileKey(nuevos[i]));
        }
        setReading(null);
        saveFolderSeen(seen);
        if (out.length) onFilesRef.current(out); // reusa el análisis + confirmación por vuelo
      }
      setLastScan({ total: found.length, nuevos: nuevos.length });
    } catch {
      setErr('No se pudo leer la carpeta. Vuelve a elegirla con «Cambiar».');
    } finally {
      setReading(null);
      setScanning(false);
      scanningRef.current = false;
    }
  }, []);

  // Al montar: ¿hay carpeta ya elegida? Si sí, escanea solo.
  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await checkFolderPermission();
      if (!alive) return;
      setPerm(p);
      if (p?.folder || p?.allFiles) autoScan(false);
    })();
    return () => { alive = false; };
  }, [autoScan]);

  // Al VOLVER a la app (o a la pestaña): re-escanea para traer los logs nuevos sin tocar un botón.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') autoScan(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [autoScan]);

  async function connectFolder() {
    setErr(null);
    const res = await pickFlightFolder();
    if (!res.picked) { setErr('No se eligió ninguna carpeta.'); return; }
    setPerm(await checkFolderPermission());
    await autoScan(true);
  }

  async function changeFolder() {
    await clearFlightFolder();
    setPerm(await checkFolderPermission());
    await connectFolder();
  }

  const estado = reading
    ? `Leyendo ${reading.current} de ${reading.total}…`
    : scanning
      ? 'Buscando logs…'
      : analyzing
        ? 'Analizando…'
        : null;

  return (
    <div className="rounded-2xl border border-navy-100 p-4 bg-navy-50/20">
      <p className="text-xs font-black uppercase text-navy tracking-wide flex items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-primary-600">folder_open</span>
        Carpeta del control
        <span className="ml-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 normal-case tracking-normal">Automático</span>
      </p>

      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}

      {!connected ? (
        <>
          <p className="text-xs text-navy-400 mt-1.5">
            Elige <b>una vez</b> la carpeta <b>FlightRecord</b> del control o celular. Desde entonces BitaFly
            la revisa <b>sola al abrir la app</b> y te deja los logs nuevos listos para confirmar.
          </p>
          <button
            type="button"
            onClick={connectFolder}
            disabled={busy}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5 hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">create_new_folder</span>
            Conectar carpeta de vuelos
          </button>
        </>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Carpeta conectada · se revisa al abrir
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => autoScan(true)} disabled={busy} className="font-bold text-primary-700 disabled:opacity-50">
                {busy ? '…' : 'Buscar ahora'}
              </button>
              {perm?.folder && (
                <button type="button" onClick={changeFolder} disabled={busy} className="font-bold text-navy-400 disabled:opacity-50">
                  Cambiar
                </button>
              )}
            </div>
          </div>

          {estado && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-500">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              {estado}
            </p>
          )}

          {!busy && lastScan && (
            <p className="text-xs text-navy-400">
              {lastScan.nuevos > 0
                ? `${lastScan.nuevos} log(s) nuevo(s) — revísalos abajo y confírmalos.`
                : 'Sin logs nuevos. Todo lo de la carpeta ya está en la bitácora.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
