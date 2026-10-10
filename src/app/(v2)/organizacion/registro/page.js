'use client';

// Skylog V2.0 — Registro de acciones: quién creó, cambió o eliminó qué, y cuándo. Solo gestores. Es un registro de
// solo-agregar (nadie lo edita desde la aplicación) y se puede descargar en CSV.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const ACTION = {
  create: { label: 'Creación', cls: 'bg-emerald-50 text-emerald-700' },
  update: { label: 'Edición', cls: 'bg-indigo-50 text-indigo-700' },
  delete: { label: 'Eliminación', cls: 'bg-red-50 text-red-700' },
};

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function RegistroPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const load = useCallback(async (orgId) => {
    const res = await fetch(`/api/audit?organizationId=${orgId}&limit=500`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar el registro');
    setEntries(data.entries || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const ctx = await res.json();
        if (!res.ok) throw new Error(ctx.error || 'Error cargando contexto');
        setContext(ctx);
        setOrganizationId(ctx.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId && isManager) load(organizationId).catch((e) => setError(e.message));
  }, [organizationId, isManager, load]);

  const modules = useMemo(() => [...new Set(entries.map((e) => e.module))].sort(), [entries]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => (!moduleFilter || e.module === moduleFilter) && (!actionFilter || e.action === actionFilter) && (!q || `${e.actor_name || ''} ${e.entity_label || ''} ${e.module}`.toLowerCase().includes(q)));
  }, [entries, moduleFilter, actionFilter, search]);

  const exportCsv = () => {
    const rows = [['Fecha', 'Usuario', 'Acción', 'Módulo', 'Detalle'], ...shown.map((e) => [new Date(e.created_at).toISOString(), e.actor_name || '', ACTION[e.action]?.label || e.action, e.module, e.entity_label || ''])];
    const blob = new Blob([`﻿${rows.map((r) => r.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `registro-de-acciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return <div className="py-24 flex justify-center"><div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!isManager) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Organización" title="Registro de acciones" description="Quién hizo qué y cuándo." />
        <p className="text-sm text-navy-400">Solo un gestor puede ver el registro de acciones.</p>
      </div>
    );
  }

  const thisMonth = entries.filter((e) => e.created_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Organización"
        title="Registro de acciones"
        description="Quién creó, cambió o eliminó qué, y cuándo. Solo se agrega: nadie puede editarlo desde la aplicación."
        metric={{ value: entries.length, label: 'Acciones registradas' }}
        cta={<Button onClick={exportCsv} disabled={shown.length === 0}><span className="material-symbols-outlined text-base align-middle mr-1">download</span>Descargar CSV</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="history" color="primary" label="Acciones registradas" value={entries.length} />
        <StatCard icon="calendar_month" color="blue" label="Este mes" value={thisMonth} />
        <StatCard icon="group" color="violet" label="Usuarios activos" value={new Set(entries.map((e) => e.actor_name).filter(Boolean)).size} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
        <Field label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Usuario, detalle…" />
        <Field as="select" label="Módulo" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">Todos</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </Field>
        <Field as="select" label="Acción" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(ACTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Field>
      </div>

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Fecha y hora</th>
                <th className="px-6 py-2.5">Usuario</th>
                <th className="px-6 py-2.5">Acción</th>
                <th className="px-6 py-2.5">Módulo</th>
                <th className="px-6 py-2.5">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {shown.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-xs font-black uppercase tracking-widest text-navy-300">Sin acciones registradas</td></tr>
              ) : shown.map((e) => (
                <tr key={e.id} className="hover:bg-navy-50/40">
                  <td className="px-6 py-2.5 text-xs text-navy-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{e.actor_name || '—'}</td>
                  <td className="px-6 py-2.5"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ACTION[e.action]?.cls || ''}`}>{ACTION[e.action]?.label || e.action}</span></td>
                  <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{e.module}</td>
                  <td className="px-6 py-2.5 text-xs text-navy-500">{e.entity_label || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
