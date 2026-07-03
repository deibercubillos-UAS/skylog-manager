'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
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
};

const TYPE_TITLE = {
  health:    'Salud del piloto',
  briefing:  'Briefing de misión',
  maintenance_return: 'Recibo de mantenimiento',
};

const TYPE_ICON = {
  health: 'medical_services', preflight: 'checklist', briefing: 'groups', maintenance_return: 'build',
};

const TYPE_HINTS = {
  health:    'Solicitar chequeo médico del piloto antes de cada vuelo',
  preflight: 'Exigir la inspección física de la aeronave antes de despegar',
  briefing:  'Exigir el briefing de la misión antes de autorizar el vuelo',
  maintenance_return: 'Lista de verificación al recibir el dron tras un mantenimiento',
};

const LIMITS = { health: 30, briefing: 50, preflight: 70, maintenance_return: 30 };

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
                    .in('form_type', ['health', 'preflight', 'briefing', 'maintenance_return']),
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

    if (view === 'fixed') {
        return (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-500 pb-32 px-4 md:px-0">
                <button onClick={() => setView('grid')}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Protocolos
                </button>

                <PageHero
                    eyebrow="Cumplimiento"
                    title="Editor de Protocolos"
                    description={`Checklists y procedimientos de ${initialData.companyName || 'tu organización'}`}
                />
                {initialData.showManualsLink && (
                    <div className="flex justify-end -mt-4">
                        <Link href="/dashboard/manuales" className="text-xs font-black text-primary uppercase underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">library_books</span>
                            Ver manuales
                        </Link>
                    </div>
                )}
                <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-2 border-b pb-6">
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleLoadDefaults}
                            className="flex-1 md:flex-none bg-slate-100 text-slate-700 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-200 flex items-center justify-center gap-2"
                            title="Rellenar con una lista básica que puedes editar"
                        >
                            <span className="material-symbols-outlined text-base">playlist_add</span>
                            Plantilla básica
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 md:flex-none bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? 'SINCRO...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar">
                        {[{ id: 'health', label: 'SALUD' }, { id: 'preflight', label: 'PRE-VUELO' }, { id: 'briefing', label: 'BRIEFING' }, { id: 'maintenance_return', label: 'RECIBO MTTO' }].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setType(t.id)}
                                className={`flex-1 md:flex-none px-6 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${type === t.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {type === 'preflight' && (
                        <div className="flex items-center gap-3 animate-in slide-in-from-left">
                            <span className="text-xs font-black text-slate-400 uppercase ml-2">Modelo:</span>
                            <select
                                className="bg-white border-2 border-orange-100 p-3 rounded-2xl font-black text-xs uppercase text-orange-600 outline-none flex-1 md:flex-none"
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                            >
                                <option value="General">Modelo General</option>
                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Cambiando Protocolo...</div>
                ) : (
                    <>
                        {/* Toggle de activación — solo para protocolos con columna de activación en organizations */}
                        {ENABLE_COLUMN[type] ? (
                            <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="pr-4">
                                    <p className="text-xs font-black text-slate-900 uppercase">Activar Protocolo {TYPE_LABELS[type]}</p>
                                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold">{TYPE_HINTS[type]}</p>
                                </div>
                                <button
                                    onClick={() => toggleEnabled(type)}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${enabled[type] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {enabled[type] ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                                <span className="material-symbols-outlined text-orange-500">build</span>
                                <p className="text-xs text-slate-600 uppercase font-bold">{TYPE_HINTS[type]}</p>
                            </div>
                        )}

                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-opacity ${(ENABLE_COLUMN[type] ? enabled[type] : true) ? '' : 'opacity-50'}`}>
                            <div className="hidden md:flex p-4 bg-slate-50 border-b justify-between px-10 text-xs font-black text-slate-400 uppercase">
                                <span>Posición (Slot)</span>
                                <span>Descripción del Requerimiento Técnico</span>
                            </div>
                            <div className="p-4 md:p-10 grid grid-cols-1 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                                {Array.from({ length: LIMITS[type] }).map((_, i) => (
                                    <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 group border-b border-slate-50 pb-3 md:pb-0 md:border-none last:border-none">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-300 w-8 group-hover:text-orange-600 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                                            <span className="md:hidden text-xs font-black text-slate-400 uppercase tracking-widest">Requerimiento</span>
                                        </div>
                                        <input
                                            value={labels[i + 1] || ''}
                                            placeholder="Describa el punto de chequeo..."
                                            className="flex-1 p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:bg-orange-50 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                            onChange={(e) => setLabels({...labels, [i + 1]: e.target.value})}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

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
                        const fieldCount = def?.custom_fields?.length || 0;
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
        </div>
    );
}
