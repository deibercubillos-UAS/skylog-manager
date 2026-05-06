'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { OSO_LIST } from '@/lib/soraEngine';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SafetyConfigPage() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [items, setItems] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [form, setForm] = useState({ category: '', label: '' });
  const [confirmDlg, setConfirmDlg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const profRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const profData = await profRes.json();
      setUserProfile(profData);

      const res = await fetch('/api/safety-config');
      const data = await res.json();
      setItems(data.sora || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Solo Admin y Gerente SMS pueden modificar
  const canModify = ['superadmin', 'admin', 'gerente_sms'].includes(userProfile?.role);

  // Sembrar OSOs JARUS por defecto
  const handleSeedDefault = async () => {
    if (!canModify) return;
    setSeeding(true);
    try {
      const payload = {
        action: 'seed_sora',
        items: OSO_LIST.map(o => ({ category: o.category, label: `${o.id} — ${o.label}` })),
      };
      const res = await fetch('/api/safety-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('OSOs JARUS v2.0 importados correctamente.');
        fetchData();
      } else {
        const err = await res.json();
        toast.error('Error: ' + err.error);
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canModify) return toast.error("No tienes permisos para agregar requerimientos.");

    const payload = {
      type: 'sora',
      data: { category: form.category || 'General', label: form.label },
    };

    const res = await fetch('/api/safety-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setForm({ category: '', label: '' });
      fetchData();
    } else {
      const err = await res.json();
      toast.error('Error: ' + err.error);
    }
  };

  const handleDelete = async (id) => {
    if (!canModify) return toast.error("No tienes permisos para eliminar.");
    if (!id) return;

    setConfirmDlg({
      isOpen: true,
      title: 'Eliminar requerimiento',
      message: '¿Eliminar este requerimiento de seguridad?',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          const res = await fetch(`/api/safety-config/${id}?type=sora`, { method: 'DELETE' });
          if (res.ok) {
            fetchData();
          } else {
            const err = await res.json();
            toast.error("Error del servidor: " + err.error);
          }
        } catch (error) {
          console.error("Error en borrado:", error);
          toast.error("Error de conexión al intentar eliminar.");
        }
      }
    });
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO PROTOCOLOS...</div>;

  const isEmpty = items.length === 0;

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500 pb-20">
      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Análisis SORA</h2>
          <p className="text-slate-500 text-sm">Requerimientos de seguridad operacional según sus manuales internos.</p>
        </div>
        {!canModify && (
          <div className="bg-orange-50 text-[#ec5b13] px-4 py-2 rounded-xl border border-orange-100 text-xs font-black uppercase">
            Modo Consulta: Edición Protegida
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
          {canModify ? (
            <form onSubmit={handleAdd} className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-6 sticky top-24 shadow-2xl border border-white/5">
              <h3 className="text-[#ec5b13] text-xs font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4">Nuevo Requerimiento</h3>
              <input
                required
                className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-bold outline-none"
                placeholder="Grupo (Ej: Técnico)"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
              />
              <textarea
                required
                rows="3"
                className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm outline-none"
                placeholder="Descripción del requerimiento..."
                value={form.label}
                onChange={e => setForm({...form, label: e.target.value})}
              />
              <button type="submit" className="w-full bg-[#ec5b13] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                Añadir al Protocolo
              </button>
            </form>
          ) : (
            <div className="bg-slate-100 p-8 rounded-[2.5rem] border border-slate-200 text-slate-400 text-center space-y-4">
              <span className="material-symbols-outlined text-5xl">lock</span>
              <p className="text-xs font-black uppercase tracking-widest">Acceso Administrativo Requerido para modificar parámetros de seguridad.</p>
            </div>
          )}
        </div>

        {/* LISTA DE ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm min-h-[400px]">

            {/* Estado vacío: botón para importar OSOs JARUS */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-6">
                <span className="material-symbols-outlined text-6xl text-slate-300">playlist_add_check</span>
                <div>
                  <p className="text-slate-500 font-bold text-sm">No hay requerimientos definidos aún.</p>
                  <p className="text-slate-400 text-xs mt-1">Puedes agregar los suyos manualmente o importar los OSOs estándar de JARUS v2.0 como punto de partida.</p>
                </div>
                {canModify && (
                  <button
                    onClick={handleSeedDefault}
                    disabled={seeding}
                    className="flex items-center gap-2 bg-[#1A202C] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    {seeding ? 'Importando...' : 'Importar OSOs JARUS v2.0'}
                  </button>
                )}
              </div>
            )}

            {/* Lista agrupada por categoría */}
            {!isEmpty && (
              <div className="space-y-10">
                {Object.entries(
                  items.reduce((acc, curr) => {
                    const cat = curr.category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(curr);
                    return acc;
                  }, {})
                ).map(([cat, subItems]) => (
                  <div key={cat} className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-[#ec5b13] tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-lg inline-block">{cat}</h4>
                    <div className="grid gap-3">
                      {subItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#ec5b13]/30 transition-all">
                          <div className="text-left flex-1 pr-4">
                            <p className="text-sm font-bold text-slate-700">{item.label}</p>
                          </div>
                          {canModify && (
                            <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                              <span className="material-symbols-outlined text-lg">delete_sweep</span>
                            </button>
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
