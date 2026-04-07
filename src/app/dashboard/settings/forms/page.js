'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FormSettingsPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingForm, setEditingForm] = useState(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const res = await fetch('/api/form-templates');
        const data = await res.json();
        setTemplates(data);
        setLoading(false);
    };

    const addField = () => {
        const newSchema = [...(editingForm.schema || []), { label: 'Nuevo Campo', type: 'text', options: '' }];
        setEditingForm({ ...editingForm, schema: newSchema });
    };

    const saveChanges = async () => {
        const res = await fetch('/api/form-templates', {
            method: 'POST',
            body: JSON.stringify(editingForm)
        });
        if (res.ok) {
            alert("✅ Formato actualizado");
            setEditingForm(null);
            fetchTemplates();
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Sincronizando Archivo...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Gestión de Formatos</h2>
                    <p className="text-slate-500">Administra y personaliza tu papelería técnica aeronáutica.</p>
                </div>
                <button 
                    onClick={() => setEditingForm({ name: 'Nuevo Formato', form_code: 'F-NEW', version: '1.0', schema: [] })}
                    className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20"
                >
                    + Nuevo Formato
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(form => (
                    <div key={form.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black uppercase text-slate-500">{form.form_code}</span>
                            <span className="text-[8px] font-black text-[#ec5b13] uppercase">v{form.version}</span>
                        </div>
                        <h4 className="font-black text-slate-800 uppercase text-sm mb-6">{form.name}</h4>
                        <button 
                            onClick={() => setEditingForm(form)}
                            className="w-full py-3 bg-[#1A202C] text-white rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:bg-[#ec5b13] transition-all"
                        >
                            Modificar Celdas
                        </button>
                    </div>
                ))}
            </div>

            {/* EDITOR DE CELDAS (PANEL LATERAL) */}
            {editingForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex justify-end">
                    <aside className="w-full max-w-xl bg-white h-full p-10 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Editor de Formato</h3>
                            <button onClick={() => setEditingForm(null)} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <input className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingForm.name} onChange={e => setEditingForm({...editingForm, name: e.target.value})} placeholder="Nombre" />
                                <input className="p-4 bg-slate-50 rounded-2xl font-mono text-sm" value={editingForm.form_code} onChange={e => setEditingForm({...editingForm, form_code: e.target.value})} placeholder="Código" />
                            </div>

                            <div className="border-t border-slate-100 pt-6 space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Estructura de Datos (Celdas)</h4>
                                {editingForm.schema?.map((field, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl flex gap-3 items-center">
                                        <input className="flex-1 bg-transparent border-none font-bold text-xs" value={field.label} 
                                               onChange={e => {
                                                   const s = [...editingForm.schema];
                                                   s[idx].label = e.target.value;
                                                   setEditingForm({...editingForm, schema: s});
                                               }} />
                                        <select className="bg-white border-none rounded-lg text-[9px] font-black uppercase p-2" value={field.type}
                                                onChange={e => {
                                                   const s = [...editingForm.schema];
                                                   s[idx].type = e.target.value;
                                                   setEditingForm({...editingForm, schema: s});
                                                }}>
                                            <option value="text">Texto</option>
                                            <option value="number">Número</option>
                                            <option value="time">Hora</option>
                                            <option value="select">Selección</option>
                                            <option value="auto_sn">S/N Drone (Auto)</option>
                                            <option value="auto_cipu">CIPU (Auto)</option>
                                        </select>
                                        <button onClick={() => {
                                            const s = editingForm.schema.filter((_, i) => i !== idx);
                                            setEditingForm({...editingForm, schema: s});
                                        }} className="material-symbols-outlined text-red-300 text-sm">delete</button>
                                    </div>
                                ))}
                                <button onClick={addField} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:border-[#ec5b13] hover:text-[#ec5b13] transition-all">
                                    + Agregar Celda de Recolección
                                </button>
                            </div>

                            <button onClick={saveChanges} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest mt-10">
                                Guardar y Publicar Formato
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
