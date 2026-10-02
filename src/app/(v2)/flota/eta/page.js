'use client';

// Skylog V2.0 — Flota & Equipo, Fase 3: ETA (Equipo Tecnológico Asociado,
// 30-entidades.md §3.2) — se registra ante AeroCivil igual que una
// aeronave, con su propio número RETA. Entidad independiente, no ligada a
// ninguna aeronave puntual. Con esto y el Documento de propiedad (ver
// `/flota` → Editar aeronave) se cierra por completo Flota & Equipo.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const emptyForm = { brand: '', model: '', retaNumber: '', description: '' };

export default function EtaPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadItems = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/eta?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando equipo tecnológico asociado');
    setItems(data.items || []);
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
    if (organizationId) loadItems(organizationId).catch((e) => setError(e.message));
  }, [organizationId, loadItems]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el equipo');
      setForm(emptyForm);
      setShowForm(false);
      await loadItems(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({ brand: item.brand, model: item.model, retaNumber: item.reta_number || '', description: item.description || '' });
  }

  async function handleSaveEdit(id) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/eta/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el equipo');
      setEditingId(null);
      await loadItems(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/eta/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error eliminando el equipo');
      await loadItems(organizationId);
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
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando equipo tecnológico asociado…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Equipo Tecnológico Asociado" description="ETA registrado ante AeroCivil, igual que una aeronave." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const withReta = items.filter((i) => i.reta_number).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Equipo Tecnológico Asociado"
        description="ETA — se registra ante AeroCivil igual que una aeronave, con su propio número RETA."
        metric={{ value: items.length, label: 'Equipos registrados' }}
        cta={
          isManager && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nuevo ETA'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="dns" color="primary" label="Equipos registrados" value={items.length} />
        <StatCard icon="badge" color="blue" label="Con N.º RETA" value={withReta} />
        <StatCard icon="warning" color={items.length - withReta > 0 ? 'amber' : 'emerald'} label="Sin N.º RETA" value={items.length - withReta} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {showForm && isManager && (
        <form onSubmit={handleCreate} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Nuevo equipo tecnológico asociado
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Marca" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} required />
            <Field label="Modelo" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} required />
            <Field label="N.º RETA (opcional)" value={form.retaNumber} onChange={(e) => setForm((f) => ({ ...f, retaNumber: e.target.value }))} />
            <Field label="Descripción (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <Button type="submit" disabled={busy || !form.brand || !form.model} className="w-full mt-1">
            {busy ? 'Registrando…' : 'Registrar equipo'}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Equipo Tecnológico Asociado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Marca / Modelo</th>
                <th className="px-6 py-2.5">N.º RETA</th>
                <th className="px-6 py-2.5">Descripción</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 4 : 3} className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">dns</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin equipo tecnológico asociado registrado</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-navy-50/40 transition-colors">
                        <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{item.brand} {item.model}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 font-mono whitespace-nowrap">{item.reta_number || '—'}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{item.description || '—'}</td>
                        {isManager && (
                          <td className="px-6 py-2.5 text-right whitespace-nowrap space-x-2">
                            <button type="button" onClick={() => (isEditing ? setEditingId(null) : startEdit(item))} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                              {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => handleDelete(item.id)} className="text-xs font-bold text-navy-400 hover:text-red-600">
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={isManager ? 4 : 3} className="px-6 py-4 bg-navy-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4">
                              <Field label="Marca" value={editForm.brand} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} />
                              <Field label="Modelo" value={editForm.model} onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))} />
                              <Field label="N.º RETA" value={editForm.retaNumber} onChange={(e) => setEditForm((f) => ({ ...f, retaNumber: e.target.value }))} />
                              <Field label="Descripción" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                            </div>
                            <Button type="button" onClick={() => handleSaveEdit(item.id)} disabled={busy} className="mt-1">
                              {busy ? 'Guardando…' : 'Guardar cambios'}
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
    </div>
  );
}
