'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission } from '@/lib/roles';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const MinorMaintenancePanel = dynamic(() => import('@/components/MinorMaintenancePanel'), { ssr: false });

const LIMIT = 20;

// Progreso informativo (no es la fuente de verdad del bloqueo — esa es
// aircraft.minor_maintenance_due, mantenida por el cron + el endpoint de
// registro). Mismo criterio que dueStatus() en dashboard/maintenance/page.js,
// aplicado a los contadores independientes del mantenimiento menor.
function minorProgress(a) {
    const intH = parseInt(a.minor_maintenance_interval_hours || 0, 10);
    const intD = parseInt(a.minor_maintenance_interval_days || 0, 10);
    if (intH <= 0 && intD <= 0) return null; // no configurado para esta aeronave

    const diffH = Math.max(0, parseFloat(a.total_hours || 0) - parseFloat(a.last_minor_maintenance_hours || 0));
    const hPct = intH > 0 ? Math.min(100, (diffH / intH) * 100) : 0;

    const lastDate = a.last_minor_maintenance_date ? new Date(a.last_minor_maintenance_date) : null;
    const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
    const dPct = (intD > 0 && daysSince !== null) ? Math.min(100, (daysSince / intD) * 100) : 0;

    return { pct: Math.max(hPct, dPct), diffH: diffH.toFixed(1), daysSince };
}

