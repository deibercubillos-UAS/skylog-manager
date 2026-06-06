'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { getColombiaGeo } from '@/lib/colombiaGeo';
import { GEO_TYPES, getZoneSummary, downloadFlightKMZ, generateFlightPlanPdf } from '@/lib/flightPlanDocs';

const MapPickerModal = dynamic(() => import('@/components/authorizations/MapPickerModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center">
      <div className="text-white text-xs font-black uppercase animate-pulse">Cargando mapa…</div>
    </div>
  ),
});

// Tipos de operación según RAC 100 — lista completa
const MISSION_TYPES = [
  'SIMPLE CAPTURA DE IMÁGENES O DATOS',
  'FOTOGRAMETRÍA Y MAPEO',
  'INSPECCIÓN DE INFRAESTRUCTURA',
  'INSPECCIÓN DE LÍNEAS ELÉCTRICAS',
  'INSPECCIÓN DE OLEODUCTOS / GASODUCTOS',
  'VIGILANCIA Y SEGURIDAD PRIVADA',
  'ASPERSIÓN / DISPERSIÓN AGRÍCOLA',
  'TRANSPORTE DE CARGA (DRONE DELIVERY)',
  'BÚSQUEDA Y RESCATE (SAR)',
  'APOYO A EMERGENCIAS',
  'INSTRUCCIÓN Y ENTRENAMIENTO',
  'PRUEBA Y DESARROLLO (I+D)',
  'FILMACIÓN Y PRODUCCIÓN AUDIOVISUAL',
  'BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL',
  'OPERACIÓN NOCTURNA',
  'ENJAMBRE / SWARM',
  'OTRA OPERACIÓN ESPECIAL',
];

