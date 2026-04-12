'use client';
import { useState, useEffect } from 'react';

export default function EditAuthorizationPanel({ mission, pilots, drones, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    
    // Inicialización de estado interna y segura
    const [form, setForm] = useState({
        id: '',
        pilot_id: '',
        aircraft_id: '',
        location: '',
        scheduled_at: '',
        mission_type: ''
    });

    // Efecto de carga inicial: Mapeamos solo lo necesario del objeto mission
    useEffect(() => {
        if (mission) {
            setForm({
                id: mission.id || '',
                pilot_id: mission.pilot_id || '',
                aircraft_id: mission.aircraft_id || '',
                location: mission.location || '',
                scheduled_at: mission.scheduled_at ? mission.scheduled_at.split('T')[0] : '',
                mission_type: mission.mission_type || 'Operación Comercial'
            });
        }
    }, [mission]);

    const handleUpdate = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            
            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json();
                alert("Error: " + err.error);
            }
        } catch (err) {
            alert("Falla de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (!mission) return null;

    return (
        <aside className="relative w-full max-w-md bg-white h-full shadow-2xl p-10 flex flex-col text-left animate-in slide-in-from-right duration-300 z-[210] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Corregir Misión</h3>
                    <p className="text-[10px] font-mono text-orange-600 font-bold">{mission.mission_id}</p>
                </div>
                <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500 transition-colors">close</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Piloto asignado</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Aeronave autorizada</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                    <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Fecha Programada</label>
                    <input required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm uppercase" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all mt-4">
                    {loading ? 'Sincronizando...' : 'Guardar Cambios'}
                </button>
            </form>
        </aside>
    );
}