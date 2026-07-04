'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
import { parseFormConfig } from '@/lib/vorMorFields';
import PageHero from '@/components/PageHero';
import ConfirmModal from '@/components/ui/ConfirmModal';

const AddProtocolPanel = dynamic(() => import('@/components/AddProtocolPanel'), { ssr: false });

// Mapeo tipo de protocolo → columna de activación en organizations
const ENABLE_COLUMN = {
  health:    'enable_health_check',
  preflight: 'enable_preflight',
  briefing:  'enable_briefing',
};

const TYPE_LABELS = {
  health:    'SALUD',
  preflight: 'PRE-VUELO',
  briefing:  'BRIEFING',
  maintenance_return: 'RECIBO MTTO',
  inventory: 'INVENTARIO',
};

const TYPE_TITLE = {
  health:    'Salud del piloto',
  briefing:  'Briefing de misión',
  maintenance_return: 'Recibo de mantenimiento',
  inventory: 'Inventario de Operación',
};

const TYPE_ICON = {
  health: 'medical_services', preflight: 'checklist', briefing: 'groups', maintenance_return: 'build',
  inventory: 'inventory_2',
};

const TYPE_HINTS = {
  health:    'Solicitar chequeo médico del piloto antes de cada vuelo',
  preflight: 'Exigir la inspección física de la aeronave antes de despegar',
  briefing:  'Exigir el briefing de la misión antes de autorizar el vuelo',
  maintenance_return: 'Lista de verificación al recibir el dron tras un mantenimiento',
  inventory: 'Qué equipos se requieren y qué se verifica en el inventario del día de la operación',
};

const LIMITS = { health: 30, briefing: 50, preflight: 70, maintenance_return: 30, inventory: 30 };