export default function BasicForm({ pilots, drones, org, loadData }) {
    const [saving, setSaving] = useState(false);
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [, setLoadingGeo] = useState(true);

    const [form, setForm] = useState({
        op_name: '', pilot_id: '', aircraft_id: '', department: '', municipality: '',
        scheduled_at: '', takeoff_time: '08:00', mission_type: MISSION_TYPES[0],
        altitude: 120, notes: '',
    });

    // Zona de vuelo (mapa)
    const [geoType, setGeoType] = useState('polygon');
    const [zone, setZone] = useState(null);
    const [mapOpen, setMapOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [mapCenter, setMapCenter] = useState([4.7110, -74.0721]); // Bogotá por defecto
    const [mapZoom, setMapZoom] = useState(12);

    // Geocodifica "Municipio, Departamento, Colombia" para centrar el mapa.
    // Usa Nominatim (OpenStreetMap), sin API key. Falla en silencio → Bogotá.
    const geocodeMunicipality = async (muni, dept) => {
        if (!muni) return;
        try {
            const q = encodeURIComponent(`${muni}, ${dept}, Colombia`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json();
            if (Array.isArray(data) && data[0]) {
                setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                setMapZoom(13);
            }
        } catch { /* mantiene el centro actual */ }
    };

    // CARGA DE GEOGRAFÍA
    useEffect(() => {
        getColombiaGeo(supabase)
            .then(data => {
                const uniqueDepts = [...new Set(data.map(i => i["Nombre Departamento"]))].sort();
                setGeo({ depts: uniqueDepts, munis: [], all: data });
            })
            .catch(() => {})
            .finally(() => setLoadingGeo(false));
    }, []);

    const handleDeptChange = (deptName) => {
        const filtered = geo.all.filter(i => i["Nombre Departamento"] === deptName).map(i => i["Nombre Municipio"]).sort();
        setGeo(prev => ({ ...prev, munis: filtered }));
        setForm({ ...form, department: deptName, municipality: '' });
    };

    // SEMÁFOROS
    const getPilotStatus = () => {
        const p = pilots.find(x => x.id === form.pilot_id);
        if (!p || !p.medical_expiry) return null;
        const diff = (new Date(p.medical_expiry) - new Date()) / (1000 * 60 * 60 * 24);
        if (diff < 0)  return { type: 'ERROR', msg: 'MÉDICO VENCIDO' };
        if (diff < 30) return { type: 'WARN',  msg: `VENCE EN ${Math.round(diff)} DÍAS` };
        return { type: 'OK', msg: 'APTO PARA OPERACIÓN' };
    };
    const getDroneStatus = () => {
        const d = drones.find(x => x.id === form.aircraft_id);
        if (!d) return null;
        const remaining = 200 - (parseFloat(d.total_hours || 0) - parseFloat(d.last_maintenance_hours || 0));
        if (remaining <= 0)  return { type: 'ERROR', msg: 'MANTENIMIENTO REQUERIDO' };
        if (remaining <= 20) return { type: 'WARN',  msg: `${remaining.toFixed(1)}H PARA SERVICIO` };
        return { type: 'OK', msg: 'AERONAVE OPERATIVA' };
    };

    const summary = zone ? getZoneSummary(geoType, zone.points, zone.radius) : null;

    // Datos para KMZ/PDF
    const planData = () => {
        const pilot = pilots.find(p => p.id === form.pilot_id);
        return {
            opName:      form.op_name?.trim() || form.mission_type,
            flightDate:  form.scheduled_at,
            takeoffTime: form.takeoff_time,
            altitude:    form.altitude,
            notes:       form.notes,
            geoType, zone, summary,
            pilotInfo: {
                name:    pilot?.name || '',
                email:   pilot?.email || '',
                orgName: org?.company_name || '',
                orgNit:  org?.tax_id || '',
            },
        };
    };

    const handleDownloadKMZ = async () => {
        if (!form.op_name?.trim() && !form.mission_type) return;
        setDownloading(true);
        try { await downloadFlightKMZ(planData()); }
        finally { setDownloading(false); }
    };

    const handleDownloadPDF = async () => {
        setGeneratingPdf(true);
        try { await generateFlightPlanPdf(planData()); }
        catch (e) { toast.error('No se pudo generar el PDF: ' + e.message); }
        finally { setGeneratingPdf(false); }
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        const pStat = getPilotStatus();
        const dStat = getDroneStatus();
        if (pStat?.type === 'ERROR' || dStat?.type === 'ERROR') return toast.error("Bloqueo de seguridad: resuelva las alertas críticas antes de continuar.");

        setSaving(true);
        const payload = {
            pilot_id:    form.pilot_id,
            aircraft_id: form.aircraft_id,
            mission_type: form.mission_type,
            scheduled_at: form.scheduled_at,
            location: `${form.municipality}, ${form.department}`,
        };
        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Error al guardar');
            toast.success(`Misión autorizada: ${data.mission_id}`);
            setForm({ op_name: '', pilot_id: '', aircraft_id: '', department: '', municipality: '', scheduled_at: '', takeoff_time: '08:00', mission_type: MISSION_TYPES[0], altitude: 120, notes: '' });
            setZone(null);
            if (loadData) loadData();
        } catch (err) {
            toast.error('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const pStat = getPilotStatus();
    const dStat = getDroneStatus();
    const canDownload = !!(form.op_name?.trim() || form.mission_type);

    const inputCls = "w-full bg-slate-800 p-3.5 rounded-2xl border-none text-white text-sm font-bold";

    return (
        <div className="space-y-8 animate-in slide-in-from-left duration-500">
            <div className="bg-[#1A202C] p-5 md:p-8 rounded-[2.5rem] text-white shadow-2xl border border-white/5">
                <div className="flex flex-wrap gap-3 mb-6">
                    <StatusBox status={pStat} title="Estatus PIC"  defaultMsg="Seleccione Piloto" />
                    <StatusBox status={dStat} title="Estatus UAS"  defaultMsg="Seleccione Drone" />
                </div>

                <form onSubmit={handleAuthorize} className="space-y-6">
                    {/* ── Datos de la misión ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Nombre de la operación</label>
                            <input type="text" placeholder="Ej: Inspección eléctrica – Vereda El Roble" className={inputCls + ' placeholder-slate-600'} value={form.op_name} onChange={e => setForm({...form, op_name: e.target.value})} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Piloto al Mando (PIC)</label>
                            <select required className={inputCls} value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                                <option value="">— Seleccionar —</option>
                                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Aeronave (UAS)</label>
                            <select required className={inputCls} value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                <option value="">— Seleccionar —</option>
                                {drones.map(d => <option key={d.id} value={d.id}>{d.model} — {d.serial_number}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Tipo de Operación (RAC 100)</label>
                            <select required className={inputCls} value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                                {MISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Departamento</label>
                            <select required className={inputCls} value={form.department} onChange={e => handleDeptChange(e.target.value)}>
                                <option value="">— Seleccionar —</option>
                                {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Municipio</label>
                            <select required disabled={!form.department} className={inputCls + ' disabled:opacity-30'} value={form.municipality} onChange={e => { setForm({...form, municipality: e.target.value}); geocodeMunicipality(e.target.value, form.department); }}>
                                <option value="">— Seleccionar —</option>
                                {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Fecha Programada</label>
                            <input required type="date" className={inputCls} value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Hora de despegue</label>
                            <input type="time" className={inputCls} value={form.takeoff_time} onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                        </div>
                    </div>

                    {/* ── Zona de vuelo (mapa) ── */}
                    <div className="border-t border-white/10 pt-6 space-y-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Zona de vuelo</p>

                        <div className="grid grid-cols-3 gap-2">
                            {GEO_TYPES.map(t => (
                                <button type="button" key={t.key}
                                    onClick={() => { setGeoType(t.key); setZone(null); }}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                                        geoType === t.key ? 'border-orange-400 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}>
                                    <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                                    <span className="text-xs font-black uppercase leading-tight">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Altitud máxima AGL</label>
                            <div className="flex items-center gap-4 bg-slate-800 rounded-2xl px-4 py-3">
                                <input type="range" min="10" max="400" step="10" value={form.altitude} onChange={e => setForm({...form, altitude: Number(e.target.value)})} className="flex-1 accent-orange-500" />
                                <span className="text-sm font-black w-16 text-right shrink-0">{form.altitude} m</span>
                            </div>
                            {form.altitude > 120 && (
                                <p className="text-xs text-orange-400 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    Sobre 120 m AGL requiere autorización especial (RAC 100.32)
                                </p>
                            )}
                        </div>

                        <button type="button" onClick={() => setMapOpen(true)}
                            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 border-dashed border-orange-400/50 text-orange-400 hover:bg-orange-500/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">add_location_alt</span>
                            {zone ? 'Editar zona en el mapa' : 'Definir zona en el mapa'}
                        </button>

                        {summary && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {summary.map(s => (
                                    <div key={s.label}>
                                        <p className="text-xs font-black text-slate-400 uppercase">{s.label}</p>
                                        <p className="text-sm font-black mt-0.5">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase ml-1">Observaciones</label>
                            <textarea rows={2} placeholder="Condiciones de viento, punto de despegue, etc." className={inputCls + ' placeholder-slate-600 resize-none'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                        </div>
                    </div>

                    {/* ── Acciones ── */}
                    <div className="space-y-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50">
                            {saving ? 'SINCRONIZANDO...' : 'AUTORIZAR MISIÓN OPERATIVA'}
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button type="button" onClick={handleDownloadKMZ} disabled={!canDownload || downloading}
                                className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
                                <span className="material-symbols-outlined text-base">{downloading ? 'progress_activity' : 'download'}</span>
                                {downloading ? 'Generando…' : 'Descargar KMZ'}
                            </button>
                            <button type="button" onClick={handleDownloadPDF} disabled={!canDownload || generatingPdf}
                                className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
                                <span className="material-symbols-outlined text-base">{generatingPdf ? 'progress_activity' : 'picture_as_pdf'}</span>
                                {generatingPdf ? 'Generando…' : 'Descargar PDF'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {mapOpen && (
                <MapPickerModal
                    type={geoType}
                    points={zone?.points || []}
                    initialCenter={mapCenter}
                    initialZoom={mapZoom}
                    onSave={({ points, radius }) => { setZone({ points, radius }); setMapOpen(false); }}
                    onClose={() => setMapOpen(false)}
                />
            )}
        </div>
    );
}

function StatusBox({ status, title, defaultMsg }) {
    if (!status) return (
        <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5">
            <p className="text-xs font-black text-slate-500 uppercase">{title}</p>
            <p className="text-xs font-bold text-slate-400">{defaultMsg}</p>
        </div>
    );
    const colors = {
        ERROR: 'bg-red-500/20 border-red-500',
        WARN:  'bg-orange-500/20 border-orange-500',
        OK:    'bg-emerald-500/20 border-emerald-500',
    };
    return (
        <div className={`px-4 py-2 rounded-xl border ${colors[status.type]}`}>
            <p className="text-xs font-black uppercase opacity-60">{title}</p>
            <p className="text-xs font-black">{status.msg}</p>
        </div>
    );
}
