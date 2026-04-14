'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMaintenancePanel({ onClose, onSuccess }) {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ aircraft_id: '', technician_name: '', maintenance_type: 'PREVENTIVO', description: '', hours_at_service: 0 });

    useEffect(() => {
        async function loadDrones() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const { data } = await supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id);
            setDrones(data || []);
        }
        loadDrones();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/maintenance', { method: 'POST', body: JSON.stringify(form) });
        if (res.ok) onSuccess();
        setLoading(false);
    };

    return (
        <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-10 flex flex-col text-left animate-in slide-in-from-right">
            <h3 className="text-xl font-black uppercase mb-8 tracking-tighter text-slate-900">Registrar Mantenimiento</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                    <option value="">Seleccionar Drone...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                </select>
                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, maintenance_type: e.target.value})}>
                    <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                    <option value="CORRECTIVO">Reparación Correctiva</option>
                    <option value="ACTUALIZACIÓN">Actualización de Software/Hardware</option>
                </select>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre del Ingeniero/Técnico" onChange={e => setForm({...form, technician_name: e.target.value})} />
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-orange-600 ml-1">Horómetro Actual</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-sm" placeholder="0.00" onChange={e => setForm({...form, hours_at_service: e.target.value})} />
                </div>
                <textarea required rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium" placeholder="Descripción detallada de la intervención..." onChange={e => setForm({...form, description: e.target.value})} />
                
                <button disabled={loading} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
                    {loading ? 'Sincronizando...' : 'GUARDAR EN BITÁCORA TÉCNICA'}
                </button>
                <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
            </form>
        </aside>
    );
}