const CATEGORY_STYLE = {
  'Pre-vuelo':     { color: '#4f46e5', bg: '#eef2ff' },
  'En vuelo':      { color: '#0d9488', bg: '#f0fdfa' },
  'Post-vuelo':    { color: '#16a34a', bg: '#f0fdf4' },
  'Emergencia':    { color: '#dc2626', bg: '#fef2f2' },
  'Mantenimiento': { color: '#d97706', bg: '#fffbeb' },
};
const CATEGORIES = Object.keys(CATEGORY_STYLE);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function FormSettingsClient({ initialData }) {
    const [view, setView] = useState('grid'); // 'grid' | 'fixed'
    const [type, setType] = useState('briefing');
    const [selectedModel, setSelectedModel] = useState('General');
    const [models] = useState(initialData.models);
    const [labels, setLabels] = useState(initialData.initialLabels);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado de activación de cada protocolo
    const [enabled, setEnabled] = useState({
        health:    initialData.healthEnabled,
        preflight: initialData.preflightEnabled ?? true,
        briefing:  initialData.briefingEnabled ?? true,
    });

    // Conteo de campos configurados por (tipo[:modelo]) — para los badges del grid
    const [fieldCounts, setFieldCounts] = useState({});

    // Biblioteca de protocolos libres (Fase 2026-07-03)
    const [protocols, setProtocols] = useState([]);
    const [loadingProtocols, setLoadingProtocols] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [activePanel, setActivePanel] = useState(null); // 'new' | protocolo (edición) | null
    const [confirmDlg, setConfirmDlg] = useState(null);

    // Formatos de reporte SMS (VOR/MOR) — solo lectura aquí, se editan en /dashboard/vor-mor
    const [smsFormats, setSmsFormats] = useState([]);

    const loadProtocols = useCallback(async () => {
        setLoadingProtocols(true);
        try {
            const res = await fetch('/api/protocols');
            const data = await res.json();
            setProtocols(Array.isArray(data) ? data : []);
        } catch { setProtocols([]); }
        finally { setLoadingProtocols(false); }
    }, []);

    useEffect(() => {
        loadProtocols();

        (async () => {
            const [{ data: defs }, { data: vorMor }] = await Promise.all([
                supabase.from('form_definitions')
                    .select('form_type,aircraft_model,field_number')
                    .eq('organization_id', initialData.organizationId)
                    .in('form_type', ['health', 'preflight', 'briefing', 'maintenance_return', 'inventory']),
                supabase.from('vor_mor_definitions')
                    .select('type,title,description,custom_fields')
                    .eq('organization_id', initialData.organizationId),
            ]);
            const counts = {};
            (defs || []).forEach(d => {
                const key = d.form_type === 'preflight' ? `preflight:${d.aircraft_model}` : d.form_type;
                counts[key] = (counts[key] || 0) + 1;
            });
            setFieldCounts(counts);
            setSmsFormats(vorMor || []);
        })();
    }, [initialData.organizationId, loadProtocols]);

    // Solo se dispara cuando el usuario CAMBIA de pestaña, no al cargar la página
    useEffect(() => {
        if (type === 'briefing' && selectedModel === 'General') return; // Evitar re-fetch inicial

        async function fetchLabels() {
            setLoading(true);
            const query = supabase.from('form_definitions')
                .select('*')
                .eq('organization_id', initialData.organizationId)
                .eq('form_type', type);

            if (type === 'preflight') query.eq('aircraft_model', selectedModel);
            else query.eq('aircraft_model', 'General');

            const { data: defs } = await query;
            const labelMap = {};
            defs?.forEach(d => { labelMap[d.field_number] = d.label_text; });
            setLabels(labelMap);
            setLoading(false);
        }
        fetchLabels();
    }, [type, selectedModel, initialData.organizationId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(labels)
                .filter(([_, text]) => text && text.trim() !== "")
                .map(([num, text]) => ({
                    organization_id: initialData.organizationId,
                    form_type: type,
                    aircraft_model: type === 'preflight' ? selectedModel : 'General',
                    field_number: parseInt(num),
                    label_text: text.toUpperCase()
                }));

            const { error } = await supabase.from('form_definitions').upsert(updates);
            if (error) throw error;
            toast.success("Protocolo guardado exitosamente");
            const key = type === 'preflight' ? `preflight:${selectedModel}` : type;
            setFieldCounts(prev => ({ ...prev, [key]: updates.length }));
        } catch (e) {
            toast.error("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    // Cargar plantilla básica en los campos (no guarda hasta que el usuario presione Guardar)
    const handleLoadDefaults = () => {
        const defaults = CHECKLIST_DEFAULTS[type] || [];
        if (defaults.length === 0) return;
        const map = {};
        defaults.forEach((text, idx) => { map[idx + 1] = text.toUpperCase(); });
        // Conserva lo ya escrito por debajo de la plantilla si el usuario tenía más filas
        setLabels(prev => ({ ...prev, ...map }));
        toast.success("Plantilla básica cargada. Revisa y presiona Guardar.");
    };

    // Activar / desactivar el protocolo actual
    const toggleEnabled = async (formType) => {
        const column = ENABLE_COLUMN[formType];
        if (!column) return;
        const newStatus = !enabled[formType];
        setEnabled(prev => ({ ...prev, [formType]: newStatus }));
        const { error } = await supabase
            .from('organizations')
            .update({ [column]: newStatus })
            .eq('id', initialData.organizationId);
        if (error) {
            // Revertir en caso de error
            setEnabled(prev => ({ ...prev, [formType]: !newStatus }));
            toast.error("No se pudo actualizar: " + error.message);
        }
    };

    const openFixedEditor = (t, model) => {
        setType(t);
        setSelectedModel(model || 'General');
        setView('fixed');
    };

    const handleDeleteProtocol = (p) => {
        setConfirmDlg({
            isOpen: true,
            title: '¿Eliminar este protocolo?',
            message: `"${p.name}" se eliminará permanentemente.`,
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                setConfirmDlg(null);
                try {
                    const res = await fetch(`/api/protocols/${p.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error((await res.json()).error);
                    toast.success('Protocolo eliminado.');
                    loadProtocols();
                } catch (e) {
                    toast.error('Error: ' + e.message);
                }
            },
        });
    };

    const fixedCards = useMemo(() => {
        const cards = [
            { key: 'health', type: 'health', model: 'General', title: TYPE_TITLE.health },
            { key: 'briefing', type: 'briefing', model: 'General', title: TYPE_TITLE.briefing },
            { key: 'maintenance_return', type: 'maintenance_return', model: 'General', title: TYPE_TITLE.maintenance_return },
            // Inventario NO se edita aquí — es una tarjeta de navegación hacia su propia
            // página (/dashboard/inventory-checklist), que permite editar a jefe_pilotos
            // además de GG/GSMS (Protocolos como página completa no se lo permite).
            { key: 'inventory', type: 'inventory', model: 'General', title: TYPE_TITLE.inventory },
        ];
        ['General', ...models].forEach(m => {
            cards.push({ key: `preflight:${m}`, type: 'preflight', model: m, title: `Pre-vuelo · ${m}` });
        });
        return cards;
    }, [models]);

    const filteredProtocols = useMemo(() => {
        if (!categoryFilter) return protocols;
        return protocols.filter(p => p.category === categoryFilter);
    }, [protocols, categoryFilter]);

    // ── Vista principal: grid de Protocolos ─────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

            <PageHero
                eyebrow="Cumplimiento"
                title="Protocolos"
                description="Checklists y procedimientos estandarizados que la tripulación usa en cada misión"
                right={
                    <button onClick={() => setActivePanel('new')}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        Nuevo protocolo
                    </button>
                }
            />

            {initialData.showManualsLink && (
                <div className="flex justify-end -mt-2">
                    <Link href="/dashboard/manuales" className="text-xs font-black text-primary uppercase underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">library_books</span>
                        Ver manuales
                    </Link>
                </div>
            )}

            {/* Checklists operativos — los 4 tipos reales del sistema, ligados al despacho */}
            <section className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Checklists operativos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fixedCards.map(c => {
                        const count = fieldCounts[c.key] || 0;
                        // Inventario se edita en su propia página (permiso propio, incluye
                        // jefe_pilotos) — aquí es solo una tarjeta de navegación, no abre el
                        // editor interno de slots.
                        if (c.type === 'inventory') {
                            return (
                                <Link key={c.key} href="/dashboard/inventory-checklist"
                                    className="text-left bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:border-orange-200">
                                    <div className="flex items-center justify-between">
                                        <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-lg text-orange-600">{TYPE_ICON.inventory}</span>
                                        </div>
                                        <span className="text-[9.5px] font-black text-slate-300 uppercase">{TYPE_LABELS.inventory}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900">{c.title}</p>
                                    <p className="text-xs text-slate-500 leading-snug flex-1">{TYPE_HINTS.inventory}</p>
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                        <span className="text-[10.5px] font-bold text-slate-500">{count}/{LIMITS.inventory} campos</span>
                                        <span className="flex items-center gap-1 text-orange-600">
                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                            <span className="text-[10px] font-black uppercase">Gestionar</span>
                                        </span>
                                    </div>
                                </Link>
                            );
                        }
                        return (
                            <button key={c.key} onClick={() => openFixedEditor(c.type, c.model)}
                                className="text-left bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:border-orange-200">
                                <div className="flex items-center justify-between">
                                    <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-lg text-orange-600">{TYPE_ICON[c.type]}</span>
                                    </div>
                                    <span className="text-[9.5px] font-black text-slate-300 uppercase">{TYPE_LABELS[c.type]}</span>
                                </div>
                                <p className="text-sm font-black text-slate-900">{c.title}</p>
                                <p className="text-xs text-slate-500 leading-snug flex-1">{TYPE_HINTS[c.type]}</p>
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                    <span className="text-[10.5px] font-bold text-slate-500">{count}/{LIMITS[c.type]} campos</span>
                                    <span className="flex items-center gap-1 text-orange-600">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        <span className="text-[10px] font-black uppercase">Editar</span>
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Formatos de reporte SMS — editables desde VOR/MOR */}
            <section className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formatos de reporte SMS — editables</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['VOR', 'MOR'].map(t => {
                        const def = smsFormats.find(f => f.type === t);
                        const fallback = t === 'VOR'
                            ? { title: 'Reporte Voluntario (VOR)', description: 'Formato para reportar condiciones o eventos que pudieron afectar la seguridad, sin carácter obligatorio.' }
                            : { title: 'Reporte Obligatorio (MOR)', description: 'Formato para reportar incidentes o accidentes de reporte obligatorio ante AeroCivil.' };
                        // custom_fields puede ser array plano (formato antiguo) u objeto
                        // { base_overrides, custom } (formato actual) — parseFormConfig maneja ambos
                        const fieldCount = parseFormConfig(def?.custom_fields).custom.length;
                        return (
                            <Link key={t} href="/dashboard/vor-mor"
                                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:border-orange-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9.5px] font-black uppercase tracking-wide text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full font-mono">{t}</span>
                                    <span className="material-symbols-outlined text-lg text-slate-400">{t === 'VOR' ? 'description' : 'gavel'}</span>
                                </div>
                                <p className="text-sm font-black text-slate-900">{def?.title || fallback.title}</p>
                                <p className="text-xs text-slate-500 leading-snug flex-1">{def?.description || fallback.description}</p>
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                    <span className="text-[10.5px] font-bold text-slate-500">{fieldCount} campo{fieldCount === 1 ? '' : 's'} personalizado{fieldCount === 1 ? '' : 's'}</span>
                                    <span className="flex items-center gap-1 text-orange-600">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        <span className="text-[10px] font-black uppercase">Editar formato</span>
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* Protocolos y procedimientos — biblioteca libre */}
            <section className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Protocolos y procedimientos</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setCategoryFilter('')}
                            className={`px-3.5 py-1.5 rounded-full text-[10.5px] font-black transition-all ${categoryFilter === '' ? 'bg-[#1A202C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            Todos
                        </button>
                        {CATEGORIES.map(c => (
                            <button key={c} onClick={() => setCategoryFilter(c)}
                                className={`px-3.5 py-1.5 rounded-full text-[10.5px] font-black transition-all ${categoryFilter === c ? 'bg-[#1A202C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {loadingProtocols ? (
                    <div className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando protocolos...</div>
                ) : protocols.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 border-dashed p-14 text-center space-y-3">
                        <span className="material-symbols-outlined text-5xl text-slate-200">rule</span>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin protocolos registrados todavía</p>
                        <button onClick={() => setActivePanel('new')}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Crear el primero
                        </button>
                    </div>
                ) : filteredProtocols.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-14 text-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin protocolos en esta categoría</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProtocols.map(p => {
                            const cat = CATEGORY_STYLE[p.category] || CATEGORY_STYLE['Pre-vuelo'];
                            return (
                                <div key={p.id} onClick={() => setActivePanel(p)}
                                    className="text-left bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 cursor-pointer transition-all hover:shadow-md hover:border-orange-200 group relative">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProtocol(p); }}
                                        className="absolute top-4 right-4 size-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                    <div className="flex items-center justify-between pr-8">
                                        <span className="text-[9.5px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: cat.color, background: cat.bg }}>{p.category}</span>
                                        <span className="material-symbols-outlined text-lg text-slate-400">{p.icon || 'checklist'}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900 leading-snug">{p.name}</p>
                                    <p className="text-xs text-slate-500 leading-snug flex-1">{p.description || 'Sin descripción'}</p>
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                        <span className="text-[10.5px] font-bold text-slate-500">{(p.steps || []).length} paso{(p.steps || []).length === 1 ? '' : 's'}</span>
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            <span className="text-[9.5px] font-semibold">Act. {fmtDate(p.updated_at)}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {activePanel && (
                <AddProtocolPanel
                    protocol={activePanel === 'new' ? null : activePanel}
                    onClose={() => setActivePanel(null)}
                    onSuccess={() => { setActivePanel(null); loadProtocols(); }}
                />
            )}

            {/* ── Editor de checklist operativo — mismo shell que AddProtocolPanel ── */}
            {view === 'fixed' && (
                <aside className="fixed z-[300] bg-white flex flex-col text-left
                    inset-x-0 bottom-0 top-14 rounded-t-3xl
                    md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
                    shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
                    animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-400 truncate">Protocolos</span>
                            <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
                            <span className="text-xs font-black text-slate-900 shrink-0">
                                {type === 'preflight' ? `Pre-vuelo · ${selectedModel}` : TYPE_TITLE[type]}
                            </span>
                        </div>
                        <button type="button" onClick={() => setView('grid')}
                            className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                        {/* Hero */}
                        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento</p>
                            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">
                                {type === 'preflight' ? `Pre-vuelo · ${selectedModel}` : TYPE_TITLE[type]}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 mt-1">{TYPE_HINTS[type]}</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                            {loading ? (
                                <div className="p-16 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">Cambiando protocolo...</div>
                            ) : (
                                <>
                                    {/* Toggle de activación — solo para protocolos con columna de activación en organizations */}
                                    {ENABLE_COLUMN[type] ? (
                                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                                            <div className="pr-4">
                                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Activar Protocolo {TYPE_LABELS[type]}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{TYPE_HINTS[type]}</p>
                                            </div>
                                            <button type="button" onClick={() => toggleEnabled(type)}
                                                className={`px-4 py-2 rounded-lg text-[10.5px] font-black uppercase transition-all shrink-0 ${enabled[type] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                {enabled[type] ? 'ON' : 'OFF'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-2.5">
                                            <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                                            <span className="text-[10px] font-semibold text-orange-800 leading-snug">{TYPE_HINTS[type]}</span>
                                        </div>
                                    )}

                                    {/* Lista de slots */}
                                    <div className={`bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-opacity ${(ENABLE_COLUMN[type] ? enabled[type] : true) ? '' : 'opacity-50'}`}>
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                            <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Puntos de verificación</span>
                                            <span className="text-[10.5px] font-semibold text-slate-400">{LIMITS[type]} slots</span>
                                        </div>
                                        <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                            {Array.from({ length: LIMITS[type] }).map((_, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                                    <input
                                                        value={labels[i + 1] || ''}
                                                        placeholder="Describa el punto de chequeo..."
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                                        onChange={(e) => setLabels({ ...labels, [i + 1]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer fijo */}
                    <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
                        <button type="button" onClick={handleLoadDefaults}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
                            <span className="material-symbols-outlined text-base">playlist_add</span>
                            Plantilla básica
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">save</span>
                            {saving ? 'Sincronizando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </aside>
            )}
        </div>
    );
}
