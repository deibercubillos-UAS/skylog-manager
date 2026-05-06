'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function AddMaintenancePanel({ onClose, onSuccess }) {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        aircraft_id: '',
        technician_name: '',
        maintenance_type: 'PREVENTIVO',
        description: '',
        hours_at_service: 0
    });

    useEffect(() => {
        async function loadDrones() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (prof?.organization_id) {
                const { data } = await supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id);
                setDrones(data || []);
            }
        }
        loadDrones();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.aircraft_id) { toast.warn("Selecciona una aeronave."); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aircraft_id: form.aircraft_id,
                    technician_name: form.technician_name,
                    maintenance_type: form.maintenance_type,
                    description: form.description,
                    hours_at_service: parseFloat(form.hours_at_service || 0)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Error al guardar');
            toast.success("Mantenimiento registrado y contadores actualizados.");
            onSuccess();
        } catch (err) {
            toast.error("Error: " + err.message);
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
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Registrar Mantenimiento</h3>
            <button type="button" onClick={onClose}
              className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                <option value="">Seleccionar Drone...</option>
                {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
              </select>
              <select required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})}>
                <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                <option value="CORRECTIVO">Reparación Correctiva</option>
                <option value="ACTUALIZACIÓN">Actualización de Software</option>
              </select>
              <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Nombre del Técnico" onChange={e => setForm({...form, technician_name: e.target.value})} />
              <div>
                <label className="text-xs font-black text-orange-600 uppercase ml-1">Horas en servicio</label>
                <input required type="number" step="0.01" className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-sm mt-1" placeholder="0.00" onChange={e => setForm({...form, hours_at_service: e.target.value})} />
              </div>
              <textarea required rows="4" className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-medium resize-none" placeholder="Descripción de la tarea..." onChange={e => setForm({...form, description: e.target.value})} />
              <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs disabled:opacity-60 active:scale-95 transition-all">
                {loading ? 'Sincronizando...' : 'Guardar en Bitácora'}
              </button>
            </form>
          </div>
        </aside>
    );
}
