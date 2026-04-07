'use client';
import { useState } from 'react';

export default function EditAuthorizationPanel({ mission, pilots, drones, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    // Separamos el ID para que solo edite las letras
    const [prefix, setPrefix] = useState(mission.mission_id.split('-')[0]);
    const sequence = mission.mission_id.split('-')[1];

    const [form, setForm] = useState({
        id: mission.id,
        pilot_id: mission.pilot_id,
        aircraft_id: mission.aircraft_id,
        location: mission.location,
        scheduled_at: mission.scheduled_at.split('T')[0] // Solo fecha
    });

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const finalMissionId = `${prefix.toUpperCase().substring(0,3)}-${sequence}`;
        
        const res = await fetch('/api/flights/authorize', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, mission_id: finalMissionId })
        });

        if (res.ok) {
            alert("✅ Misión actualizada.");
            onSuccess();
        } else {
            alert("❌ Error al actualizar.");
        }
        setLoading(false);
    };

    return (
        <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[250] p-8 flex flex-col text-left animate-in slide-in-from-right">
            <h3 className="text-xl font-black uppercase mb-8">Editar Misión</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Prefijo (3 letras)</label>
                        <input required maxLength="3" className="w-full p-3 bg-slate-50 rounded-xl font-black text-center" 
                               value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} />
                    </div>
                    <span className="mb-3 font-bold">-</span>
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Consecutivo</label>
                        <input disabled className="w-full p-3 bg-slate-100 rounded-xl font-mono text-center text-slate-400" value={sequence} />
                    </div>
                </div>

                <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                    {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                </select>

                <input required className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />

                <button disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-xl shadow-lg uppercase text-xs mt-6">
                    {loading ? 'Guardando...' : 'Actualizar Misión'}
                </button>
                <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
            </form>
        </aside>
    );
}