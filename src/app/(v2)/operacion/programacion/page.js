'use client';

// Skylog V2.0 — Programación (Operación). Calendario semanal sobre `missions`
// (30-entidades.md §4 · 31-esquema-datos.md §3, "lo programado") — decisión
// del usuario, 2026-09-13: vista de calendario semanal, no lista plana.
// Deliberadamente mínima: sin aeronave real (Flota no existe todavía en V2)
// ni autorización formal — solo PIC asignado, zona (texto libre) y fecha/hora.
// Solo un gestor (JP/GSMS/admin/superadmin) puede programar/cancelar; un
// piloto ve el calendario en modo solo lectura (mismas misiones que le
// muestra la RLS — las suyas).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { GEO_TYPES, getZoneSummary } from '@/lib/flightPlanDocs';
import { parseKmzOrKml } from '@/lib/v2/kmzImport';
import { downloadMissionPdf, downloadMissionKmz } from '@/lib/v2/missionDocs';

// Mismo componente ya usado por v1 (Programación/Planeación de Vuelo) para
// dibujar la zona sobre un mapa — reutilizado tal cual, sin duplicar lógica
// de Leaflet. `ssr:false` porque depende de `window`/Leaflet.
const MapPickerModal = dynamic(() => import('@/components/authorizations/MapPickerModal'), { ssr: false });

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const LINE_OF_SIGHT = [
  { key: 'VLOS', label: 'VLOS', hint: 'Visual directo' },
  { key: 'EVLOS', label: 'EVLOS', hint: 'Visual extendido' },
  { key: 'BVLOS', label: 'BVLOS', hint: 'Más allá del visual' },
];

