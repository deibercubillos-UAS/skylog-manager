'use client';

// Skylog V2.0 — Flota & Equipo, Fase 4a: Programa de mantenimiento POR
// MODELO (30-entidades.md §3.2/§4 · 100.535(3) — hallazgo R9 de
// 50-hoja-de-ruta.md §8.2: "hoy es por aeronave"). Cada Tarea lleva los 3
// tipos de intervalo simultáneos (ciclos/horas/calendario) más una
// tolerancia ligada a su criticidad.
//
// Fase 4b (esta misma pasada) agrega Eventos de mantenimiento
// (`maintenance_events`, clase ④ evento) + el estado de vencimiento por
// aeronave que se deriva de cruzarlos con el programa de la Fase 4a
// (GET /api/flota/maintenance/status, cálculo en vivo — nunca se persiste
// un "vencido"/"al día" que pudiera desincronizarse).
//
// Fase 4c (esta misma pasada) agrega Eventos inesperados
// (`unexpected_events`, `MAUT-5.0-12-090` ítem 19): aterrizaje fuerte,
// impacto de aves, FOD o pérdida de hélice. Reportar es abierto a cualquier
// miembro (quien lo vive es quien primero puede reportarlo); evaluar y
// cerrar el caso — con la aeronave grounded mientras tanto — es función de
// gestión.
//
// Fase 4c deliberadamente NO incluye todavía (35-frontend.md §3.7):
// - Fase 4d — Calibración de equipos de medición.
// Tareas de mantenimiento con SOLO intervalo por ciclos quedan "Sin dato" a
// propósito: V2 todavía no lleva un contador de ciclos/vuelos por aeronave.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const TOLERANCE_UNITS = [
  { key: 'pct', label: '%' },
  { key: 'hours', label: 'horas' },
  { key: 'days', label: 'días' },
  { key: 'cycles', label: 'ciclos' },
];
const EVENT_TYPES = [
  { key: 'programado', label: 'Programado' },
  { key: 'correctivo', label: 'Correctivo' },
  { key: 'menor', label: 'Menor' },
];
const STATUS_META = {
  vencida: { label: 'Vencida', tone: 'bg-red-50 text-red-600 border-red-100' },
  proxima: { label: 'Próxima', tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  al_dia: { label: 'Al día', tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  sin_dato: { label: 'Sin dato', tone: 'bg-navy-50 text-navy-400 border-navy-100' },
};
const INCIDENT_TYPES = [
  { key: 'aterrizaje_fuerte', label: 'Aterrizaje fuerte' },
  { key: 'impacto_aves', label: 'Impacto de aves' },
  { key: 'fod', label: 'FOD (objeto extraño)' },
  { key: 'perdida_helice', label: 'Pérdida de hélice' },
];
const EVALUATION_RESULTS = [
  { key: 'aeronavegable', label: 'Aeronavegable — vuelve al servicio' },
  { key: 'requiere_mantenimiento', label: 'Requiere mantenimiento' },
  { key: 'fuera_de_servicio', label: 'Fuera de servicio' },
];
const emptyTask = { name: '', systemCategory: '', intervalCycles: '', intervalHours: '', intervalCalendarDays: '', toleranceValue: '', toleranceUnit: 'pct' };
const emptyEvent = { aircraftId: '', taskId: '', type: 'programado', performedAt: '', findings: '', returnToService: true };
const emptyIncident = { aircraftId: '', type: 'aterrizaje_fuerte', description: '' };

function intervalSummary(t) {
  const parts = [];
  if (t.interval_hours) parts.push(`${Number(t.interval_hours)}h`);
  if (t.interval_cycles) parts.push(`${Number(t.interval_cycles)} ciclos`);
  if (t.interval_calendar_days) parts.push(`${Number(t.interval_calendar_days)}d`);
  return parts.join(' · ') || '—';
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function MantenimientoPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [models, setModels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const [fleet, setFleet] = useState([]);
  const [statusRows, setStatusRows] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEvent);

  const [incidents, setIncidents] = useState([]);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState(emptyIncident);
  const [evaluatingId, setEvaluatingId] = useState(null);
  const [evalForm, setEvalForm] = useState({ evaluationResult: 'aeronavegable', evaluationNotes: '' });

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadModels = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/models?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando modelos');
    setModels(data.models || []);
  }, []);

  const loadPrograms = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/maintenance/programs?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando programas de mantenimiento');
    setPrograms(data.programs || []);
  }, []);

  const loadFleet = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/aircraft?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando la flota');
    setFleet(data.aircraft || []);
  }, []);

  const loadStatus = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/maintenance/status?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error calculando vencimientos');
    setStatusRows(data.status || []);
  }, []);

  const loadIncidents = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/unexpected-events?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando eventos inesperados');
    setIncidents(data.events || []);
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
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      loadModels(organizationId),
      loadPrograms(organizationId),
      loadFleet(organizationId),
      loadStatus(organizationId),
      loadIncidents(organizationId),
    ]).catch((e) =>
      setError(e.message)
    );
  }, [organizationId, loadModels, loadPrograms, loadFleet, loadStatus, loadIncidents]);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedProgram = programs.find((p) => p.model_id === selectedModelId);

  const eventAircraft = fleet.find((a) => a.id === eventForm.aircraftId);
  const eventTasks = eventAircraft ? (programs.find((p) => p.model_id === eventAircraft.model_id)?.tasks || []) : [];

  async function handleRegisterEvent(e) {
    e.preventDefault();
    if (!organizationId || !eventForm.aircraftId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/maintenance/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          aircraftId: eventForm.aircraftId,
          taskId: eventForm.taskId || null,
          type: eventForm.type,
          performedAt: eventForm.performedAt ? new Date(eventForm.performedAt).toISOString() : undefined,
          findings: eventForm.findings || null,
          returnToService: eventForm.returnToService,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el mantenimiento');
      setEventForm(emptyEvent);
      setShowEventForm(false);
      await Promise.all([loadStatus(organizationId), loadFleet(organizationId)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReportIncident(e) {
    e.preventDefault();
    if (!organizationId || !incidentForm.aircraftId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/unexpected-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...incidentForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error reportando el evento');
      setIncidentForm(emptyIncident);
      setShowIncidentForm(false);
      await Promise.all([loadIncidents(organizationId), loadFleet(organizationId), loadStatus(organizationId)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEvaluateIncident(id) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/unexpected-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error evaluando el evento');
      setEvaluatingId(null);
      await Promise.all([loadIncidents(organizationId), loadFleet(organizationId), loadStatus(organizationId)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProgram() {
    if (!organizationId || !selectedModelId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/maintenance/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, modelId: selectedModelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando el programa');
      await loadPrograms(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!organizationId || !selectedProgram) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/maintenance/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          programId: selectedProgram.id,
          name: taskForm.name,
          systemCategory: taskForm.systemCategory || null,
          intervalCycles: taskForm.intervalCycles ? Number(taskForm.intervalCycles) : null,
          intervalHours: taskForm.intervalHours ? Number(taskForm.intervalHours) : null,
          intervalCalendarDays: taskForm.intervalCalendarDays ? Number(taskForm.intervalCalendarDays) : null,
          toleranceValue: taskForm.toleranceValue ? Number(taskForm.toleranceValue) : null,
          toleranceUnit: taskForm.toleranceValue ? taskForm.toleranceUnit : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error agregando la tarea');
      setTaskForm(emptyTask);
      setShowTaskForm(false);
      await loadPrograms(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTask(taskId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/maintenance/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error eliminando la tarea');
      await loadPrograms(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando mantenimiento…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Mantenimiento" description="Programa de mantenimiento por modelo." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const withProgram = models.filter((m) => programs.some((p) => p.model_id === m.id)).length;
  const totalTasks = programs.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const overdueCount = statusRows.filter((r) => r.status === 'vencida').length;
  const nearingCount = statusRows.filter((r) => r.status === 'proxima').length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Mantenimiento"
        description="Programa por modelo + eventos reales — vencimiento por aeronave calculado en vivo."
        metric={{
          value: <span className={overdueCount > 0 ? 'text-red-300' : 'text-emerald-300'}>{overdueCount}</span>,
          label: overdueCount > 0 ? 'Tareas vencidas' : 'Sin vencimientos',
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="category" color="primary" label="Modelos registrados" value={models.length} />
        <StatCard icon="fact_check" color="emerald" label="Con programa" value={withProgram} />
        <StatCard icon="warning" color={overdueCount > 0 ? 'red' : 'emerald'} label="Tareas vencidas" value={overdueCount} />
        <StatCard icon="hourglass_top" color={nearingCount > 0 ? 'amber' : 'emerald'} label="Tareas próximas" value={nearingCount} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Vencimientos por aeronave</h3>
          {isManager && fleet.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEventForm((s) => !s)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">{showEventForm ? 'close' : 'add'}</span>
              {showEventForm ? 'Cerrar' : 'Registrar mantenimiento'}
            </button>
          )}
        </div>

        {showEventForm && (
          <form onSubmit={handleRegisterEvent} className="p-5 border-b border-navy-50 bg-navy-50/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field
                as="select"
                label="Aeronave"
                value={eventForm.aircraftId}
                onChange={(e) => setEventForm((f) => ({ ...f, aircraftId: e.target.value, taskId: '' }))}
                required
              >
                <option value="">Selecciona…</option>
                {fleet.filter((a) => a.operational_status !== 'fuera_de_servicio').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.model?.brand} {a.model?.model} — {a.serial_number}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Tarea del programa (opcional)" value={eventForm.taskId} onChange={(e) => setEventForm((f) => ({ ...f, taskId: e.target.value }))}>
                <option value="">Sin tarea específica</option>
                {eventTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Field>
              <Field as="select" label="Tipo" value={eventForm.type} onChange={(e) => setEventForm((f) => ({ ...f, type: e.target.value }))}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Field>
              <Field label="Fecha (opcional, hoy por defecto)" type="date" value={eventForm.performedAt} onChange={(e) => setEventForm((f) => ({ ...f, performedAt: e.target.value }))} />
            </div>
            <Field as="textarea" rows={2} label="Hallazgos (opcional)" value={eventForm.findings} onChange={(e) => setEventForm((f) => ({ ...f, findings: e.target.value }))} />
            <label className="flex items-center gap-2 text-xs font-medium text-navy-500 mb-3">
              <input type="checkbox" checked={eventForm.returnToService} onChange={(e) => setEventForm((f) => ({ ...f, returnToService: e.target.checked }))} />
              La aeronave vuelve al servicio (disponible) tras este mantenimiento
            </label>
            <Button type="submit" disabled={busy || !eventForm.aircraftId} className="w-full">
              {busy ? 'Guardando…' : 'Registrar mantenimiento'}
            </Button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Aeronave</th>
                <th className="px-6 py-2.5">Tarea</th>
                <th className="px-6 py-2.5">Último mantenimiento</th>
                <th className="px-6 py-2.5">Restante</th>
                <th className="px-6 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {statusRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl text-navy-300 mb-2 block">build</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin tareas configuradas todavía en ningún modelo</p>
                  </td>
                </tr>
              ) : (
                statusRows.map((r) => (
                  <tr key={`${r.aircraftId}:${r.taskId}`} className="hover:bg-navy-50/40 transition-colors">
                    <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{r.aircraftLabel}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{r.taskName}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{r.lastPerformedAt ? formatDate(r.lastPerformedAt) : 'Nunca'}</td>
                    <td className="px-6 py-2.5 text-xs font-black text-navy-700 whitespace-nowrap">
                      {r.remainingHours != null && `${r.remainingHours}h`}
                      {r.remainingHours != null && r.remainingDays != null && ' · '}
                      {r.remainingDays != null && `${r.remainingDays}d`}
                      {r.remainingHours == null && r.remainingDays == null && '—'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${STATUS_META[r.status].tone}`}>{STATUS_META[r.status].label}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest flex items-center gap-2">
            Eventos inesperados
            {incidents.some((i) => !i.evaluated) && (
              <span className="text-[10px] font-black text-white bg-red-500 rounded-full px-2 py-0.5">
                {incidents.filter((i) => !i.evaluated).length} sin evaluar
              </span>
            )}
          </h3>
          {fleet.length > 0 && (
            <button
              type="button"
              onClick={() => setShowIncidentForm((s) => !s)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">{showIncidentForm ? 'close' : 'add'}</span>
              {showIncidentForm ? 'Cerrar' : 'Reportar evento'}
            </button>
          )}
        </div>

        {showIncidentForm && (
          <form onSubmit={handleReportIncident} className="p-5 border-b border-navy-50 bg-navy-50/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field as="select" label="Aeronave" value={incidentForm.aircraftId} onChange={(e) => setIncidentForm((f) => ({ ...f, aircraftId: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {fleet.filter((a) => a.operational_status !== 'fuera_de_servicio').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.model?.brand} {a.model?.model} — {a.serial_number}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Tipo de evento" value={incidentForm.type} onChange={(e) => setIncidentForm((f) => ({ ...f, type: e.target.value }))}>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Field>
            </div>
            <Field as="textarea" rows={2} label="Descripción" value={incidentForm.description} onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))} placeholder="Qué pasó, cuándo se notó, condiciones…" />
            <p className="text-xs text-navy-400 -mt-2 mb-3">La aeronave queda en mantenimiento de inmediato hasta que un gestor evalúe este evento.</p>
            <Button type="submit" disabled={busy || !incidentForm.aircraftId} className="w-full">
              {busy ? 'Reportando…' : 'Reportar evento'}
            </Button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Aeronave</th>
                <th className="px-6 py-2.5">Tipo</th>
                <th className="px-6 py-2.5">Reportado</th>
                <th className="px-6 py-2.5">Estado</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 5 : 4} className="py-10 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl text-navy-300 mb-2 block">report</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin eventos inesperados reportados</p>
                  </td>
                </tr>
              ) : (
                incidents.map((i) => {
                  const isEvaluating = evaluatingId === i.id;
                  return (
                    <Fragment key={i.id}>
                      <tr className="hover:bg-navy-50/40 transition-colors">
                        <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">
                          {i.aircraft?.model?.brand} {i.aircraft?.model?.model} — {i.aircraft?.serial_number}
                        </td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{INCIDENT_TYPES.find((t) => t.key === i.type)?.label || i.type}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{formatDate(i.reported_at)} · {i.reporter?.full_name || '—'}</td>
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          {i.evaluated ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase border bg-emerald-50 text-emerald-600 border-emerald-100">
                              {EVALUATION_RESULTS.find((r) => r.key === i.evaluation_result)?.label.split(' — ')[0] || 'Evaluado'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase border bg-red-50 text-red-600 border-red-100">Sin evaluar</span>
                          )}
                        </td>
                        {isManager && (
                          <td className="px-6 py-2.5 text-right whitespace-nowrap">
                            {!i.evaluated && (
                              <button type="button" onClick={() => (isEvaluating ? setEvaluatingId(null) : setEvaluatingId(i.id))} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                                {isEvaluating ? 'Cancelar' : 'Evaluar'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                      {isEvaluating && (
                        <tr>
                          <td colSpan={isManager ? 5 : 4} className="px-6 py-4 bg-navy-50/30">
                            {i.description && <p className="text-xs text-navy-500 mb-3">"{i.description}"</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                              <Field as="select" label="Resultado de la evaluación" value={evalForm.evaluationResult} onChange={(e) => setEvalForm((f) => ({ ...f, evaluationResult: e.target.value }))}>
                                {EVALUATION_RESULTS.map((r) => (
                                  <option key={r.key} value={r.key}>{r.label}</option>
                                ))}
                              </Field>
                              <Field label="Notas (opcional)" value={evalForm.evaluationNotes} onChange={(e) => setEvalForm((f) => ({ ...f, evaluationNotes: e.target.value }))} />
                            </div>
                            <Button type="button" onClick={() => handleEvaluateIncident(i.id)} disabled={busy} className="mt-1">
                              {busy ? 'Guardando…' : 'Cerrar evaluación'}
                            </Button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-10 text-center opacity-60">
          <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">category</span>
          <p className="text-sm font-bold text-navy-500">Registra primero un modelo en Aeronaves para configurar su programa de mantenimiento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Programa de mantenimiento</h3>
            <select
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                setShowTaskForm(false);
              }}
              className="text-xs font-semibold border border-navy-200 rounded-lg px-2 py-1 bg-white text-navy-600"
            >
              <option value="">Selecciona un modelo…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model}
                </option>
              ))}
            </select>
          </div>

          <div className="p-5">
            {!selectedModelId ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-40 text-center">
                <span className="material-symbols-outlined text-4xl text-navy-300 mb-2">build</span>
                <p className="text-xs font-black uppercase tracking-widest text-navy-500">Elige un modelo para ver su programa</p>
              </div>
            ) : !selectedProgram ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">warning</span>
                <p className="text-sm font-bold text-navy mb-1">
                  {selectedModel?.brand} {selectedModel?.model} todavía no tiene programa de mantenimiento
                </p>
                <p className="text-xs text-navy-400 mb-3">§100.535(3) exige uno por cada modelo de la flota.</p>
                {isManager && (
                  <Button onClick={handleCreateProgram} disabled={busy}>
                    {busy ? 'Creando…' : 'Crear programa de mantenimiento'}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-navy">
                    {selectedModel?.brand} {selectedModel?.model}
                  </p>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setShowTaskForm((s) => !s)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">{showTaskForm ? 'close' : 'add'}</span>
                      {showTaskForm ? 'Cerrar' : 'Agregar tarea'}
                    </button>
                  )}
                </div>

                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="rounded-2xl border border-navy-100 bg-navy-50/30 p-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      <Field label="Nombre de la tarea" value={taskForm.name} onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Cambio de hélices" required />
                      <Field label="Sistema / categoría (opcional)" value={taskForm.systemCategory} onChange={(e) => setTaskForm((f) => ({ ...f, systemCategory: e.target.value }))} placeholder="Ej. Hélices" />
                    </div>
                    <p className="text-xs font-medium text-navy-400 mb-1.5">Intervalo — al menos uno</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                      <Field label="Horas" type="number" min="0" value={taskForm.intervalHours} onChange={(e) => setTaskForm((f) => ({ ...f, intervalHours: e.target.value }))} />
                      <Field label="Ciclos" type="number" min="0" value={taskForm.intervalCycles} onChange={(e) => setTaskForm((f) => ({ ...f, intervalCycles: e.target.value }))} />
                      <Field label="Días calendario" type="number" min="0" value={taskForm.intervalCalendarDays} onChange={(e) => setTaskForm((f) => ({ ...f, intervalCalendarDays: e.target.value }))} />
                    </div>
                    <p className="text-xs font-medium text-navy-400 mb-1.5">Tolerancia (opcional, ligada a criticidad)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                      <Field label="Valor" type="number" min="0" value={taskForm.toleranceValue} onChange={(e) => setTaskForm((f) => ({ ...f, toleranceValue: e.target.value }))} />
                      <Field as="select" label="Unidad" value={taskForm.toleranceUnit} onChange={(e) => setTaskForm((f) => ({ ...f, toleranceUnit: e.target.value }))}>
                        {TOLERANCE_UNITS.map((u) => (
                          <option key={u.key} value={u.key}>{u.label}</option>
                        ))}
                      </Field>
                    </div>
                    <Button type="submit" disabled={busy || !taskForm.name} className="w-full mt-1">
                      {busy ? 'Guardando…' : 'Agregar tarea'}
                    </Button>
                  </form>
                )}

                <div className="rounded-2xl border border-navy-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                        <th className="px-4 py-2">Tarea</th>
                        <th className="px-4 py-2">Sistema</th>
                        <th className="px-4 py-2">Intervalo</th>
                        <th className="px-4 py-2">Tolerancia</th>
                        {isManager && <th className="px-4 py-2 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50">
                      {(selectedProgram.tasks || []).length === 0 ? (
                        <tr>
                          <td colSpan={isManager ? 5 : 4} className="py-8 text-center opacity-40">
                            <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin tareas configuradas</p>
                          </td>
                        </tr>
                      ) : (
                        selectedProgram.tasks.map((t) => (
                          <tr key={t.id} className="hover:bg-navy-50/40 transition-colors">
                            <td className="px-4 py-2 text-xs font-bold text-navy whitespace-nowrap">{t.name}</td>
                            <td className="px-4 py-2 text-xs font-semibold text-navy-500 whitespace-nowrap">{t.system_category || '—'}</td>
                            <td className="px-4 py-2 text-xs font-black text-navy-700 whitespace-nowrap">{intervalSummary(t)}</td>
                            <td className="px-4 py-2 text-xs font-semibold text-navy-500 whitespace-nowrap">
                              {t.tolerance_value ? `± ${Number(t.tolerance_value)} ${TOLERANCE_UNITS.find((u) => u.key === t.tolerance_unit)?.label || ''}` : '—'}
                            </td>
                            {isManager && (
                              <td className="px-4 py-2 text-right whitespace-nowrap">
                                <button type="button" disabled={busy} onClick={() => handleDeleteTask(t.id)} className="text-xs font-bold text-navy-400 hover:text-red-600">
                                  Eliminar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
