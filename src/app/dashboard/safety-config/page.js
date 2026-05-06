'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SafetyConfigPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [form, setForm] = useState({ category: '', label: '', score: 1 });
  const [confirmDlg, setConfirmDlg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Cargar Perfil para validar ROL en UI
      const profRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const profData = await profRes.json();
      setUserProfile(profData);

      // 2. Cargar Análisis SORA
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

  // Lógica de Permiso: Solo Admin y Gerente SMS
  const canModify = ['superadmin', 'admin', 'gerente_sms'].includes(userProfile?.role);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canModify) return toast.error("No tienes permisos para agregar protocolos.");

    const payload = {
      type: 'sora',
      data: { category: form.category || 'General', label: form.label, score: form.score }
    };

    const res = await fetch('/api/safety-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setForm({ category: '', label: '', score: 1 });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!canModify) return toast.error("No tienes permisos para eliminar.");
    if (!id) return; // Seguridad extra

    setConfirmDlg({
      isOpen: true,
      title: 'Eliminar requerimiento',
      message: '¿Eliminar este requerimiento de seguridad?',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          const res = await fetch(`/api/safety-config/${id}?type=sora`, {
            method: 'DELETE',
          });

          if (res.ok) {
            fetchData(); // Refrescar lista
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

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500 pb-20">
      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Análisis SORA</h2>
          <p className="text-slate-500 text-sm">Requerimientos de seguridad operacional para evaluación de riesgo.</p>
        </div>
        {!canModify && (
          <div className="bg-orange-50 text-[#ec5b13] px-4 py-2 rounded-xl border border-orange-100 text-xs font-black uppercase">
            Modo Consulta: Edición Protegida
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FORMULARIO: Solo se muestra si tiene permisos */}
        <div className="lg:col-span-1">
          {canModify ? (
            <form onSubmit={handleAdd} className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-6 sticky top-24 shadow-2xl border border-white/5">
              <h3 className="text-[#ec5b13] text-xs font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4">Nuevo Requerimiento</h3>
              <input required className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-bold outline-none" placeholder="Grupo (Ej: Motores)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              <textarea required rows="3" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm outline-none" placeholder="Descripción del punto..." value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase ml-1">Puntaje SAIL</label>
                <input type="number" min="1" max="10" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-black" value={form.score} onChange={e => setForm({...form, score: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-[#ec5b13] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Añadir al Protocolo</button>
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
            <div className="space-y-10">
              {Object.entries(
                items.reduce((acc, curr) => {
                  if (!acc[curr.category]) acc[curr.category] = [];
                  acc[curr.category].push(curr);
                  return acc;
                }, {})
              ).map(([cat, subItems]) => (
                <div key={cat} className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#ec5b13] tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-lg inline-block">{cat}</h4>
                  <div className="grid gap-3">
                    {subItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#ec5b13]/30 transition-all">
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">{item.label}</p>
                          {item.score && <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-tighter">Impacto SORA: {item.score} pts</p>}
                        </div>
                        {/* El botón de borrar solo aparece si tiene permisos */}
                        {canModify && (
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete_sweep</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}