'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    if (!form.aircraft_id) return alert("⚠️ Selecciona una aeronave.");
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
        alert("✅ Mantenimiento registrado y contadores del drone actualizados.");
        onSuccess();
    } catch (err) {
        alert("⚠️ Error: " + err.message);
    } finally {
        setLoading(false);
    }
};

    return (
        <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[250] p-10 flex flex-col text-left animate-in slide-in-from-right">
            <h3 className="text-xl font-black uppercase mb-8">Registrar Mantenimiento</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                    <option value="">Seleccionar Drone...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                </select>
                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})}>
                    <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                    <option value="CORRECTIVO">Reparación Correctiva</option>
                    <option value="ACTUALIZACIÓN">Actualización de Software</option>
                </select>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre del Técnico" onChange={e => setForm({...form, technician_name: e.target.value})} />
                <input required type="number" step="0.01" className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-sm" placeholder="Horas en servicio (0.00)" onChange={e => setForm({...form, hours_at_service: e.target.value})} />
                <textarea required rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium" placeholder="Descripción de la tarea..." onChange={e => setForm({...form, description: e.target.value})} />
                <button disabled={loading} className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs">
                    {loading ? 'Sincronizando...' : 'Guardar en Bitácora'}
                </button>
                <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
            </form>
        </aside>
    );
}
