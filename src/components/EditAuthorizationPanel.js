'use client';
import { useState } from 'react';

export default function EditAuthorizationPanel({ mission, pilots, drones, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        id: mission.id,
        pilot_id: mission.pilot_id,
        aircraft_id: mission.aircraft_id,
        location: mission.location,
        scheduled_at: mission.scheduled_at.split('T')[0],
        mission_id: mission.mission_id
    });

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) { onSuccess(); } else { alert("Error al actualizar"); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex justify-end">
            <aside className="w-full max-w-md bg-white h-full p-10 shadow-2xl animate-in slide-in-from-right duration-300">
                <h3 className="text-xl font-black uppercase mb-8">Editar Orden de Vuelo</h3>
                <form onSubmit={handleUpdate} className="space-y-4 text-left">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">ID Misión (No editable)</label>
                        <input disabled className="w-full p-3 bg-slate-100 rounded-xl font-mono font-bold" value={form.mission_id} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Piloto</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Aeronave</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" placeholder="Ubicación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    
                    <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-xl uppercase text-xs mt-6 shadow-lg">
                        {loading ? 'Sincronizando...' : 'Guardar Cambios'}
                    </button>
                    <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cerrar</button>
                </form>
            </aside>
        </div>
    );
}