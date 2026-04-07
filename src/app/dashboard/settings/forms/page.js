'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FormSettingsPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingForm, setEditingForm] = useState(null);

    // Formatos Estándar base (si no existen en DB)
    const defaultForms = [
        { id: 'vuelo_diario', name: 'Formato de Vuelo Diario', form_code: 'F-OPS-001', version: '2.0', schema: { fields: ['drone', 'pilot', 'times', 'weather'] } },
        { id: 'bitacora_historica', name: 'Histórico de Vuelos', form_code: 'F-OPS-002', version: '1.5', schema: { fields: ['drone', 'pilot', 'total_time', 'location'] } },
        { id: 'registro_baterias', name: 'Operacional de Baterías', form_code: 'F-MNT-003', version: '1.0', schema: { fields: ['drone', 'battery_sn', 'cycles'] } }
    ];

    const loadTemplates = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from('form_templates').select('*').eq('owner_id', user.id);
        
        if (data && data.length > 0) {
            setTemplates(data);
        } else {
            // Inicializar con los defaults la primera vez
            setTemplates(defaultForms);
        }
        setLoading(false);
    };

    useEffect(() => { loadTemplates(); }, []);

    const handleSaveMetadata = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('form_templates').upsert({
            owner_id: user.id,
            id: editingForm.id.length > 20 ? editingForm.id : undefined, // Evitar UUID mal formado si es un ID de texto
            identifier: editingForm.id, // Guardamos el slug original (vuelo_diario)
            name: editingForm.name,
            form_code: editingForm.form_code,
            version: editingForm.version,
            schema: editingForm.schema,
            updated_at: new Date().toISOString()
        });

        if (!error) {
            alert("✅ Formato " + editingForm.form_code + " actualizado.");
            setEditingForm(null);
            loadTemplates();
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Sincronizando Formatos...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Configuración de Formatos</h2>
                <p className="text-slate-500 font-medium italic">Personaliza códigos, versiones y datos de recolección.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(form => (
                    <div key={form.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">{form.form_code}</span>
                                <span className="text-[8px] font-black text-[#ec5b13] uppercase tracking-widest">v{form.version}</span>
                            </div>
                            <h4 className="font-black text-slate-800 uppercase text-sm leading-tight mb-2">{form.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Modificado: {new Date(form.updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                        <button 
                            onClick={() => setEditingForm(form)}
                            className="mt-8 w-full py-3 bg-[#1A202C] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] transition-all"
                        >
                            Configurar Estructura
                        </button>
                    </div>
                ))}
            </div>

            {/* MODAL / PANEL DE EDICIÓN */}
            {editingForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex justify-end">
                    <aside className="w-full max-w-lg bg-white h-full p-10 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Formato</h3>
                            <button onClick={() => setEditingForm(null)} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
                        </div>

                        <form onSubmit={handleSaveMetadata} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Visible</label>
                                    <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={editingForm.name} onChange={e => setEditingForm({...editingForm, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código de Formato</label>
                                        <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-mono text-sm" value={editingForm.form_code} onChange={e => setEditingForm({...editingForm, form_code: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Versión</label>
                                        <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={editingForm.version} onChange={e => setEditingForm({...editingForm, version: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-8">
                                <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-[0.2em] mb-4">Campos de Recolección Activos</h4>
                                <div className="space-y-2">
                                    {['Drone Info', 'Pilot Info', 'Flight Times', 'Weather Conditions', 'Operation Type', 'Location'].map(field => (
                                        <label key={field} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                            <span className="text-xs font-bold text-slate-600">{field}</span>
                                            <input type="checkbox" defaultChecked className="rounded text-[#ec5b13] focus:ring-0" />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-[1.5rem] shadow-xl shadow-orange-500/20 uppercase text-xs tracking-widest mt-10">
                                Guardar Cambios en Plantilla
                            </button>
                        </form>
                    </aside>
                </div>
            )}
        </div>
    );
}
