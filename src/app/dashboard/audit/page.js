'use client';
import { useState, useEffect } from 'react';
import PageHero from '@/components/PageHero';

export default function AuditPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('cumplimiento'); // 'cumplimiento' | 'acciones'

    useEffect(() => {
        fetch('/api/audit').then(res => res.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">GENERANDO DIAGNÓSTICO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <PageHero
                eyebrow="Cumplimiento"
                title="Auditoría"
                description="Aeronavegabilidad, estatus de personal y registro de acciones."
                metric={{ label: 'Salud Organizacional', value: `${data.score}%` }}
            />

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit">
                {[{ id: 'cumplimiento', label: 'Cumplimiento' }, { id: 'acciones', label: 'Registro de acciones' }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === t.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'acciones' ? <ActivityLog /> : (
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
            )}
        </div>
    );
}

// ── Registro de acciones (Fase 5.a) ──────────────────────────────────────────
function ActivityLog() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        fetch('/api/audit-log?limit=200')
            .then(r => r.json())
            .then(d => { setEntries(d.entries || []); setPending(!!d.pending); })
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, []);

    const MODULE_ICON = { fleet: 'precision_manufacturing', pilots: 'group', flights: 'menu_book', maintenance: 'build' };
    const ACTION_LABEL = { create: 'Creó', update: 'Editó', delete: 'Eliminó' };

    if (loading) return <div className="p-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando registro...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <a href="/api/audit-log?format=csv"
                   className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-all">
                    <span className="material-symbols-outlined text-sm">download</span> Exportar CSV
                </a>
            </div>

            {pending ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-700 font-medium">
                    El registro de acciones está listo en el código, pero la tabla <code>audit_log</code> aún no
                    existe en la base de datos. Aplica la migración <code>20260702_audit_log.sql</code> para activarlo.
                </div>
            ) : entries.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200">fact_check</span>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Sin acciones registradas todavía</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-5 py-4">Usuario</th>
                                <th className="px-5 py-4">Acción</th>
                                <th className="px-5 py-4">Módulo</th>
                                <th className="px-5 py-4">Detalle</th>
                                <th className="px-5 py-4">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {entries.map(e => (
                                <tr key={e.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="px-5 py-4 font-bold text-slate-900">{e.actor_name || '—'}</td>
                                    <td className="px-5 py-4 text-slate-600">{ACTION_LABEL[e.action] || e.action}</td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
                                            <span className="material-symbols-outlined text-sm">{MODULE_ICON[e.module] || 'category'}</span>
                                            {e.module}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500 text-xs">{e.entity_label || '—'}</td>
                                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString('es-CO')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase">{sub}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`text-xs font-black uppercase ${status ? 'text-emerald-600' : 'text-red-600'}`}>{reason}</p>
                <div className="flex justify-end gap-1 mt-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${docs ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'}`}>
                        {docs ? 'DOCS OK' : 'DOCS FALTANTES'}
                    </span>
                </div>
            </div>
        </div>
    );
}