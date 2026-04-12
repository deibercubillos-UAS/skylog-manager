'use client';
import { useState, useEffect } from 'react';

export default function EditAuthorizationPanel({ mission, pilots, drones, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    
    // LÓGICA DE LIMPIEZA DE FECHA: Convierte '2023-10-27T00:00:00' a '2023-10-27'
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    const [form, setForm] = useState({
        id: mission?.id || '',
        pilot_id: mission?.pilot_id || '',
        aircraft_id: mission?.aircraft_id || '',
        location: mission?.location || '',
        scheduled_at: formatDateForInput(mission?.scheduled_at),
        mission_type: mission?.mission_type || 'Operación Comercial'
    });

    // Sincronizar si la misión cambia mientras el panel está abierto
    useEffect(() => {
        if (mission) {
            setForm({
                id: mission.id,
                pilot_id: mission.pilot_id,
                aircraft_id: mission.aircraft_id,
                location: mission.location,
                scheduled_at: formatDateForInput(mission.scheduled_at),
                mission_type: mission.mission_type
            });
        }
    }, [mission]);

    const handleUpdate = async (e) => {
        e.preventDefault();
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
                alert("Error al actualizar la misión en el servidor.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-[250] p-10 flex flex-col text-left animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-tighter">Editar Orden</h3>
                <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Piloto al Mando</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Aeronave UAS</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación y Fecha</label>
                    <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Lugar" />
                    <input required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-2 uppercase" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
                    {loading ? 'SINCRONIZANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </form>
        </aside>
    );
}