export default function MinorMaintenanceClient({ initialData }) {
    const canManage = hasPermission(initialData.role, 'canManageMinorMaintenanceChecklist');
    const [labels, setLabels] = useState(initialData.initialLabels);
    const [saving, setSaving] = useState(false);
    const [aircraft, setAircraft] = useState(initialData.aircraft);
    const [recentLogs, setRecentLogs] = useState(initialData.recentLogs);
    const [panelAircraft, setPanelAircraft] = useState(null);

    const definedItems = Object.entries(labels)
        .filter(([, text]) => text && text.trim() !== '')
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([num, text]) => ({ field_number: Number(num), label_text: text }));

    const reload = async () => {
        const [{ data: ac }, { data: logs }] = await Promise.all([
            supabase.from('aircraft')
                .select('id, model, serial_number, total_hours, operational_status, status, minor_maintenance_interval_hours, minor_maintenance_interval_days, last_minor_maintenance_date, last_minor_maintenance_hours, minor_maintenance_due')
                .eq('organization_id', initialData.organizationId).neq('status', 'Baja').order('model'),
            supabase.from('maintenance_logs')
                .select('id, aircraft_id, maintenance_date, technician_name, description')
                .eq('organization_id', initialData.organizationId).eq('maintenance_type', 'MENOR')
                .order('maintenance_date', { ascending: false }).limit(20),
        ]);
        setAircraft(ac || []);
        setRecentLogs(logs || []);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(labels)
                .filter(([, text]) => text && text.trim() !== '')
                .map(([num, text]) => ({
                    organization_id: initialData.organizationId,
                    form_type: 'minor_maintenance',
                    aircraft_model: 'General',
                    field_number: parseInt(num),
                    label_text: text.toUpperCase(),
                }));
            const { error } = await supabase.from('form_definitions').upsert(updates);
            if (error) throw error;
            toast.success('Checklist de mantenimiento menor guardado.');
        } catch (e) {
            toast.error('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadDefaults = () => {
        const defaults = CHECKLIST_DEFAULTS.minor_maintenance || [];
        const map = {};
        defaults.forEach((text, idx) => { map[idx + 1] = text.toUpperCase(); });
        setLabels(prev => ({ ...prev, ...map }));
        toast.success('Plantilla básica cargada. Revisa y presiona Guardar.');
    };

    const activeCount = aircraft.filter(a => a.status !== 'Baja').length;
    const pendingCount = aircraft.filter(a => a.minor_maintenance_due).length;
    const thisYear = new Date().getFullYear();
    const doneThisYear = recentLogs.filter(l => new Date(l.maintenance_date).getFullYear() === thisYear).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <PageHero
                eyebrow="Flota & Equipo"
                title="Mantenimiento Menor"
                description="Chequeo periódico ligero que diligencia el piloto, con periodicidad configurable por aeronave."
            />

            <section aria-label="Indicadores de mantenimiento menor" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'active', label: 'Aeronaves activas', value: activeCount, icon: 'flight', iconColor: '#ec5b13' },
                    { key: 'pending', label: 'Pendientes', value: pendingCount, icon: 'warning', iconColor: pendingCount > 0 ? '#dc2626' : '#94a3b8' },
                    { key: 'done', label: 'Realizados este año', value: doneThisYear, icon: 'check_circle', iconColor: '#16a34a' },
                    { key: 'checklist', label: 'Ítems del checklist', value: definedItems.length, icon: 'fact_check', iconColor: '#94a3b8' },
                ]} />
            </section>

            {/* ── Estado de la flota ──────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 md:px-7 py-4 border-b border-slate-100">
                    <p className="text-sm font-black text-slate-900">Estado de la flota</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        La periodicidad (horas y días) se configura por aeronave desde Flota → Editar aeronave.
                        {' '}Si está vencido, el despacho de esa aeronave queda bloqueado hasta diligenciarlo aquí.
                    </p>
                </div>

                {aircraft.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-10">Sin aeronaves registradas.</p>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {aircraft.map(a => {
                            const prog = minorProgress(a);
                            return (
                                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 truncate">{a.model} · {a.serial_number}</p>
                                        <p className="text-[10.5px] font-semibold text-slate-400">
                                            {prog === null
                                                ? 'Periodicidad no configurada'
                                                : a.last_minor_maintenance_date
                                                    ? `Último: ${new Date(a.last_minor_maintenance_date).toLocaleDateString('es-CO')}`
                                                    : 'Nunca realizado'}
                                        </p>
                                    </div>
                                    {a.minor_maintenance_due ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-black uppercase bg-red-50 text-red-700 shrink-0">Vencido</span>
                                    ) : prog !== null && prog.pct >= 75 ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-black uppercase bg-amber-50 text-amber-700 shrink-0">Próximo</span>
                                    ) : prog !== null ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-black uppercase bg-emerald-50 text-emerald-700 shrink-0">Al día</span>
                                    ) : null}
                                    <button type="button" onClick={() => setPanelAircraft(a)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10.5px] uppercase tracking-wide transition-all active:scale-95 shrink-0">
                                        <span className="material-symbols-outlined text-sm">checklist</span>
                                        Diligenciar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Checklist de verificación ────────────────────────────────────── */}
            {!canManage && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                    <span className="text-[11px] font-semibold text-orange-800 leading-snug">
                        Solo lectura — Gerente General, Gerente SMS y Jefe de Pilotos pueden editar el checklist.
                        Cualquiera puede diligenciarlo desde &quot;Estado de la flota&quot;.
                    </span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                <div>
                    <p className="text-sm font-black text-slate-900">Checklist de verificación</p>
                    <p className="text-xs text-slate-500 mt-0.5">Qué se verifica en el mantenimiento menor — un solo checklist, igual para toda la flota.</p>
                </div>

                {canManage ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Puntos de verificación</span>
                            <span className="text-[10.5px] font-semibold text-slate-400">{LIMIT} slots</span>
                        </div>
                        <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
                            {Array.from({ length: LIMIT }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                    <input
                                        value={labels[i + 1] || ''}
                                        placeholder="Describa el ítem a verificar..."
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                        onChange={(e) => setLabels({ ...labels, [i + 1]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {definedItems.length === 0 ? (
                            <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-6 text-center">
                                Aún no hay ítems configurados en este checklist.
                            </p>
                        ) : (
                            definedItems.map(i => (
                                <div key={i.field_number} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                                    <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{i.field_number}</span>
                                    <span className="text-xs font-semibold text-slate-700">{i.label_text}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {canManage && (
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={handleLoadDefaults}
                        className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
                        <span className="material-symbols-outlined text-base">playlist_add</span>
                        Plantilla básica
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined text-base">save</span>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            )}

            {panelAircraft && (
                <MinorMaintenancePanel
                    aircraft={panelAircraft}
                    items={definedItems}
                    onClose={() => setPanelAircraft(null)}
                    onSuccess={() => { setPanelAircraft(null); reload(); }}
                />
            )}
        </div>
    );
}
