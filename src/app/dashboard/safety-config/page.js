'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { OSO_LIST } from '@/lib/soraEngine';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function BarrerasPage() {
  const [loading, setLoading]       = useState(true);
  const [seeding, setSeeding]       = useState(false);
  const [items, setItems]           = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [form, setForm]             = useState({ category: '', label: '' });
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({ category: '', label: '' });
  const [saving, setSaving]         = useState(false);
  const [confirmDlg, setConfirmDlg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      setUserProfile(await profRes.json());
      const res  = await fetch('/api/safety-config');
      const data = await res.json();
      setItems(data.sora || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const canModify = ['superadmin', 'admin', 'gerente_sms'].includes(userProfile?.role);

  // ── Importar OSOs JARUS ──────────────────────────────────────────────────
  const handleSeedDefault = async () => {
    if (!canModify) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/safety-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seed_sora',
          items: OSO_LIST.map(o => ({ category: o.category, label: `${o.id} — ${o.label}` })),
        }),
      });
      if (res.ok) { toast.success('OSOs JARUS v2.0 importados.'); fetchData(); }
      else { const e = await res.json(); toast.error('Error: ' + e.error); }
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSeeding(false); }
  };

  // ── Agregar ──────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canModify) return toast.error('Sin permisos');
    const res = await fetch('/api/safety-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sora', data: { category: form.category || 'General', label: form.label } }),
    });
    if (res.ok) { setForm({ category: '', label: '' }); fetchData(); }
    else { const e = await res.json(); toast.error('Error: ' + e.error); }
  };

  // ── Iniciar edición ──────────────────────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ category: item.category || '', label: item.label || '' });
  };

  // ── Guardar edición ──────────────────────────────────────────────────────
  const handleSaveEdit = async (id) => {
    if (!editForm.label.trim()) return toast.error('La descripción es obligatoria');
    setSaving(true);
    try {
      const res = await fetch(`/api/safety-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editForm.category || 'General', label: editForm.label }),
      });
      if (res.ok) { toast.success('Barrera actualizada'); setEditingId(null); fetchData(); }
      else { const e = await res.json(); toast.error('Error: ' + e.error); }
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (!canModify) return toast.error('Sin permisos');
    setConfirmDlg({
      isOpen: true,
      title: 'Eliminar barrera',
      message: '¿Eliminar esta barrera de seguridad?',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        const res = await fetch(`/api/safety-config/${id}?type=sora`, { method: 'DELETE' });
        if (res.ok) fetchData();
        else { const e = await res.json(); toast.error('Error: ' + e.error); }
      },
    });
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARGANDO BARRERAS...</div>;

  const isEmpty = items.length === 0;
  const INPUT   = 'w-full bg-slate-700 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-slate-400 transition-all';

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500 pb-20">
      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

      {/* Botón regreso */}
      <Link href="/dashboard/safety" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Seguridad Operacional
      </Link>

      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Barreras de Seguridad</h2>
          <p className="text-slate-500 text-sm mt-1">Requerimientos y barreras operacionales según sus manuales internos.</p>
        </div>
        {!canModify && (
          <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 text-xs font-black uppercase">
            Modo Consulta
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Panel izquierdo: agregar */}
        <div className="lg:col-span-1">
          {canModify ? (
            <form onSubmit={handleAdd} className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-5 sticky top-24 shadow-2xl border border-white/5">
              <h3 className="text-orange-500 text-xs font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4">Nueva Barrera</h3>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Grupo / Categoría</label>
                <input
                  className={INPUT}
                  placeholder="Ej: Técnico, Operacional..."
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Descripción *</label>
                <textarea
                  required
                  rows={3}
                  className={INPUT}
                  placeholder="Descripción de la barrera..."
                  value={form.label}
                  onChange={e => setForm({...form, label: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                Añadir barrera
              </button>

              {isEmpty && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-400 mb-3">O importar base estándar:</p>
                  <button type="button" onClick={handleSeedDefault} disabled={seeding}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-base">download</span>
                    {seeding ? 'Importando...' : 'Importar OSOs JARUS v2.0'}
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="bg-slate-100 p-8 rounded-[2.5rem] border border-slate-200 text-slate-400 text-center space-y-4">
              <span className="material-symbols-outlined text-5xl">lock</span>
              <p className="text-xs font-black uppercase tracking-widest">Acceso administrativo requerido.</p>
            </div>
          )}
        </div>

        {/* Panel derecho: lista */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm min-h-[400px]">

            {isEmpty && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-slate-200">verified_user</span>
                <p className="text-slate-400 font-bold text-sm">No hay barreras definidas aún.</p>
                <p className="text-slate-300 text-xs">Agrega barreras manualmente o importa los OSOs JARUS v2.0.</p>
              </div>
            )}

            {!isEmpty && (
              <div className="space-y-8">
                {Object.entries(
                  items.reduce((acc, item) => {
                    const cat = item.category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {})
                ).map(([cat, subItems]) => (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-orange-500 tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-lg inline-block">{cat}</h4>
                    <div className="space-y-2">
                      {subItems.map(item => (
                        <div key={item.id}>
                          {editingId === item.id ? (
                            /* ── Modo edición inline ── */
                            <div className="bg-slate-50 rounded-2xl border-2 border-orange-300 p-4 space-y-3">
                              <input
                                value={editForm.category}
                                onChange={e => setEditForm(p => ({...p, category: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                placeholder="Categoría"
                              />
                              <textarea
                                rows={3}
                                value={editForm.label}
                                onChange={e => setEditForm(p => ({...p, label: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                                placeholder="Descripción..."
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEdit(item.id)} disabled={saving}
                                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50">
                                  {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button onClick={() => setEditingId(null)}
                                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── Vista normal ── */
                            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all gap-3">
                              <p className="text-sm font-medium text-slate-700 flex-1 leading-snug">{item.label}</p>
                              {canModify && (
                                <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(item)} title="Editar"
                                    className="text-slate-400 hover:text-orange-600 transition-colors">
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} title="Eliminar"
                                    className="text-slate-400 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
