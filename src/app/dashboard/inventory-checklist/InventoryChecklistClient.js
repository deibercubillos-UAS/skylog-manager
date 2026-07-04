'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission } from '@/lib/roles';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const LIMIT = 30;

// Inventario de Operación — dos partes independientes que conviven en la misma
// página (Flota & Equipo):
// 1. Existencias de equipo (`equipment_stock`): cuántas unidades de cada tipo
//    de equipo hay en la empresa — catálogo real, no un checklist.
// 2. Checklist de verificación (`form_definitions` + `results_inventory`,
//    mismo patrón que Salud/Pre-vuelo/Briefing): qué se verifica antes de cada
//    misión, en Despacho, antes de Pre-vuelo. Se edita aquí (no en Protocolos,
//    que excluye a Jefe de Pilotos) — Protocolos solo enlaza a esta página.
export default function InventoryChecklistClient({ initialData }) {
    const [labels, setLabels] = useState(initialData.initialLabels);
    const [enabled, setEnabled] = useState(initialData.enabled);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);

    const [stock, setStock] = useState(initialData.initialStock || []);
    const [newItem, setNewItem] = useState({ name: '', category: '', quantity: 0 });
    const [addingStock, setAddingStock] = useState(false);

    const canManage = hasPermission(initialData.role, 'canManageInventoryChecklist');
    const definedItems = Object.entries(labels)
        .filter(([, text]) => text && text.trim() !== '')
        .sort((a, b) => Number(a[0]) - Number(b[0]));

    // ── Existencias de equipo ────────────────────────────────────────────────
    const totalTypes = stock.length;
    const totalUnits = stock.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const outOfStock = stock.filter(s => Number(s.quantity || 0) === 0).length;

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!newItem.name.trim()) return toast.warn('Escribe el nombre del equipo.');
        setAddingStock(true);
        try {
            const { data, error } = await supabase.from('equipment_stock').insert([{
                organization_id: initialData.organizationId,
                name: newItem.name.trim(),
                category: newItem.category.trim() || null,
                quantity: parseInt(newItem.quantity || 0, 10),
            }]).select().single();
            if (error) throw error;
            setStock(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewItem({ name: '', category: '', quantity: 0 });
        } catch (err) {
            toast.error('Error al agregar: ' + err.message);
        } finally {
            setAddingStock(false);
        }
    };

    const handleUpdateQuantity = async (id, quantity) => {
        const qty = Math.max(0, parseInt(quantity || 0, 10));
        setStock(prev => prev.map(s => s.id === id ? { ...s, quantity: qty } : s));
        const { error } = await supabase.from('equipment_stock').update({ quantity: qty }).eq('id', id);
        if (error) toast.error('No se pudo actualizar la cantidad: ' + error.message);
    };

    const handleDeleteStock = async (id) => {
        const prev = stock;
        setStock(s => s.filter(x => x.id !== id));
        const { error } = await supabase.from('equipment_stock').delete().eq('id', id);
        if (error) {
            setStock(prev);
            toast.error('No se pudo eliminar: ' + error.message);
        }
    };

    // ── Checklist de verificación ────────────────────────────────────────────
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

    const inputCls = "bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all";

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <PageHero
                eyebrow="Flota & Equipo"
                title="Inventario de Operación"
                description="Existencias de equipo de la empresa + checklist de verificación antes de cada misión, previo al chequeo de Pre-vuelo."
            />

            <section aria-label="Indicadores de inventario" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'types', label: 'Tipos de equipo', value: totalTypes, icon: 'category', iconColor: '#ec5b13' },
                    { key: 'units', label: 'Unidades totales', value: totalUnits, icon: 'inventory_2', iconColor: '#16a34a' },
                    { key: 'out', label: 'Sin existencias', value: outOfStock, icon: 'warning', iconColor: outOfStock > 0 ? '#dc2626' : '#94a3b8' },
                    { key: 'checklist', label: 'Ítems del checklist', value: definedItems.length, icon: 'fact_check', iconColor: '#94a3b8' },
                ]} />
            </section>

            {/* ── Existencias de equipo ───────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 md:px-7 py-4 border-b border-slate-100">
                    <p className="text-sm font-black text-slate-900">Existencias de equipo</p>
                    <p className="text-xs text-slate-500 mt-0.5">Cuántas unidades de cada equipo hay disponibles en la empresa.</p>
                </div>

                {canManage && (
                    <form onSubmit={handleAddStock} className="flex flex-col sm:flex-row gap-2 p-4 bg-slate-50 border-b border-slate-100">
                        <input required placeholder="Nombre del equipo (ej. Chaleco de identificación)" className={inputCls + ' flex-1 min-w-0'}
                            value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        <input placeholder="Categoría (opcional)" className={inputCls + ' sm:w-48'}
                            value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
                        <input type="number" min="0" placeholder="Cantidad" className={inputCls + ' sm:w-28'}
                            value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                        <button type="submit" disabled={addingStock}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 shrink-0">
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Agregar
                        </button>
                    </form>
                )}

                {stock.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-10">Sin equipos registrados todavía.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <th className="px-5 py-3">Equipo</th>
                                    <th className="px-3 py-3">Categoría</th>
                                    <th className="px-3 py-3">Cantidad</th>
                                    {canManage && <th className="px-3 py-3 w-14"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stock.map(s => (
                                    <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-3 font-bold text-slate-800">{s.name}</td>
                                        <td className="px-3 py-3 text-slate-500 font-semibold">{s.category || '—'}</td>
                                        <td className="px-3 py-3">
                                            {canManage ? (
                                                <input type="number" min="0"
                                                    className={`w-20 p-1.5 rounded-lg border text-center font-black ${Number(s.quantity) === 0 ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                                                    value={s.quantity}
                                                    onChange={e => handleUpdateQuantity(s.id, e.target.value)} />
                                            ) : (
                                                <span className={`font-black tabular-nums ${Number(s.quantity) === 0 ? 'text-red-600' : 'text-slate-900'}`}>{s.quantity}</span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="px-3 py-3">
                                                <button onClick={() => handleDeleteStock(s.id)} aria-label="Eliminar equipo"
                                                    className="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Checklist de verificación ────────────────────────────────────── */}
            {!canManage && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                    <span className="text-[11px] font-semibold text-orange-800 leading-snug">
                        Solo lectura — Gerente General, Gerente SMS y Jefe de Pilotos pueden editar el checklist y las existencias.
                        El checklist se diligencia en el Despacho, antes del checklist de Pre-vuelo.
                    </span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                <div>
                    <p className="text-sm font-black text-slate-900">Checklist de verificación</p>
                    <p className="text-xs text-slate-500 mt-0.5">Qué equipos se requieren y qué se verifica en el inventario del día de la operación.</p>
                </div>

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
