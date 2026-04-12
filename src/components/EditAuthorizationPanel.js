'use client';
import { useState } from 'react';

export default function EditAuthorizationPanel({ mission, pilots, drones, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ ...mission });

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) onSuccess();
        setLoading(false);
    };

    return (
        <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right">
            <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Corregir Misión</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">PIC (Piloto)</label>
                    <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Aeronave</label>
                    <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                </div>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Lugar" />
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                
                <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
                    {loading ? 'SINCRO...' : 'GUARDAR CAMBIOS'}
                </button>
                <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
            </form>
        </aside>
    );
}