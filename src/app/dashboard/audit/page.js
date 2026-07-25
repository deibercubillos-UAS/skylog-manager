'use client';
import { useState, useEffect, useMemo } from 'react';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

export default function AuditPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('cumplimiento'); // 'cumplimiento' | 'acciones'

    useEffect(() => {
        fetch('/api/audit').then(res => res.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">GENERANDO DIAGNÓSTICO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-700 pb-20">
            {tab === 'acciones' ? (
                <PageHero
                    eyebrow="Documentación"
                    title="Auditoría"
                    description="Registro inmutable de toda actividad relevante en la organización"
                    right={
                        <div className="flex items-center gap-2 text-white/50">
                            <span className="material-symbols-outlined text-base">lock</span>
                            <span className="text-[10.5px] font-bold">Solo lectura — trazabilidad no editable</span>
                        </div>
                    }
                />
            ) : (
                <PageHero
                    eyebrow="Documentación"
                    title="Auditoría"
                    description="Aeronavegabilidad, estatus de personal y registro de acciones."
                    metric={{ label: 'Salud Organizacional', value: `${data.score}%` }}
                />
            )}

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

// ── Registro de acciones (Fase 5.a, restyleado 2026-07-03) ─────────────────
const MODULE_ICON   = { fleet: 'precision_manufacturing', pilots: 'group', flights: 'menu_book', maintenance: 'build' };
const MODULE_LABEL  = { fleet: 'Aeronaves', pilots: 'Pilotos', flights: 'Misiones', maintenance: 'Mantenimiento' };
const MODULE_PHRASE = { fleet: 'una aeronave', pilots: 'un piloto', flights: 'una misión', maintenance: 'un mantenimiento' };
const ACTION_META = {
    create: { verb: 'Creó',    label: 'Creación',    icon: 'add_circle',  cls: 'text-emerald-600' },
    update: { verb: 'Editó',   label: 'Edición',     icon: 'edit',        cls: 'text-indigo-600' },
    delete: { verb: 'Eliminó', label: 'Eliminación', icon: 'delete',      cls: 'text-red-600' },
};
const initials = (n) => n ? n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

function ActivityLog() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);

    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        fetch('/api/audit-log?limit=200')
            .then(r => r.json())
            .then(d => { setEntries(d.entries || []); setPending(!!d.pending); })
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, []);

    const uniqueModules = useMemo(() => [...new Set(entries.map(e => e.module).filter(Boolean))], [entries]);
    const uniqueUsers   = useMemo(() => [...new Set(entries.map(e => e.actor_name).filter(Boolean))], [entries]);
    const uniqueTypes   = useMemo(() => [...new Set(entries.map(e => e.action).filter(Boolean))], [entries]);

    const filtered = useMemo(() => {
        let result = entries;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(e =>
                e.actor_name?.toLowerCase().includes(q) ||
                e.module?.toLowerCase().includes(q) ||
                e.entity_label?.toLowerCase().includes(q) ||
                e.action?.toLowerCase().includes(q));
        }
        if (moduleFilter) result = result.filter(e => e.module === moduleFilter);
        if (userFilter)   result = result.filter(e => e.actor_name === userFilter);
        if (typeFilter)   result = result.filter(e => e.action === typeFilter);
        return result;
    }, [entries, search, moduleFilter, userFilter, typeFilter]);

    const stats = useMemo(() => {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return {
            total:     entries.length,
            thisMonth: entries.filter(e => (e.created_at || '').startsWith(monthKey)).length,
            users:     new Set(entries.map(e => e.actor_name).filter(Boolean)).size,
            modules:   new Set(entries.map(e => e.module).filter(Boolean)).size,
        };
    }, [entries]);

    if (loading) return <div className="p-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando registro...</div>;

    if (pending) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-700 font-medium">
                El registro de acciones está listo en el código, pero la tabla <code>audit_log</code> aún no
                existe en la base de datos. Aplica la migración <code>20260702_audit_log.sql</code> para activarlo.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {entries.length > 0 && (
                <section aria-label="Indicadores de auditoría" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                    <KPIStrip variant="strip" items={[
                        { key: 'total', label: 'Eventos registrados', value: stats.total, icon: 'fact_check', iconColor: '#ec5b13' },
                        { key: 'month', label: 'Este mes',            value: stats.thisMonth, icon: 'calendar_month', iconColor: '#4b5565' },
                        { key: 'users', label: 'Usuarios activos',    value: stats.users, icon: 'group', iconColor: '#4f46e5' },
                        { key: 'mods',  label: 'Módulos con actividad', value: stats.modules, icon: 'apps', iconColor: '#0891b2' },
                    ]} />
                </section>
            )}

            {/* Barra de filtros */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
                    <input
                        placeholder="Buscar por usuario, módulo, acción…"
                        aria-label="Buscar en el registro de acciones"
                        className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <select aria-label="Filtrar por módulo" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
                        <option value="">Todos los módulos</option>
                        {uniqueModules.map(m => <option key={m} value={m}>{MODULE_LABEL[m] || m}</option>)}
                    </select>
                    <select aria-label="Filtrar por usuario" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                        <option value="">Todos los usuarios</option>
                        {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <select aria-label="Filtrar por tipo" className="col-span-2 sm:col-span-1 w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        <option value="">Todo tipo de evento</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{ACTION_META[t]?.label || t}</option>)}
                    </select>
                </div>
                <div className="md:ml-auto">
                    <a href="/api/audit-log?format=csv"
                       className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase text-slate-600 border border-slate-200 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                        <span className="material-symbols-outlined text-sm">file_download</span>
                        Exportar CSV
                    </a>
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200">fact_check</span>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Sin acciones registradas todavía</p>
                </div>
            ) : (
                <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">Sin resultados con los filtros seleccionados</p>
                        ) : filtered.map(e => {
                            const meta = ACTION_META[e.action] || { verb: e.action, label: e.action, icon: 'category', cls: 'text-slate-500' };
                            return (
                                <div key={e.id} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="size-6 rounded-full bg-[#1A202C] text-white flex items-center justify-center text-[9px] font-black shrink-0">{initials(e.actor_name)}</div>
                                            <p className="text-xs font-black text-slate-900 truncate">{e.actor_name || 'Desconocido'}</p>
                                        </div>
                                        <span className={`shrink-0 flex items-center gap-1 text-xs font-black ${meta.cls}`}>
                                            <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                                            {meta.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium">
                                        {meta.verb} {MODULE_PHRASE[e.module] || e.module}
                                        {e.entity_label && <>: <span className="text-slate-800 font-bold">{e.entity_label}</span></>}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">{new Date(e.created_at).toLocaleString('es-CO')}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <th className="px-5 py-4">Usuario</th>
                                    <th className="px-4 py-4">Acción</th>
                                    <th className="px-4 py-4">Módulo</th>
                                    <th className="px-4 py-4">Fecha y hora</th>
                                    <th className="px-4 py-4">Tipo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                                            Sin resultados con los filtros seleccionados
                                        </td>
                                    </tr>
                                ) : filtered.map(e => {
                                    const meta = ACTION_META[e.action] || { verb: e.action, label: e.action, icon: 'category', cls: 'text-slate-500' };
                                    return (
                                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="size-6 rounded-full bg-[#1A202C] text-white flex items-center justify-center text-[9px] font-black shrink-0">{initials(e.actor_name)}</div>
                                                    <span className="font-bold text-slate-900 truncate">{e.actor_name || 'Desconocido'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 font-medium">
                                                {meta.verb} {MODULE_PHRASE[e.module] || e.module}{e.entity_label && <>: <span className="text-slate-800 font-bold">{e.entity_label}</span></>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
                                                    <span className="material-symbols-outlined text-sm">{MODULE_ICON[e.module] || 'category'}</span>
                                                    {e.module}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{new Date(e.created_at).toLocaleString('es-CO')}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`flex items-center gap-1.5 text-xs font-black ${meta.cls}`}>
                                                    <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                                                    {meta.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
