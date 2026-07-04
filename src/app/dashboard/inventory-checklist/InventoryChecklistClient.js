'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission } from '@/lib/roles';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
import PageHero from '@/components/PageHero';

const LIMIT = 30;

// Checklist de Inventario de Operación — mismo patrón form_definitions +
// results_inventory que Salud/Pre-vuelo/Briefing (ver checklistDefaults.js),
// pero en su propia pestaña (no dentro de Protocolos) porque el permiso de
// edición pedido por el usuario incluye a Jefe de Pilotos, y Protocolos como
// página completa está gateada a canViewFinance (GG+GSMS+superadmin, sin JP).
export default function InventoryChecklistClient({ initialData }) {
    const [labels, setLabels] = useState(initialData.initialLabels);
    const [enabled, setEnabled] = useState(initialData.enabled);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);

    const canManage = hasPermission(initialData.role, 'canManageInventoryChecklist');
    const definedItems = Object.entries(labels)
        .filter(([, text]) => text && text.trim() !== '')
        .sort((a, b) => Number(a[0]) - Number(b[0]));

    const toggleEnabled = async () => {
        setToggling(true);
        const newStatus = !enabled;
        setEnabled(newStatus);
        const { error } = await supabase
            .from('organizations')
            .update({ enable_inventory_checklist: newStatus })
            .eq('id', initialData.organizationId);
        if (error) {
            setEnabled(!newStatus);
            toast.error('No se pudo actualizar: ' + error.message);
        }
        setToggling(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(labels)
                .filter(([, text]) => text && text.trim() !== '')
                .map(([num, text]) => ({
                    organization_id: initialData.organizationId,
                    form_type: 'inventory',
                    aircraft_model: 'General',
                    field_number: parseInt(num),
                    label_text: text.toUpperCase(),
                }));
            const { error } = await supabase.from('form_definitions').upsert(updates);
            if (error) throw error;
            toast.success('Checklist de inventario guardado.');
        } catch (e) {
            toast.error('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadDefaults = () => {
        const defaults = CHECKLIST_DEFAULTS.inventory || [];
        const map = {};
        defaults.forEach((text, idx) => { map[idx + 1] = text.toUpperCase(); });
        setLabels(prev => ({ ...prev, ...map }));
        toast.success('Plantilla básica cargada. Revisa y presiona Guardar.');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <PageHero
                eyebrow="Cumplimiento"
                title="Inventario de Operación"
                description="Checklist de equipo e insumos que debe verificarse antes de cada misión, previo al chequeo de Pre-vuelo."
            />

            {!canManage && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                    <span className="text-[11px] font-semibold text-orange-800 leading-snug">
                        Solo lectura — Gerente General, Gerente SMS y Jefe de Pilotos pueden editar este checklist.
                        Se diligencia en el Despacho, antes del checklist de Pre-vuelo.
                    </span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                {canManage && (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                        <div className="pr-4">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Activar Checklist de Inventario</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                                Si está activo, aparece como paso obligatorio en el Despacho antes de Pre-vuelo.
                            </p>
                        </div>
                        <button type="button" onClick={toggleEnabled} disabled={toggling}
                            className={`px-4 py-2 rounded-lg text-[10.5px] font-black uppercase transition-all shrink-0 disabled:opacity-50 ${enabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                )}

                {!enabled && (
                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                        <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">visibility_off</span>
                        <span className="text-[10px] font-semibold text-slate-500 leading-snug">
                            El checklist está desactivado — no aparece todavía en el Despacho.
                        </span>
                    </div>
                )}

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
                            definedItems.map(([num, text]) => (
                                <div key={num} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                                    <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{num}</span>
                                    <span className="text-xs font-semibold text-slate-700">{text}</span>
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
        </div>
    );
}
