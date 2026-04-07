'use client';
import { useState, useEffect } from 'react';

export default function FormBuilder() {
    const [forms, setForms] = useState([]);
    const [newForm, setNewForm] = useState({ name: '', form_code: '', version: '1.0', schema: [] });

    useEffect(() => {
        fetch('/api/form-templates').then(r => r.json()).then(setForms);
    }, []);

    const saveForm = async () => {
        const res = await fetch('/api/form-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newForm)
        });
        if (res.ok) alert("Formato guardado");
    };

    return (
        <div className="space-y-8 text-left">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Formatos de Recolección</h2>
                <p className="text-slate-500">Configura Bitácoras, Mantenimientos y registros personalizados.</p>
            </header>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Formato</label>
                        <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold" 
                               placeholder="Ej: Bitácora de Vuelo" 
                               onChange={e => setNewForm({...newForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código de Formato</label>
                        <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-mono" 
                               placeholder="F-OPS-001" 
                               onChange={e => setNewForm({...newForm, form_code: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Versión</label>
                        <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold" 
                               placeholder="1.0" 
                               onChange={e => setNewForm({...newForm, version: e.target.value})} />
                    </div>
                </div>
                <button onClick={saveForm} className="bg-[#ec5b13] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Registrar Nuevo Formato</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {forms.map(f => (
                    <div key={f.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="font-black uppercase text-slate-800">{f.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.form_code} | v{f.version}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-200">edit_note</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
