'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/roles';
import { toast } from '@/lib/toast';
import { fetchLogoDataUrl } from '@/lib/docUrl';
import AddMaintenancePanel from '@/components/AddMaintenancePanel';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

// Misma fórmula que AircraftCard.js — un solo criterio de vencimiento en toda la app.
function dueStatus(aircraft) {
    const intervalHours = parseInt(aircraft?.maintenance_interval_hours ?? 200, 10);
    const intervalDays  = parseInt(aircraft?.maintenance_interval_days  ?? 180, 10);

    const hours = parseFloat(aircraft?.total_hours || 0);
    const lastMaintHours = parseFloat(aircraft?.last_maintenance_hours || 0);
    const diffHours = Math.max(0, hours - lastMaintHours);
    const hourProgress = intervalHours > 0 ? Math.min(100, (diffHours / intervalHours) * 100) : 0;

    const creationDate = aircraft?.created_at ? new Date(aircraft.created_at) : new Date();
    const lastDate = aircraft?.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : creationDate;
    const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
    const timeProgress = intervalDays > 0 ? Math.min(100, (daysSince / intervalDays) * 100) : 0;

    const hoursDue = intervalHours > 0 && diffHours >= intervalHours;
    const daysDue  = intervalDays  > 0 && daysSince >= intervalDays;
    const isDue = hoursDue || daysDue;
    const finalProgress = Math.max(hourProgress, timeProgress);

    // Próxima fecha: la explícita si el técnico la registró, si no una estimación
    // por periodicidad en días (no hay forma honesta de proyectar una fecha desde
    // un intervalo en horas de vuelo sin inventar una tasa de uso).
    let nextDate = null;
    let nextDateEstimated = false;
    if (aircraft?.next_maintenance_date) {
        nextDate = new Date(aircraft.next_maintenance_date);
    } else if (intervalDays > 0) {
        nextDate = new Date(lastDate.getTime() + intervalDays * 86400000);
        nextDateEstimated = true;
    }

    const bucket = isDue ? 'overdue' : finalProgress >= 75 ? 'soon' : 'ok';
    return { isDue, finalProgress, nextDate, nextDateEstimated, bucket };
}

