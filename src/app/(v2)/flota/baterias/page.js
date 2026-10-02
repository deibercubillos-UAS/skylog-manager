'use client';

// Skylog V2.0 — Flota & Equipo, Fase 2: Batería + Componente
// (30-entidades.md §3.2 · 31-esquema-datos.md §2), a pedido explícito del
// usuario en una sola página. Baterías son intercambiables por diseño (sin
// `aircraft_id`, mismo criterio ya documentado en producción); Componentes
// cuelgan de una aeronave con reloj de uso desde `installed_at_aircraft_hours`
// hasta que se retiran/reemplazan. Fase 2 deliberadamente NO incluye
// (35-frontend.md §3.7): ETA, Documento de propiedad (Fase 3) ni el
// programa/eventos de mantenimiento por modelo (Fase 4).

import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const HEALTH_STATUSES = [
  { key: 'buena', label: 'Buena' },
  { key: 'regular', label: 'Regular' },
  { key: 'mala', label: 'Mala' },
];
const COMPONENT_PRESETS = ['Hélices', 'Motores', 'ESC', 'Cámara'];

function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function usedHours(c) {
  const end = c.status === 'retirado' ? Number(c.retired_at_aircraft_hours) : Number(c.aircraft?.total_hours || 0);
  return Math.max(0, end - Number(c.installed_at_aircraft_hours || 0));
}

