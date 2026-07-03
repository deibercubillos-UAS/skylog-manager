'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { getColombiaGeo } from '@/lib/colombiaGeo';
import { GEO_TYPES, getZoneSummary, downloadFlightKMZ, generateFlightPlanPdf } from '@/lib/flightPlanDocs';
import WeatherWidget from '@/components/WeatherWidget';

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

export default function BasicForm({ pilots, drones, org, loadData, onClose }) {
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
    const [weatherCoords, setWeatherCoords] = useState(null); // [lat, lon] del municipio seleccionado
    const [scheduleConflict, setScheduleConflict] = useState(null); // { missions } si el PIC ya tiene misión cercana

    // Aviso en vivo de conflicto de horario del PIC (Fase 5.b). No bloquea el envío.
    useEffect(() => {
        if (!form.pilot_id || !form.scheduled_at) { setScheduleConflict(null); return; }
        const dt = `${form.scheduled_at}T${form.takeoff_time || '08:00'}:00`;
        let active = true;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/flights/conflicts?pilot_id=${form.pilot_id}&scheduled_at=${encodeURIComponent(dt)}`);
                const data = await res.json();
                if (active) setScheduleConflict(data.conflict ? data : null);
            } catch { if (active) setScheduleConflict(null); }
        }, 400);
        return () => { active = false; clearTimeout(t); };
    }, [form.pilot_id, form.scheduled_at, form.takeoff_time]);

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
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setMapCenter([lat, lon]);
                setMapZoom(13);
                setWeatherCoords([lat, lon]);
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
            // Guardar la planeación para regenerar KMZ/PDF desde Programación Activa
            plan_data: {
                op_name:      form.op_name?.trim() || form.mission_type,
                geo_type:     geoType,
                points:       zone?.points ?? [],
                radius:       zone?.radius ?? null,
                altitude:     form.altitude,
                takeoff_time: form.takeoff_time,
                notes:        form.notes?.trim() || null,
            },
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
    const selectedAircraft = drones.find(d => d.id === form.aircraft_id);
    const preflightOn = org?.enable_preflight ?? true;

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
    const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

    return (
        <div className="space-y-5 animate-in slide-in-from-left duration-500">
            {/* Hero — mismo tono navy que PageHero, contexto de la acción */}
            <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Programación</p>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">Programar nuevo vuelo</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Asigna aeronave, tripulación y horario</p>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span className="text-[10px] font-bold">Solo Admin / Jefe de Pilotos</span>
                </div>
            </div>

            {/* Aviso de conflicto de horario del PIC (no bloqueante) */}
            {scheduleConflict?.missions?.length > 0 && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <span className="material-symbols-outlined text-red-600 text-xl shrink-0">warning</span>
                    <p className="text-xs font-bold text-red-700 leading-relaxed">
                        Este piloto ya tiene una misión programada ese día
                        ({scheduleConflict.missions.map(m => m.mission_id).join(', ')}) — revisa la agenda antes de programar.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <StatusBox status={pStat} title="Estatus PIC"  defaultMsg="Seleccione Piloto" />
                <StatusBox status={dStat} title="Estatus UAS"  defaultMsg="Seleccione Drone" />
            </div>

            <form onSubmit={handleAuthorize} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {/* ── Columna izquierda: datos de la misión ── */}
                    <div className="space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Datos de la misión</p>

                        <div className="space-y-1">
                            <label className={labelCls}>Tipo de misión</label>
                            <select required className={inputCls} value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                                {MISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className={labelCls}>Fecha</label>
                                <input required type="date" className={inputCls} value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Hora inicio</label>
                                <input type="time" className={inputCls} value={form.takeoff_time} onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className={labelCls}>Nombre de la operación (opcional)</label>
                            <input type="text" placeholder="Ej: Inspección eléctrica – Vereda El Roble" className={inputCls + ' placeholder-slate-400'} value={form.op_name} onChange={e => setForm({...form, op_name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className={labelCls}>Departamento</label>
                                <select required className={inputCls} value={form.department} onChange={e => handleDeptChange(e.target.value)}>
                                    <option value="">— Seleccionar —</option>
                                    {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Municipio</label>
                                <select required disabled={!form.department} className={inputCls + ' disabled:opacity-40'} value={form.municipality} onChange={e => { setForm({...form, municipality: e.target.value}); geocodeMunicipality(e.target.value, form.department); }}>
                                    <option value="">— Seleccionar —</option>
                                    {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1 flex-1 flex flex-col">
                            <label className={labelCls}>Observaciones de la zona de operación</label>
                            <textarea rows={3} placeholder="Condiciones de viento, punto de despegue, etc." className={inputCls + ' placeholder-slate-400 resize-none'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                        </div>
                    </div>

                    {/* ── Columna derecha: asignación de recursos ── */}
                    <div className="space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Asignación de recursos</p>

                        <div className="space-y-1">
                            <label className={labelCls}>Aeronave (UAS)</label>
                            <select required className={inputCls} value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                <option value="">— Seleccionar —</option>
                                {drones.map(d => <option key={d.id} value={d.id}>{d.model} — {d.serial_number}</option>)}
                            </select>
                            {selectedAircraft && (
                                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 ml-0.5">
                                    <span className="material-symbols-outlined text-xs">flight</span> Disponible
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className={labelCls}>Piloto al mando (PIC)</label>
                            <select required
                                className={inputCls + (scheduleConflict?.missions?.length > 0 ? ' !border-red-300 !bg-red-50' : '')}
                                value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                                <option value="">— Seleccionar —</option>
                                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {weatherCoords && (
                            <WeatherWidget
                                lat={weatherCoords[0]}
                                lon={weatherCoords[1]}
                                label={form.municipality ? `${form.municipality}, ${form.department}` : undefined}
                            />
                        )}

                        <div className="space-y-1.5">
                            <label className={labelCls}>Altura de vuelo (AGL)</label>
                            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <input type="range" min="10" max="400" step="10" value={form.altitude} onChange={e => setForm({...form, altitude: Number(e.target.value)})} className="flex-1 accent-orange-500" />
                                <span className="text-sm font-black w-16 text-right shrink-0 text-slate-900">{form.altitude} m</span>
                            </div>
                            {form.altitude > 120 && (
                                <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    Sobre 120 m AGL requiere autorización especial (RAC 100.32)
                                </p>
                            )}
                        </div>

                        <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${preflightOn ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                                <span className={`material-symbols-outlined text-lg ${preflightOn ? 'text-emerald-600' : 'text-slate-400'}`}>checklist</span>
                                <span className="text-xs font-bold text-slate-700">Checklist pre-vuelo</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${preflightOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {preflightOn ? 'Activo' : 'Desactivado'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Zona de vuelo (mapa) ── */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                    <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Zona de operación</p>

                    <div className="grid grid-cols-3 gap-2">
                        {GEO_TYPES.map(t => (
                            <button type="button" key={t.key}
                                onClick={() => { setGeoType(t.key); setZone(null); }}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all active:scale-95 ${
                                    geoType === t.key ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                                <span className="text-xs font-black uppercase leading-tight">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <button type="button" onClick={() => setMapOpen(true)}
                        className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">add_location_alt</span>
                        {zone ? 'Editar zona en el mapa' : 'Definir zona en el mapa'}
                    </button>

                    {summary && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {summary.map(s => (
                                <div key={s.label}>
                                    <p className="text-[10px] font-black text-emerald-700/70 uppercase">{s.label}</p>
                                    <p className="text-sm font-black mt-0.5 text-emerald-800">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Exportar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Exportar planeación</span>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={handleDownloadKMZ} disabled={!canDownload || downloading}
                            className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-orange-600 transition-colors disabled:opacity-40">
                            <span className="material-symbols-outlined text-base">{downloading ? 'progress_activity' : 'map'}</span>
                            {downloading ? 'Generando…' : 'Descargar KMZ'}
                        </button>
                        <button type="button" onClick={handleDownloadPDF} disabled={!canDownload || generatingPdf}
                            className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-orange-600 transition-colors disabled:opacity-40">
                            <span className="material-symbols-outlined text-base">{generatingPdf ? 'progress_activity' : 'picture_as_pdf'}</span>
                            {generatingPdf ? 'Generando…' : 'Descargar PDF'}
                        </button>
                    </div>
                </div>

                {/* ── Acciones ── */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                    {onClose && (
                        <button type="button" onClick={onClose}
                            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
                            Cancelar
                        </button>
                    )}
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        {saving ? 'SINCRONIZANDO...' : 'Programar misión'}
                    </button>
                </div>
            </form>

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
        <div className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50">
            <p className="text-xs font-black text-slate-400 uppercase">{title}</p>
            <p className="text-xs font-bold text-slate-400">{defaultMsg}</p>
        </div>
    );
    const colors = {
        ERROR: 'bg-red-50 border-red-300 text-red-700',
        WARN:  'bg-orange-50 border-orange-300 text-orange-700',
        OK:    'bg-emerald-50 border-emerald-300 text-emerald-700',
    };
    return (
        <div className={`px-4 py-2 rounded-xl border ${colors[status.type]}`}>
            <p className="text-xs font-black uppercase opacity-60">{title}</p>
            <p className="text-xs font-black">{status.msg}</p>
        </div>
    );
}
