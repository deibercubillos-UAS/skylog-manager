'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/roles';
import { toast } from '@/lib/toast';
import AddMaintenancePanel from '@/components/AddMaintenancePanel';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

export default function MaintenancePage() {
    const [logs, setLogs]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [showAdd, setShowAdd]   = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [loadingDoc, setLoadingDoc] = useState(null); // id del log abriendo
    const [returnLabels, setReturnLabels] = useState({}); // { field_number: label_text }
    const [detailLog, setDetailLog] = useState(null);     // log mostrado en el modal de recibo

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase
            .from('profiles').select('role,organization_id').eq('id', user.id).single();
        setUserRole(prof?.role || null);

        const [logsRes, defsRes] = await Promise.all([
            fetch('/api/maintenance').then(r => r.json()),
            prof?.organization_id
                ? supabase.from('form_definitions')
                    .select('field_number,label_text')
                    .eq('organization_id', prof.organization_id)
                    .eq('form_type', 'maintenance_return')
                    .eq('aircraft_model', 'General')
                : Promise.resolve({ data: [] }),
        ]);

        setLogs(Array.isArray(logsRes) ? logsRes : []);
        const map = {};
        (defsRes.data || []).forEach(d => { map[d.field_number] = d.label_text; });
        setReturnLabels(map);
        setLoading(false);
    };

    // Cuenta de ítems marcados OK sobre el total respondido del recibo
    const checklistStats = (cl) => {
        if (!cl || typeof cl !== 'object') return null;
        const entries = Object.values(cl);
        if (entries.length === 0) return null;
        return { ok: entries.filter(v => v === true).length, total: entries.length };
    };

    useEffect(() => { loadData(); }, []);

    const canManage = hasPermission(userRole, 'canManageOps');

    // ── Abrir documento (adjunto o recibo) — streaming server-side, mismo origen ──
    // El endpoint sirve el archivo directamente (inmune a extensiones/CORS de R2).
    const openDoc = useCallback((path) => {
        if (!path) return;
        window.open(`/api/maintenance/attachment?path=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
    }, []);

    if (loading) return (
        <div className="p-20 text-center font-black animate-pulse">SINCRO TÉCNICA...</div>
    );

    return (
        <div className="space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <PageHero
                eyebrow="Flota & Equipo"
                title="Libro de Mantenimiento"
                description="Registro de intervenciones y salud de flota."
            />

            {(() => {
                const ym = new Date().toISOString().slice(0, 7);
                const preventivas = logs.filter(l => l.maintenance_type !== 'CORRECTIVO').length;
                const correctivas = logs.filter(l => l.maintenance_type === 'CORRECTIVO').length;
                const thisMonth = logs.filter(l => l.created_at?.startsWith(ym)).length;
                return (
                    <KPIStrip items={[
                        { key: 'total', title: 'Intervenciones', value: logs.length, icon: 'build', color: 'text-slate-900' },
                        { key: 'prev', title: 'Preventivas', value: preventivas, icon: 'event_available', color: 'text-blue-600' },
                        { key: 'corr', title: 'Correctivas', value: correctivas, icon: 'report_problem', color: 'text-red-600', warning: correctivas > 0 },
                        { key: 'month', title: 'Este Mes', value: thisMonth, icon: 'calendar_month', color: 'text-orange-500' },
                    ]} />
                );
            })()}

            <div className="flex justify-between items-center border-b pb-4">
                <p className="text-slate-400 text-xs font-black uppercase">Historial de intervenciones</p>
                {canManage && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-slate-900 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-sm">build</span>
                        Nueva Intervención
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* ── Mobile cards ──────────────────────────────────────── */}
                <div className="md:hidden divide-y divide-slate-100">
                    {logs.length === 0 ? (
                        <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                            Sin registros técnicos
                        </p>
                    ) : logs.map(log => (
                        <div key={log.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">
                                        {log.aircraft?.model || 'UAS'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        {new Date(log.created_at).toLocaleDateString()} · {log.technician_name}
                                    </p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                    log.maintenance_type === 'CORRECTIVO'
                                        ? 'bg-red-50 text-red-600'
                                        : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {log.maintenance_type}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black font-mono text-orange-600">
                                    {log.hours_at_service}h
                                </span>
                                {log.description && (
                                    <p className="text-xs text-slate-400 italic truncate">{log.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Adjunto */}
                                {log.attachment_path && (
                                    <button
                                        onClick={() => openDoc(log.attachment_path, log.id)}
                                        disabled={loadingDoc === log.id}
                                        className="flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors disabled:opacity-50">
                                        <span className="material-symbols-outlined text-sm">
                                            {loadingDoc === log.id ? 'hourglass_empty' : 'attach_file'}
                                        </span>
                                        {loadingDoc === log.id ? 'Cargando...' : 'Ver documento'}
                                    </button>
                                )}

                                {/* Recibo PDF */}
                                {log.return_doc_path && (
                                    <button
                                        onClick={() => openDoc(log.return_doc_path, log.id + ':recibo')}
                                        disabled={loadingDoc === log.id + ':recibo'}
                                        className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50">
                                        <span className="material-symbols-outlined text-sm">
                                            {loadingDoc === log.id + ':recibo' ? 'hourglass_empty' : 'picture_as_pdf'}
                                        </span>
                                        {loadingDoc === log.id + ':recibo' ? 'Cargando...' : 'Ver recibo'}
                                    </button>
                                )}

                                {/* Recibo de mantenimiento */}
                                {checklistStats(log.return_checklist) && (
                                    <button
                                        onClick={() => setDetailLog(log)}
                                        className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors">
                                        <span className="material-symbols-outlined text-sm">fact_check</span>
                                        Recibo {checklistStats(log.return_checklist).ok}/{checklistStats(log.return_checklist).total}
                                    </button>
                                )}

                                {/* Componentes cambiados */}
                                {log.components?.length > 0 && (
                                    <button
                                        onClick={() => setDetailLog(log)}
                                        className="flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-800 transition-colors">
                                        <span className="material-symbols-outlined text-sm">memory</span>
                                        Componentes ({log.components.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Desktop table ─────────────────────────────────────── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-6 py-5">Fecha</th>
                                <th className="px-6 py-5">Aeronave</th>
                                <th className="px-6 py-5">Tipo</th>
                                <th className="px-6 py-5">Horas</th>
                                <th className="px-6 py-5">Técnico</th>
                                <th className="px-6 py-5">Descripción</th>
                                <th className="px-6 py-5">Adjunto</th>
                                <th className="px-6 py-5">Recibo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                                        Sin registros técnicos
                                    </td>
                                </tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-all">
                                    <td className="px-6 py-5 font-bold text-slate-700">
                                        {new Date(log.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-5 font-black text-slate-900 uppercase">
                                        {log.aircraft?.model}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                            log.maintenance_type === 'CORRECTIVO'
                                                ? 'bg-red-50 text-red-600'
                                                : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {log.maintenance_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-mono text-orange-600 font-bold">
                                        {log.hours_at_service}h
                                    </td>
                                    <td className="px-6 py-5 font-medium">{log.technician_name}</td>
                                    <td className="px-6 py-5 text-slate-400 italic text-xs">
                                        {log.description}
                                    </td>
                                    <td className="px-6 py-5">
                                        {(log.attachment_path || log.return_doc_path) ? (
                                            <div className="flex flex-col gap-1.5 items-start">
                                                {log.attachment_path && (
                                                    <button
                                                        onClick={() => openDoc(log.attachment_path, log.id)}
                                                        disabled={loadingDoc === log.id}
                                                        className="flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors disabled:opacity-50"
                                                        title="Ver documento adjunto">
                                                        <span className="material-symbols-outlined text-base">
                                                            {loadingDoc === log.id ? 'hourglass_empty' : 'attach_file'}
                                                        </span>
                                                        {loadingDoc === log.id ? '...' : 'Adjunto'}
                                                    </button>
                                                )}
                                                {log.return_doc_path && (
                                                    <button
                                                        onClick={() => openDoc(log.return_doc_path, log.id + ':recibo')}
                                                        disabled={loadingDoc === log.id + ':recibo'}
                                                        className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50"
                                                        title="Ver recibo (PDF)">
                                                        <span className="material-symbols-outlined text-base">
                                                            {loadingDoc === log.id + ':recibo' ? 'hourglass_empty' : 'picture_as_pdf'}
                                                        </span>
                                                        {loadingDoc === log.id + ':recibo' ? '...' : 'Recibo'}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-200 select-none">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        {(checklistStats(log.return_checklist) || log.components?.length > 0) ? (
                                            <div className="flex flex-col gap-1.5 items-start">
                                                {checklistStats(log.return_checklist) && (
                                                    <button
                                                        onClick={() => setDetailLog(log)}
                                                        className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors"
                                                        title="Ver recibo de mantenimiento">
                                                        <span className="material-symbols-outlined text-base">fact_check</span>
                                                        {checklistStats(log.return_checklist).ok}/{checklistStats(log.return_checklist).total}
                                                    </button>
                                                )}
                                                {log.components?.length > 0 && (
                                                    <button
                                                        onClick={() => setDetailLog(log)}
                                                        className="flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-800 transition-colors"
                                                        title="Ver componentes cambiados">
                                                        <span className="material-symbols-outlined text-base">memory</span>
                                                        {log.components.length} comp.
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-200 select-none">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd && canManage && (
                <AddMaintenancePanel
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { setShowAdd(false); loadData(); }} />
            )}

            {/* Modal de detalle del recibo de mantenimiento */}
            {detailLog && (
                <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setDetailLog(null)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Recibo de Mantenimiento</h3>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">
                                    {detailLog.aircraft?.model} · {new Date(detailLog.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button onClick={() => setDetailLog(null)}
                                className="size-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            {/* Checklist de recibo */}
                            {checklistStats(detailLog.return_checklist) && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Checklist de recibo</p>
                                    {Object.entries(detailLog.return_checklist || {})
                                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                                        .map(([num, val]) => (
                                        <div key={num} className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-lg ${val === true ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {val === true ? 'check_circle' : 'cancel'}
                                            </span>
                                            <span className="text-xs font-bold text-slate-600 flex-1">
                                                {returnLabels[num] || `Ítem ${num}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Componentes cambiados */}
                            {detailLog.components?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Componentes cambiados</p>
                                    {detailLog.components.map((c, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-800 uppercase">{c.component_type}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                    c.action === 'reemplazado' ? 'bg-amber-100 text-amber-700'
                                                    : c.action === 'instalado' ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-600'
                                                }`}>{c.action}</span>
                                            </div>
                                            {(c.part_old || c.part_new) && (
                                                <p className="text-[11px] font-mono text-slate-500 mt-1">
                                                    {c.part_old && <>Sale: <span className="text-slate-700">{c.part_old}</span></>}
                                                    {c.part_old && c.part_new && ' → '}
                                                    {c.part_new && <>Entra: <span className="text-slate-700">{c.part_new}</span></>}
                                                </p>
                                            )}
                                            {c.notes && <p className="text-xs text-slate-400 italic mt-1">{c.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