// Geocodifica el texto libre de "Lugar de operación" para centrar el mapa
// ahí (mismo servicio que v1 — Nominatim/OpenStreetMap, sin API key). Falla
// en silencio → se queda con el centro por defecto de MapPickerModal
// (Bogotá) en vez de bloquear al usuario por un lugar que no se pudo ubicar.
async function geocodePlace(place) {
  if (!place?.trim()) return null;
  try {
    const q = encodeURIComponent(`${place}, Colombia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!data?.[0]) return null;
    return [Number(data[0].lat), Number(data[0].lon)];
  } catch {
    return null;
  }
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime24(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProgramacionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [missions, setMissions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showObserver, setShowObserver] = useState(false);
  const [form, setForm] = useState({
    name: '',
    picPersonId: '',
    observerPersonId: '',
    date: '',
    time: '',
    lineOfSight: 'VLOS',
    aircraftId: '',
    zone: '',
    notes: '',
    altitudeAgl: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [geoType, setGeoType] = useState('polygon');
  const [zoneGeo, setZoneGeo] = useState(null); // { points, radius }
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [kmzError, setKmzError] = useState(null);
  const [kmzBusy, setKmzBusy] = useState(false);
  const kmzInputRef = useRef(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const loadMissions = useCallback(async (orgId, from, to) => {
    if (!orgId) return;
    const res = await fetch(`/api/missions?organizationId=${orgId}&from=${from.toISOString()}&to=${to.toISOString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando misiones');
    setMissions(data.missions || []);
  }, []);

  const loadRoster = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/duty/roster?organizationId=${orgId}`);
    if (!res.ok) {
      setRoster([]);
      return;
    }
    const data = await res.json();
    setRoster(data.roster || []);
  }, []);

  // Aeronave — opcional (Flota & Equipo Fase 1, 35-frontend.md §3.7). Visible
  // para cualquiera con acceso al formulario, no solo gestores: cualquier
  // miembro de la organización puede consultar su flota (RLS de `aircraft`).
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
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadMissions(organizationId, weekStart, weekEnd).catch((e) => setError(e.message));
    if (isManager) loadRoster(organizationId);
    loadFleet(organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, weekStart, weekEnd, isManager]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!organizationId) return;
    if (form.observerPersonId && form.observerPersonId === form.picPersonId) {
      setError('El observador no puede ser la misma persona que el PIC');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: form.name,
          picPersonId: form.picPersonId,
          observerPersonId: form.observerPersonId || null,
          aircraftId: form.aircraftId || null,
          zone: form.zone,
          scheduledAt: `${form.date}T${form.time}`,
          notes: form.notes,
          lineOfSight: form.lineOfSight,
          altitudeAglM: form.altitudeAgl ? Number(form.altitudeAgl) : null,
          zoneGeo: zoneGeo ? { geoType, points: zoneGeo.points, radius: zoneGeo.radius } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error programando la misión');
      setForm({ name: '', picPersonId: '', observerPersonId: '', aircraftId: '', date: '', time: '', lineOfSight: 'VLOS', zone: '', notes: '', altitudeAgl: '' });
      setShowObserver(false);
      setZoneGeo(null);
      setGeoType('polygon');
      setMapCenter(null);
      setKmzError(null);
      setShowForm(false);
      await loadMissions(organizationId, weekStart, weekEnd);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // "Lugar de operación" no solo describe la misión — al salir del campo,
  // geocodifica el texto para que el mapa (Marcar en el mapa) abra ya
  // centrado ahí, en vez de siempre en Bogotá.
  async function handlePlaceBlur() {
    if (!form.zone.trim()) return;
    setGeocoding(true);
    const center = await geocodePlace(form.zone);
    setMapCenter(center);
    setGeocoding(false);
  }

  async function handleKmzUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a subir el mismo archivo si falla
    if (!file) return;
    setKmzBusy(true);
    setKmzError(null);
    try {
      const parsed = await parseKmzOrKml(file);
      setGeoType(parsed.geoType);
      setZoneGeo({ points: parsed.points, radius: parsed.radius });
    } catch (err) {
      setKmzError(err.message);
    } finally {
      setKmzBusy(false);
    }
  }

  const zoneSummary = zoneGeo ? getZoneSummary(geoType, zoneGeo.points, zoneGeo.radius) : null;

  async function handleCancel(missionId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelada' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cancelando la misión');
      await loadMissions(organizationId, weekStart, weekEnd);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(missionId) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error renombrando la misión');
      setEditingId(null);
      await loadMissions(organizationId, weekStart, weekEnd);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const missionsByDay = useMemo(() => {
    const map = {};
    for (const m of missions) {
      const k = dateKey(new Date(m.scheduled_at));
      (map[k] = map[k] || []).push(m);
    }
    return map;
  }, [missions]);

  const activeCount = missions.filter((m) => m.status !== 'cancelada').length;
  const uniquePics = new Set(missions.filter((m) => m.status !== 'cancelada').map((m) => m.pic_person_id)).size;
  const cancelledCount = missions.filter((m) => m.status === 'cancelada').length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando programación…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Operación" title="Programación" description="Calendario de misiones planeadas." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Operación"
        title="Programación"
        description="Calendario de misiones planeadas."
        cta={
          isManager && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nueva misión'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="event_available" color="primary" label="Misiones esta semana" value={activeCount} />
        <StatCard icon="badge" color="blue" label="PIC asignados" value={uniquePics} />
        <StatCard icon="cancel" color={cancelledCount > 0 ? 'red' : 'emerald'} label="Canceladas" value={cancelledCount} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {showForm && isManager && (
        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-5 space-y-5">
          {/* Datos de la misión */}
          <div>
            <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Datos de la misión
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field
                label="Nombre de la misión"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Inspección línea 220kV — tramo 4"
                required
              />
              <Field as="select" label="Piloto asignado (PIC)" value={form.picPersonId} onChange={(e) => setForm((f) => ({ ...f, picPersonId: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {roster.map((r) => (
                  <option key={r.personId} value={r.personId}>
                    {r.fullName}
                  </option>
                ))}
              </Field>
              {showObserver ? (
                <div>
                  <Field
                    as="select"
                    label="Observador"
                    value={form.observerPersonId}
                    onChange={(e) => setForm((f) => ({ ...f, observerPersonId: e.target.value }))}
                  >
                    <option value="">Sin observador</option>
                    {roster
                      .filter((r) => r.personId !== form.picPersonId)
                      .map((r) => (
                        <option key={r.personId} value={r.personId}>
                          {r.fullName}
                        </option>
                      ))}
                  </Field>
                  <button
                    type="button"
                    onClick={() => {
                      setShowObserver(false);
                      setForm((f) => ({ ...f, observerPersonId: '' }));
                    }}
                    className="text-[11px] text-navy-400 hover:text-red-500 -mt-2.5 mb-3 flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                    Quitar observador
                  </button>
                </div>
              ) : (
                <div className="mb-3 flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowObserver(true)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 h-[38px]"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Agregar observador (opcional)
                  </button>
                </div>
              )}
              <Field
                label="Fecha"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
              <Field
                label="Hora tentativa de inicio"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                required
              />
              <Field
                as="select"
                label="Aeronave asignada (opcional)"
                value={form.aircraftId}
                onChange={(e) => setForm((f) => ({ ...f, aircraftId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {fleet.filter((a) => a.operational_status !== 'fuera_de_servicio').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.model?.brand} {a.model?.model} — {a.serial_number}
                  </option>
                ))}
              </Field>
            </div>

            <span className="block text-xs font-medium text-navy-400 mb-1.5">Tipo de visión de la operación</span>
            <div className="flex flex-wrap gap-1.5">
              {LINE_OF_SIGHT.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, lineOfSight: l.key }))}
                  title={l.hint}
                  className={`px-3 h-8 rounded-full text-xs font-bold border transition-colors ${
                    form.lineOfSight === l.key ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400 hover:border-navy-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zona de operación */}
          <div>
            <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Zona de operación
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field
                label="Lugar de operación"
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                onBlur={handlePlaceBlur}
                placeholder="Ej. Finca El Roble, Madrid, Cundinamarca"
                required
              />
              <Field
                label="AGL — altura sobre el terreno (m)"
                type="number"
                min="0"
                step="1"
                value={form.altitudeAgl}
                onChange={(e) => setForm((f) => ({ ...f, altitudeAgl: e.target.value }))}
                placeholder="Ej. 80"
              />
            </div>
            {geocoding && <p className="text-xs text-navy-300 -mt-2 mb-3">Ubicando el lugar en el mapa…</p>}
            <Field
              as="textarea"
              rows={2}
              label="Nota — descripción de la misión a realizar"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Qué se va a hacer, alcance, consideraciones puntuales…"
            />

            <span className="block text-xs font-medium text-navy-400 mb-1.5 mt-1">Tipo de geometría de la zona</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {GEO_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setGeoType(t.key);
                    setZoneGeo(null);
                  }}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                    geoType === t.key ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400 hover:border-navy-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setMapOpen(true)} className="text-xs px-3 py-1.5">
                <span className="material-symbols-outlined text-base align-middle mr-1">map</span>
                Marcar en el mapa
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => kmzInputRef.current?.click()}
                disabled={kmzBusy}
                className="text-xs px-3 py-1.5"
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">upload_file</span>
                {kmzBusy ? 'Leyendo…' : 'Cargar KMZ/KML'}
              </Button>
              <input ref={kmzInputRef} type="file" accept=".kmz,.kml" hidden onChange={handleKmzUpload} />
              {zoneGeo && (
                <Button type="button" variant="ghost" onClick={() => setZoneGeo(null)} className="text-xs px-3 py-1.5 text-red-600">
                  Quitar zona
                </Button>
              )}
            </div>

            {kmzError && <p className="text-xs text-red-600 mt-2">{kmzError}</p>}

            {zoneSummary && (
              <div className="mt-2 flex flex-wrap gap-3 bg-navy-50 rounded-lg px-3 py-2">
                {zoneSummary.map((s) => (
                  <p key={s.label} className="text-xs text-navy-500">
                    <span className="text-navy-300">{s.label}:</span> <span className="font-semibold">{s.value}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Programando…' : 'Programar misión'}
          </Button>
        </form>
      )}

      {mapOpen && (
        <MapPickerModal
          type={geoType}
          points={zoneGeo?.points || []}
          initialCenter={mapCenter}
          onSave={({ points, radius }) => {
            setZoneGeo({ points, radius });
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-navy-50"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="px-3 h-8 rounded-full text-xs font-bold uppercase tracking-wide text-navy-500 hover:bg-navy-50"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-navy-50"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest">
            {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const isToday = dateKey(day) === dateKey(new Date());
            const dayMissions = missionsByDay[dateKey(day)] || [];
            return (
              <div
                key={i}
                className={`rounded-2xl border p-2 min-h-[140px] flex flex-col transition-colors ${
                  isToday ? 'border-primary/40 bg-gradient-to-b from-primary-50/60 to-white' : 'border-navy-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-primary-600' : 'text-navy-300'}`}>
                    {DAY_LABELS[i]} <span className="font-normal">{String(day.getDate()).padStart(2, '0')}</span>
                  </p>
                  {dayMissions.length > 0 && (
                    <span className="text-[10px] font-black text-white bg-primary rounded-full w-4 h-4 flex items-center justify-center">{dayMissions.length}</span>
                  )}
                </div>

                {/* Scroll interno por día — evita que la fila crezca sin
                    control cuando hay varias misiones el mismo día; cada
                    misión colapsa a una línea y se expande al hacer clic. */}
                <div className="space-y-1 overflow-y-auto max-h-[360px] pr-0.5">
                  {dayMissions.map((m) => {
                    const isExpanded = expandedId === m.id;
                    const isCancelled = m.status === 'cancelada';
                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl border-l-[3px] text-xs transition-colors ${
                          isCancelled ? 'border-navy-200 bg-navy-50 text-navy-300' : 'border-primary bg-primary-50/60 text-navy hover:bg-primary-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          className={`w-full flex items-center gap-1 px-2 py-1.5 text-left ${isCancelled ? 'line-through' : ''}`}
                        >
                          <span className="font-mono font-semibold shrink-0">{formatTime24(m.scheduled_at)}</span>
                          {m.line_of_sight && (
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 rounded px-1 shrink-0">{m.line_of_sight}</span>
                          )}
                          {m.zone_geo && (
                            <span className="material-symbols-outlined text-[12px] text-primary-600 shrink-0" title="Zona con geometría marcada">
                              map
                            </span>
                          )}
                          <span className="truncate flex-1 font-medium">{m.name || 'Sin nombre'}</span>
                          <span className="material-symbols-outlined text-[14px] text-navy-300 shrink-0">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-2 pb-2 -mt-0.5">
                            {editingId === m.id ? (
                              <div className="flex items-center gap-1 mb-1">
                                <input
                                  autoFocus
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename(m.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="w-full text-xs border border-navy-200 rounded px-1 py-0.5"
                                />
                                <button type="button" onClick={() => handleRename(m.id)} className="text-primary-600 shrink-0">
                                  <span className="material-symbols-outlined text-sm">check</span>
                                </button>
                              </div>
                            ) : (
                              isManager && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setEditName(m.name || '');
                                  }}
                                  className="text-[10px] text-navy-400 hover:text-navy-600 flex items-center gap-0.5 mb-1"
                                >
                                  <span className="material-symbols-outlined text-[12px]">edit</span>
                                  Editar nombre
                                </button>
                              )
                            )}

                            <p className="truncate">
                              <span className="text-navy-300">PIC:</span> {m.pic?.full_name || '—'}
                            </p>
                            {m.observer?.full_name && (
                              <p className="truncate text-navy-400">
                                <span className="text-navy-300">Observador:</span> {m.observer.full_name}
                              </p>
                            )}
                            {m.aircraft?.serial_number && (
                              <p className="truncate text-navy-400">
                                <span className="text-navy-300">Aeronave:</span> {m.aircraft.model?.brand} {m.aircraft.model?.model} — {m.aircraft.serial_number}
                              </p>
                            )}
                            {m.altitude_agl_m != null && (
                              <p className="truncate text-navy-400">
                                <span className="text-navy-300">AGL:</span> {m.altitude_agl_m} m
                              </p>
                            )}
                            <p className="truncate text-navy-400">
                              <span className="text-navy-300">Zona:</span> {m.zone}
                            </p>
                            {m.notes?.trim() && <p className="truncate text-navy-400 mt-0.5">{m.notes}</p>}

                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => downloadMissionPdf(m, { orgName: currentOrg?.name })}
                                className="text-navy-400 hover:text-navy-600"
                                title="Descargar PDF"
                              >
                                <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                              </button>
                              {m.zone_geo && (
                                <button
                                  type="button"
                                  onClick={() => downloadMissionKmz(m)}
                                  className="text-navy-400 hover:text-navy-600"
                                  title="Descargar KMZ"
                                >
                                  <span className="material-symbols-outlined text-[15px]">map</span>
                                </button>
                              )}
                              {isManager && !isCancelled && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleCancel(m.id)}
                                  className="text-[10px] text-red-600 hover:underline no-underline ml-auto"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
