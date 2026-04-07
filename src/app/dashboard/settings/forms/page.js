'use client';
import { useState, useEffect } from 'react';

export default function FormSettingsPage() {
    const [settings, setSettings] = useState({ enabled_forms: [], form_metadata: {} });
    const [loading, setLoading] = useState(true);

    const PREDEFINED_FORMS = [
        { id: 'vuelo_diario', name: 'Formato de Vuelo Diario', defaultCode: 'F-OPS-001' },
        { id: 'registro_baterias', name: 'Registro Operacional de Baterías', defaultCode: 'F-MNT-003' },
        { id: 'inventario_mision', name: 'Inventario de Misión', defaultCode: 'F-LOG-004' },
        { id: 'bitacora_vuelos', name: 'Histórico de Vuelos (Bitácora)', defaultCode: 'F-OPS-002' },
        { id: 'historial_pilotos', name: 'Historial de Vuelo Pilotos', defaultCode: 'F-HUM-005' }
    ];

    useEffect(() => {
        fetch('/api/form-settings').then(r => r.json()).then(data => {
            // Inicializar metadatos si no existen
            const metadata = data.form_metadata || {};
            PREDEFINED_FORMS.forEach(f => {
                if (!metadata[f.id]) {
                    metadata[f.id] = { code: f.defaultCode, version: '1.0', date: new Date().toISOString().split('T')[0] };
                }
            });
            setSettings({ ...data, form_metadata: metadata });
            setLoading(false);
        });
    }, []);

    const toggleForm = (id) => {
        const newEnabled = settings.enabled_forms.includes(id)
            ? settings.enabled_forms.filter(f => f !== id)
            : [...settings.enabled_forms, id];
        setSettings({ ...settings, enabled_forms: newEnabled });
    };

    const updateMetadata = (id, field, value) => {
        const newMeta = { ...settings.form_metadata };
        newMeta[id][field] = value;
        setSettings({ ...settings, form_metadata: newMeta });
    };

    const saveSettings = async () => {
        const res = await fetch('/api/form-settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        if (res.ok) alert("✅ Configuración de formatos actualizada. El menú se refrescará.");
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Cargando Archivo...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Configuración Formatos</h2>
                    <p className="text-slate-500">Personaliza y activa la documentación oficial de tu empresa.</p>
                </div>
                <button onClick={saveSettings} className="bg-[#ec5b13] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                    Guardar Cambios
                </button>
            </header>

            <div className="space-y-6">
                {PREDEFINED_FORMS.map(form => (
                    <div key={form.id} className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col md:flex-row gap-8 items-center transition-all ${settings.enabled_forms.includes(form.id) ? 'border-[#ec5b13]' : 'border-slate-100'}`}>
                        <div className="flex-1 text-left">
                            <h4 className="font-black text-slate-800 uppercase text-lg">{form.name}</h4>
                            <button 
                                onClick={() => toggleForm(form.id)}
                                className={`mt-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${settings.enabled_forms.includes(form.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                            >
                                {settings.enabled_forms.includes(form.id) ? 'Activo en Menú' : 'Desactivado'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Código</label>
                                <input className="p-3 bg-slate-50 rounded-xl border-none font-mono text-xs w-32" value={settings.form_metadata[form.id]?.code} onChange={e => updateMetadata(form.id, 'code', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Versión</label>
                                <input className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs w-20" value={settings.form_metadata[form.id]?.version} onChange={e => updateMetadata(form.id, 'version', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">F. Modificación</label>
                                <input type="date" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs" value={settings.form_metadata[form.id]?.date} onChange={e => updateMetadata(form.id, 'date', e.target.value)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
