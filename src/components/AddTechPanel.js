'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function AddTechPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', category: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Rutar por /api/fleet/tech para que el servidor verifique límites del plan
      const res = await fetch('/api/fleet/tech', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* body no era JSON */ }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}: ${res.statusText || 'Error al registrar el equipo.'}`);
      toast.success("Equipo registrado correctamente.");
      onSuccess();
    } catch (err) {
      toast.error("Error de registro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[250] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Registrar Payload</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">Tipo de Equipo</label>
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Ej: Cámara Térmica" onChange={e => setForm({...form, category: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">Marca / Modelo</label>
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Marca" onChange={e => setForm({...form, brand: e.target.value})} />
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">Serial (S/N)</label>
            <input required className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-mono text-sm uppercase mt-1" placeholder="S/N" onChange={e => setForm({...form, serial_number: e.target.value})} />
          </div>
          <button disabled={loading} type="submit" className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-60">
            {loading ? 'SINCRO...' : 'CONFIRMAR CARGA'}
          </button>
        </form>
      </div>
    </aside>
  );
}
