'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SafetyConfigPage() {
  const [activeTab, setActiveTab] = useState('checklist');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ checklist: [], sora: [] });
  const [userProfile, setUserProfile] = useState(null);
  const [form, setForm] = useState({ category: '', label: '', score: 1 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Cargar Perfil para validar ROL en UI
      const profRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const profData = await profRes.json();
      setUserProfile(profData);

      // 2. Cargar Protocolos
      const res = await fetch(`/api/safety-config?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Lógica de Permiso: Solo Admin y Gerente SMS
  const canModify = userProfile?.role === 'admin' || userProfile?.role === 'gerente_sms';

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canModify) return alert("No tienes permisos para agregar protocolos.");

    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      userId: session.user.id,
      type: activeTab,
      data: { category: form.category || 'General', label: form.label, ...(activeTab === 'sora' && { score: form.score }) }
    };

    const res = await fetch('/api/safety-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setForm({ category: '', label: '', score: 1 });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!canModify) return alert("No tienes permisos para eliminar.");
    if (!confirm("¿Eliminar este requerimiento de seguridad de forma permanente?")) return;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/safety-config/${id}?type=${activeTab}&userId=${session.user.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (res.ok) fetchData();
    else {
      const err = await res.json();
      alert(err.error);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO PROTOCOLOS...</div>;

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Protocolos de Seguridad</h2>
          <p className="text-slate-500 text-sm">Estandarización de seguridad para operaciones BitaFly.</p>
        </div>
        {!canModify && (
          <div className="bg-orange-50 text-[#ec5b13] px-4 py-2 rounded-xl border border-orange-100 text-[10px] font-black uppercase">
            Modo Consulta: Edición Protegida
          </div>
        )}
      </header>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit mb-10 shadow-sm">
        {['checklist', 'sora'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-[#ec5b13] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {t === 'checklist' ? 'Checklist Pre-Vuelo' : 'Análisis SORA'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FORMULARIO: Solo se muestra si tiene permisos */}
        <div className="lg:col-span-1">
          {canModify ? (
            <form onSubmit={handleAdd} className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-6 sticky top-24 shadow-2xl border border-white/5">
              <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4">Nuevo Requerimiento</h3>
              <input required className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-bold outline-none" placeholder="Grupo (Ej: Motores)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              <textarea required rows="3" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm outline-none" placeholder="Descripción del punto..." value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
              {activeTab === 'sora' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Puntaje SAIL</label>
                  <input type="number" min="1" max="10" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-black" value={form.score} onChange={e => setForm({...form, score: e.target.value})} />
                </div>
              )}
              <button type="submit" className="w-full bg-[#ec5b13] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Añadir al Protocolo</button>
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
                (activeTab === 'checklist' ? items.checklist : items.sora).reduce((acc, curr) => {
                  if (!acc[curr.category]) acc[curr.category] = [];
                  acc[curr.category].push(curr);
                  return acc;
                }, {})
              ).map(([cat, subItems]) => (
                <div key={cat} className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-lg inline-block">{cat}</h4>
                  <div className="grid gap-3">
                    {subItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#ec5b13]/30 transition-all">
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">{item.label}</p>
                          {item.score && <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-tighter">Impacto SORA: {item.score} pts</p>}
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