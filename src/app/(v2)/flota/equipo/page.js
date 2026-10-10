'use client';

// Skylog V2.0 — Flota & Equipo: Existencias de equipo de operación (chalecos, botiquín, extintor, conos…). Una fila por
// TIPO de equipo con su cantidad; cualquier miembro la consulta y solo un gestor la edita.
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const CATEGORIES = ['Seguridad', 'Señalización', 'Comunicaciones', 'Energía', 'Herramientas', 'Otro'];
const emptyForm = { name: '', category: '', quantity: '1', notes: '' };

export default function EquipoPage() {
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

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/equipo?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando las existencias');
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
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
    if (organizationId) load(organizationId).catch((e) => setError(e.message));
  }, [organizationId, load]);

  async function call(url, method, body) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción');
      await load(organizationId);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (await call('/api/flota/equipo', 'POST', { organizationId, ...form })) {
      setForm(emptyForm);
      setShowForm(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Existencias de equipo" description="Equipo de operación disponible, por tipo." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const total = items.reduce((n, i) => n + i.quantity, 0);
  const empty = items.filter((i) => i.quantity === 0).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Existencias de equipo"
        description="Equipo de operación disponible (chalecos, botiquín, extintor, conos…). Una fila por tipo, con su cantidad."
        metric={{ value: total, label: 'Unidades en total' }}
        cta={
          isManager && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nuevo equipo'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="inventory_2" color="primary" label="Tipos de equipo" value={items.length} />
        <StatCard icon="stacks" color="blue" label="Unidades en total" value={total} />
        <StatCard icon="remove_shopping_cart" color={empty > 0 ? 'amber' : 'emerald'} label="Sin existencias" value={empty} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {showForm && isManager && (
        <form onSubmit={handleCreate} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Nuevo tipo de equipo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Field as="select" label="Categoría" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Field>
            <Field label="Cantidad" type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
            <Field label="Notas (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" disabled={busy || !form.name.trim()} className="w-full mt-1">{busy ? 'Guardando…' : 'Registrar equipo'}</Button>
        </form>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Existencias</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Equipo</th>
                <th className="px-6 py-2.5">Categoría</th>
                <th className="px-6 py-2.5 text-right">Cantidad</th>
                <th className="px-6 py-2.5">Notas</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 5 : 4} className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">inventory_2</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin equipo registrado</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-navy-50/40 transition-colors">
                        <td className="px-6 py-2.5 text-xs font-bold text-navy">{item.name}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{item.category || '—'}</td>
                        <td className={`px-6 py-2.5 text-sm font-black text-right ${item.quantity === 0 ? 'text-amber-600' : 'text-navy'}`}>{item.quantity}</td>
                        <td className="px-6 py-2.5 text-xs text-navy-500">{item.notes || '—'}</td>
                        {isManager && (
                          <td className="px-6 py-2.5 text-right whitespace-nowrap space-x-2">
                            <button type="button" onClick={() => { if (isEditing) setEditingId(null); else { setEditingId(item.id); setEditForm({ name: item.name, category: item.category || '', quantity: String(item.quantity), notes: item.notes || '' }); } }} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                              {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => call(`/api/flota/equipo/${item.id}`, 'DELETE')} className="text-xs font-bold text-navy-400 hover:text-red-600">Eliminar</button>
                          </td>
                        )}
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={isManager ? 5 : 4} className="px-6 py-4 bg-navy-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4">
                              <Field label="Nombre" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                              <Field as="select" label="Categoría" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                                <option value="">Sin categoría</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </Field>
                              <Field label="Cantidad" type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
                              <Field label="Notas" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <Button type="button" disabled={busy} className="mt-1" onClick={async () => { if (await call(`/api/flota/equipo/${item.id}`, 'PATCH', editForm)) setEditingId(null); }}>
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