export default function BateriasComponentesPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [batteries, setBatteries] = useState([]);
  const [components, setComponents] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showBatteryForm, setShowBatteryForm] = useState(false);
  const [batteryForm, setBatteryForm] = useState({ serialNumber: '', brand: '', model: '', healthStatus: '' });

  const [aircraftFilter, setAircraftFilter] = useState('');
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [componentForm, setComponentForm] = useState({ aircraftId: '', componentType: '', serialNumber: '' });

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadBatteries = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/batteries?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando baterías');
    setBatteries(data.batteries || []);
  }, []);

  const loadComponents = useCallback(async (orgId, aircraftId) => {
    if (!orgId) return;
    const qs = aircraftId ? `&aircraftId=${aircraftId}` : '';
    const res = await fetch(`/api/flota/components?organizationId=${orgId}${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando componentes');
    setComponents(data.components || []);
  }, []);

  const loadFleet = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/aircraft?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando la flota');
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
    Promise.all([loadBatteries(organizationId), loadFleet(organizationId), loadComponents(organizationId, aircraftFilter)]).catch((e) =>
      setError(e.message)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) loadComponents(organizationId, aircraftFilter).catch((e) => setError(e.message));
  }, [aircraftFilter, organizationId, loadComponents]);

  async function handleCreateBattery(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/batteries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...batteryForm, healthStatus: batteryForm.healthStatus || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la batería');
      setBatteryForm({ serialNumber: '', brand: '', model: '', healthStatus: '' });
      setShowBatteryForm(false);
      await loadBatteries(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBatteryStatus(b) {
    setBusy(true);
    setError(null);
    try {
      const nextStatus = b.status === 'operativo' ? 'baja' : 'operativo';
      const res = await fetch(`/api/flota/batteries/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando la batería');
      await loadBatteries(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateComponent(e) {
    e.preventDefault();
    if (!organizationId || !componentForm.aircraftId || !componentForm.componentType) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...componentForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error agregando el componente');
      setComponentForm({ aircraftId: componentForm.aircraftId, componentType: '', serialNumber: '' });
      setShowComponentForm(false);
      await loadComponents(organizationId, aircraftFilter);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRetireComponent(c, action) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/components/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el componente');
      await loadComponents(organizationId, aircraftFilter);
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
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Baterías y Componentes" description="Baterías intercambiables y componentes instalados por aeronave." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const operativeBatteries = batteries.filter((b) => b.status === 'operativo').length;
  const activeComponents = components.filter((c) => c.status === 'activo').length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Baterías y Componentes"
        description="Baterías intercambiables y componentes instalados por aeronave."
        metric={{ value: batteries.length, label: 'Baterías registradas' }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="battery_full" color="primary" label="Baterías" value={batteries.length} />
        <StatCard icon="check_circle" color="emerald" label="Operativas" value={operativeBatteries} />
        <StatCard icon="battery_alert" color={operativeBatteries < batteries.length ? 'amber' : 'emerald'} label="De baja" value={batteries.length - operativeBatteries} />
        <StatCard icon="settings" color="blue" label="Componentes activos" value={activeComponents} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {/* Baterías */}
      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Baterías</h3>
          {isManager && (
            <button
              type="button"
              onClick={() => setShowBatteryForm((s) => !s)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">{showBatteryForm ? 'close' : 'add'}</span>
              {showBatteryForm ? 'Cerrar' : 'Nueva batería'}
            </button>
          )}
        </div>

        {showBatteryForm && (
          <form onSubmit={handleCreateBattery} className="p-5 border-b border-navy-50 grid grid-cols-1 sm:grid-cols-2 gap-x-4 bg-navy-50/20">
            <Field label="Número de serie" value={batteryForm.serialNumber} onChange={(e) => setBatteryForm((f) => ({ ...f, serialNumber: e.target.value }))} required />
            <Field label="Marca (opcional)" value={batteryForm.brand} onChange={(e) => setBatteryForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Ej. DJI" />
            <Field label="Modelo (opcional)" value={batteryForm.model} onChange={(e) => setBatteryForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ej. TB65" />
            <Field as="select" label="Salud (opcional)" value={batteryForm.healthStatus} onChange={(e) => setBatteryForm((f) => ({ ...f, healthStatus: e.target.value }))}>
              <option value="">Sin especificar</option>
              {HEALTH_STATUSES.map((h) => (
                <option key={h.key} value={h.key}>{h.label}</option>
              ))}
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || !batteryForm.serialNumber} className="w-full">
                {busy ? 'Guardando…' : 'Registrar batería'}
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Serie</th>
                <th className="px-6 py-2.5">Marca / Modelo</th>
                <th className="px-6 py-2.5">Ciclos</th>
                <th className="px-6 py-2.5">Salud</th>
                <th className="px-6 py-2.5">Estado</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {batteries.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-10 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl text-navy-300 mb-2 block">battery_full</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin baterías registradas</p>
                  </td>
                </tr>
              ) : (
                batteries.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="px-6 py-2.5 text-xs font-bold text-navy font-mono whitespace-nowrap">{b.serial_number}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{[b.brand, b.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums whitespace-nowrap">{Number(b.cycles).toFixed(0)}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">
                      {HEALTH_STATUSES.find((h) => h.key === b.health_status)?.label || '—'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                          b.status === 'operativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}
                      >
                        {b.status === 'operativo' ? 'Operativa' : 'De baja'}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-6 py-2.5 text-right whitespace-nowrap">
                        <button type="button" disabled={busy} onClick={() => handleToggleBatteryStatus(b)} className="text-xs font-bold text-navy-400 hover:text-navy-600">
                          {b.status === 'operativo' ? 'Marcar de baja' : 'Marcar operativa'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Componentes */}
      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Componentes</h3>
          <div className="flex items-center gap-2">
            <select
              value={aircraftFilter}
              onChange={(e) => setAircraftFilter(e.target.value)}
              className="text-xs font-semibold border border-navy-200 rounded-lg px-2 py-1 bg-white text-navy-600"
            >
              <option value="">Todas las aeronaves</option>
              {fleet.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.model?.brand} {a.model?.model} — {a.serial_number}
                </option>
              ))}
            </select>
            {isManager && (
              <button
                type="button"
                onClick={() => {
                  setComponentForm((f) => ({ ...f, aircraftId: aircraftFilter || f.aircraftId }));
                  setShowComponentForm((s) => !s);
                }}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">{showComponentForm ? 'close' : 'add'}</span>
                {showComponentForm ? 'Cerrar' : 'Agregar componente'}
              </button>
            )}
          </div>
        </div>

        {showComponentForm && (
          <form onSubmit={handleCreateComponent} className="p-5 border-b border-navy-50 bg-navy-50/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field as="select" label="Aeronave" value={componentForm.aircraftId} onChange={(e) => setComponentForm((f) => ({ ...f, aircraftId: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {fleet.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.model?.brand} {a.model?.model} — {a.serial_number}
                  </option>
                ))}
              </Field>
              <Field
                label="N.º de serie (opcional)"
                value={componentForm.serialNumber}
                onChange={(e) => setComponentForm((f) => ({ ...f, serialNumber: e.target.value }))}
              />
            </div>
            <span className="block text-xs font-medium text-navy-400 mb-1.5">Tipo de componente</span>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMPONENT_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setComponentForm((f) => ({ ...f, componentType: t }))}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                    componentForm.componentType === t ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400 hover:border-navy-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Field
              label="Otro (o precisa el tipo)"
              value={componentForm.componentType}
              onChange={(e) => setComponentForm((f) => ({ ...f, componentType: e.target.value }))}
              placeholder="Ej. Tren de aterrizaje"
            />
            <Button type="submit" disabled={busy || !componentForm.aircraftId || !componentForm.componentType} className="w-full mt-1">
              {busy ? 'Guardando…' : 'Instalar componente'}
            </Button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Aeronave</th>
                <th className="px-6 py-2.5">Tipo</th>
                <th className="px-6 py-2.5">Serie</th>
                <th className="px-6 py-2.5">Instalado</th>
                <th className="px-6 py-2.5">Horas de uso</th>
                <th className="px-6 py-2.5">Estado</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {components.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="py-10 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl text-navy-300 mb-2 block">settings</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin componentes registrados</p>
                  </td>
                </tr>
              ) : (
                components.map((c) => (
                  <tr key={c.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">
                      {c.aircraft?.model?.brand} {c.aircraft?.model?.model} — {c.aircraft?.serial_number}
                    </td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{c.component_type}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 font-mono whitespace-nowrap">{c.serial_number || '—'}</td>
                    <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{formatDate(c.installed_at)}</td>
                    <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums whitespace-nowrap">{usedHours(c).toFixed(1)}h</td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                          c.status === 'activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-navy-50 text-navy-400 border-navy-100'
                        }`}
                      >
                        {c.status === 'activo' ? 'Activo' : 'Retirado'}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-6 py-2.5 text-right whitespace-nowrap space-x-2">
                        {c.status === 'activo' && (
                          <>
                            <button type="button" disabled={busy} onClick={() => handleRetireComponent(c, 'replace')} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                              Reemplazar
                            </button>
                            <button type="button" disabled={busy} onClick={() => handleRetireComponent(c, 'retire')} className="text-xs font-bold text-navy-400 hover:text-navy-600">
                              Retirar
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
