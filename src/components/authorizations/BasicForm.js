'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BasicForm({ pilots, drones, missions, org, loadData }) {
    const [saving, setSaving] = useState(false);
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loadingGeo, setLoadingGeo] = useState(true);
    const [prefix, setPrefix] = useState(org?.flight_prefix || 'BIT');

    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', department: '', municipality: '',
        scheduled_at: '', mission_type: 'SIMPLE CAPTURA DE IMÁGENES O DATOS' 
    });

    // CARGA DE GEOGRAFÍA INTERNA
    useEffect(() => {
        async function loadGeo() {
            const { data } = await supabase.from('colombia_geo').select('*').range(0, 1200).order('Nombre Departamento');
            if (data) {
                const uniqueDepts = [...new Set(data.map(i => i["Nombre Departamento"]))].sort();
                setGeo({ depts: uniqueDepts, munis: [], all: data });
            }
            setLoadingGeo(false);
        }
        loadGeo();
    }, []);

    const handleDeptChange = (deptName) => {
        const filtered = geo.all.filter(i => i["Nombre Departamento"] === deptName).map(i => i["Nombre Municipio"]).sort();
        setGeo(prev => ({ ...prev, munis: filtered }));
        setForm({ ...form, department: deptName, municipality: '' });
    };

    const handleUpdatePrefix = async () => {
        const newP = prompt("Ingrese el nuevo prefijo (3 letras):", prefix);
        if (newP && newP.length === 3) {
            const val = newP.toUpperCase();
            setPrefix(val);
            await supabase.from('organizations').update({ flight_prefix: val }).eq('id', org.id);
            alert("✅ Prefijo actualizado a: " + val);
        }
    };

    // SEMÁFOROS DE SEGURIDAD
    const getPilotStatus = () => {
        const p = pilots.find(x => x.id === form.pilot_id);
        if (!p || !p.medical_expiry) return null;
        const diff = (new Date(p.medical_expiry) - new Date()) / (1000 * 60 * 60 * 24);
        if (diff < 0) return { type: 'ERROR', msg: 'MÉDICO VENCIDO' };
        if (diff < 30) return { type: 'WARN', msg: `VENCE EN ${Math.round(diff)} DÍAS` };
        return { type: 'OK', msg: 'APTO PARA OPERACIÓN' };
    };

    const getDroneStatus = () => {
        const d = drones.find(x => x.id === form.aircraft_id);
        if (!d) return null;
        const remaining = 200 - (parseFloat(d.total_hours || 0) - parseFloat(d.last_maintenance_hours || 0));
        if (remaining <= 0) return { type: 'ERROR', msg: 'MANTENIMIENTO REQUERIDO' };
        if (remaining <= 20) return { type: 'WARN', msg: `${remaining.toFixed(1)}H PARA SERVICIO` };
        return { type: 'OK', msg: 'AERONAVE OPERATIVA' };
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        const pStat = getPilotStatus();
        const dStat = getDroneStatus();
        if (pStat?.type === 'ERROR' || dStat?.type === 'ERROR') return alert("🚫 BLOQUEO DE SEGURIDAD");

        setSaving(true);
        // SOLO enviamos las columnas que existen en flight_authorizations
        const payload = {
            pilot_id: form.pilot_id,
            aircraft_id: form.aircraft_id,
            mission_type: form.mission_type,
            scheduled_at: form.scheduled_at,
            location: `${form.municipality}, ${form.department}`
        };

        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data?.error || 'Error al guardar');

            alert(`🚀 MISIÓN AUTORIZADA: ${data.mission_id}`);
            setForm({ pilot_id: '', aircraft_id: '', department: '', municipality: '', scheduled_at: '', mission_type: 'SIMPLE CAPTURA DE IMÁGENES O DATOS' });
            if (loadData) loadData();
        } catch (err) {
            alert('⚠️ Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-left duration-500">
            {/* PANEL DE MANDO */}
            <section className="bg-[#1A202C] p-6 md:p-10 rounded-[3rem] text-white shadow-2xl space-y-8 border border-white/5">
                <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                        <StatusBox status={getPilotStatus()} title="Estatus PIC" defaultMsg="Seleccione Piloto" />
                        <StatusBox status={getDroneStatus()} title="Estatus UAS" defaultMsg="Seleccione Drone" />
                    </div>
                    <button onClick={handleUpdatePrefix} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-black text-orange-500 hover:bg-orange-600 hover:text-white transition-all">
                        PREFIJO: {prefix}
                    </button>
                </div>

                <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end text-left">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Piloto al Mando</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Aeronave (UAS)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Tipo de Operación (RAC 100)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                            <option value="SIMPLE CAPTURA DE IMÁGENES O DATOS">SIMPLE CAPTURA DE IMÁGENES</option>
                            <option value="VIGILANCIA Y SEGURIDAD PRIVADA">VIGILANCIA Y SEGURIDAD</option>
                            <option value="ASPERSIÓN / DISPERSIÓN">ASPERSIÓN / DISPERSIÓN</option>
                            <option value="TRANSPORTE DE CARGA">TRANSPORTE DE CARGA</option>
                            <option value="INSTRUCCIÓN">INSTRUCCIÓN</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Departamento</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.department} onChange={e => handleDeptChange(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Municipio</label>
                        <select required disabled={!form.department} className="w-full p-4 bg-slate-800 rounded-2xl border-none text-white text-sm font-bold disabled:opacity-30" value={form.municipality} onChange={e => setForm({...form, municipality: e.target.value})}>
                            <option value="">-- Seleccionar --</option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">Fecha Programada</label>
                        <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="md:col-span-3 bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                        {saving ? 'SINCRO EN CURSO...' : 'AUTORIZAR MISIÓN OPERATIVA'}
                    </button>
                </form>
            </section>
        </div>
    );
}

function StatusBox({ status, title, defaultMsg }) {
    if (!status) return <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5"><p className="text-xs font-black text-slate-500 uppercase">{title}</p><p className="text-xs font-bold text-slate-400">{defaultMsg}</p></div>;
    const colors = { ERROR: 'bg-red-500/20 border-red-500', WARN: 'bg-orange-500/20 border-orange-500', OK: 'bg-emerald-500/20 border-emerald-500' };
    return <div className={`px-4 py-2 rounded-xl border ${colors[status.type]}`}><p className="text-xs font-black uppercase opacity-60">{title}</p><p className="text-xs font-black">{status.msg}</p></div>;
}