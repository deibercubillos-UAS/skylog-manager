'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMaintenancePanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState([]);
  const [form, setForm] = useState({ aircraft_id: '', maintenance_type: 'ROUTINE', technician: '', description: '' });

  useEffect(() => {
    async function loadDrones() {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/fleet?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setDrones(data || []);
    }
    loadDrones();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ userId: session.user.id, logData: form })
    });

    if (res.ok) {
      alert("✅ Intervención registrada exitosamente.");
      onSuccess();
    } else {
      alert("Falla al registrar mantenimiento.");
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300">
      <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Registrar Tarea</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none" onChange={e => setForm({...form, aircraft_id: e.target.value})}>
          <option value="">Seleccionar Drone...</option>
          {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
            {['ROUTINE', 'REPAIR', 'UPDATE'].map(t => (
                <button key={t} type="button" onClick={() => setForm({...form, maintenance_type: t})} className={`py-2 text-[10px] font-black rounded-lg border ${form.maintenance_type === t ? 'bg-[#ec5b13] border-[#ec5b13] text-white' : 'text-slate-400'}`}>{t}</button>
            ))}
        </div>
        <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Ingeniero / Técnico" onChange={e => setForm({...form, technician: e.target.value})} />
        <textarea required rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm" placeholder="Descripción de la tarea..." onChange={e => setForm({...form, description: e.target.value})} />
        <button disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">{loading ? 'Procesando...' : 'Guardar en Bitácora Técnica'}</button>
      </form>
    </aside>
  );
}