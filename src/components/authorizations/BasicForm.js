'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BasicForm({ pilots, drones, missions, org, loadData }) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    // --- LÓGICA DE VALIDACIÓN TÉCNICA (SEMÁFORO) ---
    const getPilotStatus = () => {
        const p = pilots.find(x => x.id === form.pilot_id);
        if (!p || !p.medical_expiry) return null;
        const today = new Date();
        const expiry = new Date(p.medical_expiry);
        const diff = (expiry - today) / (1000 * 60 * 60 * 24);
        if (diff < 0) return { type: 'ERROR', msg: 'MÉDICO VENCIDO' };
        if (diff < 30) return { type: 'WARN', msg: `VENCE EN ${Math.round(diff)} DÍAS` };
        return { type: 'OK', msg: 'APTO PARA OPERACIÓN' };
    };

    const getDroneStatus = () => {
        const d = drones.find(x => x.id === form.aircraft_id);
        if (!d) return null;
        const currentHours = parseFloat(d.total_hours || 0);
        const lastHours = parseFloat(d.last_maintenance_hours || 0);
        const remaining = 200 - (currentHours - lastHours);
        if (remaining <= 0) return { type: 'ERROR', msg: 'MANTENIMIENTO REQUERIDO' };
        if (remaining <= 20) return { type: 'WARN', msg: `${remaining.toFixed(1)}H PARA SERVICIO` };
        return { type: 'OK', msg: 'AERONAVE OPERATIVA' };
    };

    const pStatus = getPilotStatus();
    const dStatus = getDroneStatus();

    const handleAuthorize = async (e) => {
        e.preventDefault();
        if (pStatus?.type === 'ERROR' || dStatus?.type === 'ERROR') return alert("🚫 BLOQUEO: Elementos vencidos");
        setSaving(true);
        try {
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
        } finally { setSaving(false); }
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('flight_authorizations').update({ status: newStatus }).eq('id', id);
        loadData();
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-left duration-500">
            {/* 1. PANEL DE MANDO (FORMULARIO) */}
            <section className="bg-[#1A202C] p-6 md:p-10 rounded-[2.5rem] text-white shadow-2xl space-y-8 border border-white/5">
                {/* SEMÁFOROS DE SEGURIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatusBox status={pStatus} title="Estatus Piloto" defaultMsg="Seleccione PIC" />
                    <StatusBox status={dStatus} title="Estatus Aeronave" defaultMsg="Seleccione UAS" />
                </div>

                <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Piloto al Mando</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar PIC...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Aeronave (UAS)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar UAS...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo de Misión</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold outline-none" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                            <option value="Operación Comercial">Operación Comercial</option>
                            <option value="Inspección Técnica">Inspección Técnica</option>
                            <option value="Entrenamiento">Entrenamiento</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" placeholder="Lugar de Operación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                        {saving ? 'SINCRO...' : 'EMITIR ORDEN'}
                    </button>
                </form>
            </section>

            {/* 2. TABLA DE CONTROL OPERATIVO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 bg-slate-50/50 border-b flex justify-between items-center">
                    <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Órdenes de Vuelo Emitidas</h3>
                    <span className="text-[10px] font-mono font-black text-orange-600 uppercase">Prefijo: {org?.flight_prefix}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                            <tr><th className="p-5">Orden</th><th className="p-5">PIC / UAS</th><th className="p-5">Estatus</th><th className="p-5 text-right">Acción</th></tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {missions.length > 0 ? missions.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                    <td className="p-5">
                                        <p className="font-bold text-slate-800">{m.pilots?.name || 'Sistema'}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase">{m.aircraft?.model || 'UAS'}</p>
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right space-x-2">
                                        <button onClick={() => updateStatus(m.id, 'realizado')} title="Marcar Realizado" className="material-symbols-outlined text-emerald-500 hover:scale-110 transition-all">check_circle</button>
                                        <button onClick={() => updateStatus(m.id, 'cancelado')} title="Cancelar" className="material-symbols-outlined text-red-400 hover:scale-110 transition-all">cancel</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-10 text-center text-slate-400 italic">No hay misiones programadas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBox({ status, title, defaultMsg }) {
    if (!status) return (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase">{title}</p>
            <p className="text-[10px] font-bold mt-1 text-slate-400 uppercase">{defaultMsg}</p>
        </div>
    );
    return (
        <div className={`p-4 rounded-2xl border ${status.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : status.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
            <p className="text-[8px] font-black uppercase text-white opacity-60">{title}</p>
            <p className="text-[10px] font-bold mt-1 text-white uppercase">{status.msg}</p>
        </div>
    );
}