const TYPE_LABELS = { PREVENTIVO: 'Preventivo', CORRECTIVO: 'Correctivo', 'ACTUALIZACIÓN': 'Actualización' };
const STATUS_BADGE = {
    ok:      { label: 'Al día',   icon: 'check_circle', cls: 'text-emerald-600' },
    soon:    { label: 'Próximo',  icon: 'schedule',      cls: 'text-amber-600' },
    overdue: { label: 'Vencido',  icon: 'warning',       cls: 'text-red-600' },
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function MaintenancePage() {
    const [logs, setLogs]         = useState([]);
    const [aircraftList, setAircraftList] = useState([]);
    const [orgData, setOrgData]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [showAdd, setShowAdd]   = useState(false);
    const [editingLog, setEditingLog] = useState(null);    // log abierto en modo edición
    const [downloadingId, setDownloadingId] = useState(null); // id del log generando su PDF
    const [userRole, setUserRole] = useState(null);
    const [loadingDoc, setLoadingDoc] = useState(null); // id del log abriendo
    const [returnLabels, setReturnLabels] = useState({}); // { field_number: label_text }
    const [detailLog, setDetailLog] = useState(null);     // log mostrado en el modal de recibo

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [aircraftFilter, setAircraftFilter] = useState('');

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase
            .from('profiles').select('role,organization_id').eq('id', user.id).single();
        setUserRole(prof?.role || null);

        const [logsRes, defsRes, aircraftRes, orgRes] = await Promise.all([
            fetch('/api/maintenance').then(r => r.json()),
            prof?.organization_id
                ? supabase.from('form_definitions')
                    .select('field_number,label_text')
                    .eq('organization_id', prof.organization_id)
                    .eq('form_type', 'maintenance_return')
                    .eq('aircraft_model', 'General')
                : Promise.resolve({ data: [] }),
            prof?.organization_id
                ? supabase.from('aircraft')
                    .select('id,model,serial_number,maintenance_interval_hours,maintenance_interval_days,last_maintenance_date,last_maintenance_hours,next_maintenance_date,total_hours,operational_status,created_at,status')
                    .eq('organization_id', prof.organization_id)
                : Promise.resolve({ data: [] }),
            prof?.organization_id
                ? supabase.from('organizations').select('company_name, logo_url').eq('id', prof.organization_id).single()
                : Promise.resolve({ data: null }),
        ]);

        setLogs(Array.isArray(logsRes) ? logsRes : []);
        const map = {};
        (defsRes.data || []).forEach(d => { map[d.field_number] = d.label_text; });
        setReturnLabels(map);
        setAircraftList((aircraftRes.data || []).filter(a => a.status !== 'Baja' && a.status !== 'Transferido'));
        setOrgData(orgRes.data || null);
        setLoading(false);
    };

    // ── Descargar el PDF de un solo registro (reutiliza generateMaintenanceReport
    // pasándole un array de un elemento — no requirió tocar el generador) ──────
    const handleDownloadOne = async (log) => {
        setDownloadingId(log.id);
        try {
            const generators = await import('@/lib/reportGenerators');
            const logo = await fetchLogoDataUrl(orgData?.logo_url);
            const downloadedAt = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
            const aircraftLabel = log.aircraft ? `${log.aircraft.model} · ${log.aircraft.serial_number}` : null;
            generators.generateMaintenanceReport([log], {
                orgName: orgData?.company_name,
                logo,
                version: '1.0',
                reportDate: log.maintenance_date || log.created_at?.slice(0, 10),
                formCode: 'F-MNT-006',
                aircraftLabel,
                rangeLabel: `Registro individual — ${fmtDate(log.maintenance_date || log.created_at)}`,
                downloadedAt,
            });
        } catch (e) {
            toast.error('Error al generar el PDF: ' + e.message);
        } finally {
            setDownloadingId(null);
        }
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
    const openDoc = useCallback((path) => {
        if (!path) return;
        window.open(`/api/maintenance/attachment?path=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
    }, []);

    const uniqueModels = useMemo(() => [...new Set(aircraftList.map(a => a.model).filter(Boolean))], [aircraftList]);

    const filteredLogs = useMemo(() => {
        let result = logs;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(l =>
                l.aircraft?.model?.toLowerCase().includes(q) ||
                l.aircraft?.serial_number?.toLowerCase().includes(q) ||
                l.technician_name?.toLowerCase().includes(q));
        }
        if (typeFilter) result = result.filter(l => l.maintenance_type === typeFilter);
        if (aircraftFilter) result = result.filter(l => l.aircraft?.model === aircraftFilter);
        if (statusFilter) result = result.filter(l => dueStatus(l.aircraft).bucket === statusFilter);
        return result;
    }, [logs, search, typeFilter, aircraftFilter, statusFilter]);

    // ── KPIs de flota (por aeronave, no por intervención) ──────────────────
    const thisYear = new Date().getFullYear().toString();
    const thisYearCount = logs.filter(l => (l.maintenance_date || l.created_at || '').startsWith(thisYear)).length;
    const buckets = { ok: 0, soon: 0, overdue: 0 };
    aircraftList.forEach(a => { buckets[dueStatus(a).bucket]++; });

    if (loading) return (
        <div className="p-20 text-center font-black animate-pulse">SINCRO TÉCNICA...</div>
    );

    return (
        <div className="space-y-6 md:space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <PageHero
                eyebrow="Flota & Equipo"
                title="Mantenimiento"
                description="Historial y programación de mantenimiento por aeronave."
                right={
                    <div className="flex items-center gap-4 md:gap-6">
                        {buckets.overdue > 0 && (
                            <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                                <p className="text-xs font-black uppercase tracking-wide text-white/40">Vencidos</p>
                                <p className="text-sm font-black text-red-400 mt-1 whitespace-nowrap">{buckets.overdue} aeronave{buckets.overdue !== 1 ? 's' : ''}</p>
                            </div>
                        )}
                        {canManage && (
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0">
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                Registrar mantenimiento
                            </button>
                        )}
                    </div>
                }
            />

            <section aria-label="Indicadores de mantenimiento" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'total', label: 'Mantenim. este año', value: thisYearCount, icon: 'build', iconColor: '#ec5b13' },
                    { key: 'ok', label: 'Al día', value: buckets.ok, icon: 'check_circle', iconColor: '#16a34a' },
                    { key: 'soon', label: 'Próximos', value: buckets.soon, icon: 'schedule', iconColor: buckets.soon > 0 ? '#d97706' : '#94a3b8' },
                    { key: 'overdue', label: 'Vencidos', value: buckets.overdue, icon: 'warning', iconColor: buckets.overdue > 0 ? '#dc2626' : '#94a3b8' },
                ]} />
            </section>

            {/* Barra de filtros */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
                    <input
                        placeholder="Buscar por aeronave, técnico…"
                        aria-label="Buscar intervenciones"
                        className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <select aria-label="Filtrar por estado" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Todos los estados</option>
                        <option value="ok">Al día</option>
                        <option value="soon">Próximo</option>
                        <option value="overdue">Vencido</option>
                    </select>
                    <select aria-label="Filtrar por aeronave" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={aircraftFilter} onChange={e => setAircraftFilter(e.target.value)}>
                        <option value="">Todas las aeronaves</option>
                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select aria-label="Filtrar por tipo" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        <option value="">Todos los tipos</option>
                        <option value="PREVENTIVO">Preventivo</option>
                        <option value="CORRECTIVO">Correctivo</option>
                        <option value="ACTUALIZACIÓN">Actualización</option>
                    </select>
                </div>
                <div className="md:ml-auto">
                    <Link href="/dashboard/fleet" className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase text-slate-600 border border-slate-200 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
                        <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                        Ver flota
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* ── Mobile cards ──────────────────────────────────────── */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                        <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                            Sin registros técnicos
                        </p>
                    ) : filteredLogs.map(log => {
                        const status = STATUS_BADGE[dueStatus(log.aircraft).bucket];
                        return (
                        <div key={log.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">
                                        {log.aircraft?.model || 'UAS'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        {fmtDate(log.maintenance_date || log.created_at)} · {log.technician_name}
                                    </p>
                                </div>
                                <span className={`shrink-0 flex items-center gap-1 text-xs font-black ${status.cls}`}>
                                    <span className="material-symbols-outlined text-sm">{status.icon}</span>
                                    {status.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-600">
                                    {TYPE_LABELS[log.maintenance_type] || log.maintenance_type}
                                </span>
                                {log.hours_at_service != null && (
                                    <span className="text-xs font-black font-mono text-orange-600">
                                        {log.hours_at_service}h
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
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
                                {checklistStats(log.return_checklist) && (
                                    <button
                                        onClick={() => setDetailLog(log)}
                                        className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors">
                                        <span className="material-symbols-outlined text-sm">fact_check</span>
                                        Recibo {checklistStats(log.return_checklist).ok}/{checklistStats(log.return_checklist).total}
                                    </button>
                                )}
                                {log.components?.length > 0 && (
                                    <button
                                        onClick={() => setDetailLog(log)}
                                        className="flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-800 transition-colors">
                                        <span className="material-symbols-outlined text-sm">memory</span>
                                        Componentes ({log.components.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDownloadOne(log)}
                                    disabled={downloadingId === log.id}
                                    className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50">
                                    <span className="material-symbols-outlined text-sm">
                                        {downloadingId === log.id ? 'hourglass_empty' : 'download'}
                                    </span>
                                    {downloadingId === log.id ? 'Generando...' : 'Descargar'}
                                </button>
                                {canManage && (
                                    <button
                                        onClick={() => setEditingLog(log)}
                                        className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        Editar
                                    </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>

                {/* ── Desktop table ─────────────────────────────────────── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-6 py-4">Aeronave</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Última realizada</th>
                                <th className="px-6 py-4">Próxima prevista</th>
                                <th className="px-6 py-4">Técnico</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Evidencia</th>
                                <th className="px-6 py-4 w-32">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                                        Sin registros técnicos
                                    </td>
                                </tr>
                            ) : filteredLogs.map(log => {
                                const ds = dueStatus(log.aircraft);
                                const status = STATUS_BADGE[ds.bucket];
                                return (
                                <tr key={log.id} className="hover:bg-slate-50 transition-all">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-900 uppercase truncate max-w-[220px]">{log.aircraft?.model}</p>
                                        <p className="text-xs text-slate-400 font-mono">{log.aircraft?.serial_number}</p>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-600">
                                        {TYPE_LABELS[log.maintenance_type] || log.maintenance_type}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">
                                        {fmtDate(log.maintenance_date || log.created_at)}
                                    </td>
                                    <td className={`px-6 py-4 font-bold ${ds.bucket === 'overdue' ? 'text-red-600' : ds.bucket === 'soon' ? 'text-amber-600' : 'text-slate-800'}`}>
                                        {fmtDate(ds.nextDate)}
                                        {ds.nextDate && ds.nextDateEstimated && <span className="text-slate-300 font-medium"> (estimado)</span>}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{log.technician_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-black ${status.cls}`}>
                                            <span className="material-symbols-outlined text-base">{status.icon}</span>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {(log.attachment_path || log.return_doc_path || checklistStats(log.return_checklist) || log.components?.length > 0) ? (
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
                                                {(checklistStats(log.return_checklist) || log.components?.length > 0) && (
                                                    <button
                                                        onClick={() => setDetailLog(log)}
                                                        className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors"
                                                        title="Ver detalle de recibo/componentes">
                                                        <span className="material-symbols-outlined text-base">fact_check</span>
                                                        Detalle
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-200 select-none">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleDownloadOne(log)}
                                                disabled={downloadingId === log.id}
                                                aria-label="Descargar registro"
                                                title="Descargar este registro (PDF)"
                                                className="size-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors active:scale-95 disabled:opacity-50">
                                                <span className="material-symbols-outlined text-base">
                                                    {downloadingId === log.id ? 'hourglass_empty' : 'download'}
                                                </span>
                                            </button>
                                            {canManage && (
                                                <button
                                                    onClick={() => setEditingLog(log)}
                                                    aria-label="Editar registro"
                                                    title="Editar este registro"
                                                    className="size-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors active:scale-95">
                                                    <span className="material-symbols-outlined text-base">edit</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd && canManage && (
                <AddMaintenancePanel
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { setShowAdd(false); loadData(); }} />
            )}

            {editingLog && canManage && (
                <AddMaintenancePanel
                    maintenance={editingLog}
                    onClose={() => setEditingLog(null)}
                    onSuccess={() => { setEditingLog(null); loadData(); }} />
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
                                    {detailLog.aircraft?.model} · {fmtDate(detailLog.maintenance_date || detailLog.created_at)}
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
