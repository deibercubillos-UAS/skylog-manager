'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';

const FlightPlanner = dynamic(() => import('@/components/FlightPlanner'), { ssr: false });

export default function MissionControlClient({ initialData }) {
    const [activeTab, setActiveTab] = useState('basica');
    const [missions, setMissions] = useState([]);
    const [loadingMissions, setLoadingMissions] = useState(true);
    const { pilots, drones, org, userRole } = initialData;

    // CARGAR TABLA DE PROGRAMACIÓN
    const loadData = useCallback(async () => {
        setLoadingMissions(true);
        try {
            const res = await fetch('/api/flights/authorize');
            const data = await res.json();
            setMissions(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error cargando programación', e);
        } finally {
            setLoadingMissions(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const statusBadge = (status) => {
        const map = {
            autorizado: 'bg-orange-50 text-orange-600 border-orange-200',
            realizado:  'bg-emerald-50 text-emerald-600 border-emerald-200',
            cancelado:  'bg-red-50 text-red-600 border-red-200',
        };
        const label = (status || 'autorizado').toUpperCase();
        const cls = map[status] || 'bg-slate-50 text-slate-500 border-slate-200';
        return <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${cls}`}>{label}</span>;
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 text-left">
            {/* HEADER */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-navy uppercase tracking-tighter">Autorización de Vuelo</h2>
                    <p className="text-slate-500 text-xs font-black uppercase italic">
                        Centro de Control: {org?.company_name}
                    </p>
                </div>
                <Link href="/dashboard" className="text-xs font-black text-primary uppercase underline">
                    Volver al mando
                </Link>
            </header>

            {/* SELECTOR DE PESTAÑAS */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                    onClick={() => setActiveTab('basica')}
                    className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Misión Básica
                </button>
                <button
                    onClick={() => setActiveTab('aerocivil')}
                    className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Apéndice 13
                </button>
                <button
                    onClick={() => setActiveTab('planear')}
                    className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'planear' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Planear (Mapa · KMZ · PDF)
                </button>
            </div>

            {/* FORMULARIOS */}
            {activeTab === 'planear' ? (
                <FlightPlanner showHeader={false} />
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-12">
                    {activeTab === 'basica' ? (
                        <BasicForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={loadData} />
                    ) : (
                        <AerocivilForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={loadData} />
                    )}
                </div>
            )}

            {/* TABLA DE PROGRAMACIONES */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Programación Activa</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {missions.length} misiones registradas
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 text-xs font-black uppercase text-slate-400 hover:text-orange-600 transition-colors"
                    >
                        Refrescar
                    </button>
                </div>

                {loadingMissions ? (
                    <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">
                        Cargando programación...
                    </div>
                ) : missions.length === 0 ? (
                    <div className="p-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">event_available</span>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Sin misiones programadas</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {missions.map(m => (
                                <div key={m.id} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black font-mono text-orange-600">{m.mission_id}</p>
                                            <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{m.pilots?.name || '---'}</p>
                                            <p className="text-xs text-slate-400 uppercase font-bold truncate">{m.aircraft?.model || '---'}</p>
                                        </div>
                                        {statusBadge(m.status)}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="font-bold">{m.scheduled_at}</span>
                                        {m.location && <span className="truncate">· {m.location}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left min-w-[900px]">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                                        <th className="px-5 py-4">N° Misión</th>
                                        <th className="px-5 py-4">Fecha</th>
                                        <th className="px-5 py-4">Piloto (PIC)</th>
                                        <th className="px-5 py-4">Aeronave</th>
                                        <th className="px-5 py-4">Ubicación</th>
                                        <th className="px-5 py-4">Tipo</th>
                                        <th className="px-5 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {missions.map(m => (
                                        <tr key={m.id} className="hover:bg-orange-50/30 transition-all text-xs">
                                            <td className="px-5 py-4 font-black font-mono text-orange-600">{m.mission_id}</td>
                                            <td className="px-5 py-4 text-slate-700 whitespace-nowrap">{m.scheduled_at}</td>
                                            <td className="px-5 py-4 font-bold text-slate-900">{m.pilots?.name || '---'}</td>
                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                {m.aircraft?.model || '---'}
                                                {m.aircraft?.serial_number && <span className="block font-mono text-xs text-slate-400">S/N {m.aircraft.serial_number}</span>}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate">{m.location}</td>
                                            <td className="px-5 py-4 text-xs uppercase text-slate-500 max-w-[180px] truncate">{m.mission_type}</td>
                                            <td className="px-5 py-4 text-right">{statusBadge(m.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            {/* FOOTER DE ESTADO */}
            <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Sincronizado con base de datos - {pilots.length} pilotos disponibles
                </span>
            </div>
        </div>
    );
}