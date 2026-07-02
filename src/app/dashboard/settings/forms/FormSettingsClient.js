'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { CHECKLIST_DEFAULTS } from '@/lib/checklistDefaults';
import PageHero from '@/components/PageHero';

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

const TYPE_HINTS = {
  health:    'Solicitar chequeo médico del piloto antes de cada vuelo',
  preflight: 'Exigir la inspección física de la aeronave antes de despegar',
  briefing:  'Exigir el briefing de la misión antes de autorizar el vuelo',
  maintenance_return: 'Lista de verificación al recibir el dron tras un mantenimiento',
};

export default function FormSettingsClient({ initialData }) {
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

    const LIMITS = { health: 30, briefing: 50, preflight: 70, maintenance_return: 30 };

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

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-500 pb-32 px-4 md:px-0">
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
