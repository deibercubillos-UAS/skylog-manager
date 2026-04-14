'use client';
import { useState, useEffect } from 'react';

export default function AuditPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit').then(res => res.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">GENERANDO DIAGNÓSTICO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-center border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Auditoría de Cumplimiento</h2>
                    <p className="text-slate-500 text-sm">Verificación de aeronavegabilidad y estatus de personal.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Salud Organizacional</p>
                    <p className={`text-4xl font-black ${data.score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{data.score}%</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* AUDITORÍA DE EQUIPOS */}
                <section className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">precision_manufacturing</span> Estatus de Flota
                    </h3>
                    <div className="space-y-3">
                        {data.fleet.map(d => (
                            <AuditCard key={d.id} title={d.model} sub={d.sn} status={d.isReady} reason={d.reason} docs={d.docs} />
                        ))}
                    </div>
                </section>

                {/* AUDITORÍA DE PERSONAL */}
                <section className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">group</span> Estatus de Tripulación
                    </h3>
                    <div className="space-y-3">
                        {data.crew.map(p => (
                            <AuditCard key={p.id} title={p.name} sub="Tripulante" status={p.isReady} reason={p.reason} docs={p.docs} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function AuditCard({ title, sub, status, reason, docs }) {
    return (
        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-orange-500/30 transition-all">
            <div className="flex items-center gap-4">
                <div className={`size-3 rounded-full ${status ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-red-500 animate-pulse'}`}></div>
                <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase leading-none">{title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{sub}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`text-[9px] font-black uppercase ${status ? 'text-emerald-600' : 'text-red-600'}`}>{reason}</p>
                <div className="flex justify-end gap-1 mt-1">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${docs ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'}`}>
                        {docs ? 'DOCS OK' : 'DOCS FALTANTES'}
                    </span>
                </div>
            </div>
        </div>
    );
}