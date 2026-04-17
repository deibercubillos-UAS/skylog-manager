'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BasicForm({ pilots, drones, missions, loadData }) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '', mission_type: 'Operación Comercial' });

    const handleAuthorize = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("✅ MISIÓN AUTORIZADA");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '', mission_type: 'Operación Comercial' });
            loadData();
        }
        setSaving(false);
    };

    return (
        <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl space-y-8 border border-white/5 animate-in slide-in-from-left duration-500">
            <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Piloto al Mando</label>
                    <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave (UAS)</label>
                    <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Tipo de Misión</label>
                    <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                        <option value="Operación Comercial">Operación Comercial</option>
                        <option value="Inspección Técnica">Inspección Técnica</option>
                        <option value="Vuelo de Prueba">Vuelo de Prueba</option>
                    </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" placeholder="Lugar de Operación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                </div>
                <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-all">
                    {saving ? '...' : 'EMITIR ORDEN'}
                </button>
            </form>
        </section>
    );
}