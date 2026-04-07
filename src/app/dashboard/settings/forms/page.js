'use client';
import { useState, useEffect } from 'react';

export default function FormSettingsPage() {
    const [settings, setSettings] = useState({ enabled_forms: [], custom_options: { op_types: [], inventory: [] } });
    const [loading, setLoading] = useState(true);

    const availableForms = [
        { id: 'vuelo_diario', name: 'Formato de Vuelo Diario', code: 'F-OPS-001', ver: '2.0' },
        { id: 'bitacora_historica', name: 'Histórico de Vuelos (Bitácora)', code: 'F-OPS-002', ver: '1.5' },
        { id: 'registro_baterias', name: 'Registro Operacional de Baterías', code: 'F-MNT-003', ver: '1.0' },
        { id: 'inventario_mision', name: 'Inventario de Misión', code: 'F-LOG-004', ver: '1.1' },
        { id: 'historial_pilotos', name: 'Historial de Vuelo Pilotos UAS', code: 'F-HUM-005', ver: '1.0' }
    ];

    useEffect(() => {
        fetch('/api/form-settings').then(r => r.json()).then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const toggleForm = (id) => {
        const newForms = settings.enabled_forms.includes(id)
            ? settings.enabled_forms.filter(f => f !== id)
            : [...settings.enabled_forms, id];
        updateSettings({ ...settings, enabled_forms: newForms });
    };

    const updateSettings = async (newVal) => {
        setSettings(newVal);
        await fetch('/api/form-settings', {
            method: 'POST',
            body: JSON.stringify(newVal)
        });
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black">Cargando Configuración...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Configuración de Formatos</h2>
                <p className="text-slate-500 font-medium italic">Activa los estándares aeronáuticos requeridos para tu operación.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableForms.map(form => (
                    <div key={form.id} className={`p-6 rounded-[2rem] border-2 transition-all flex justify-between items-center ${settings.enabled_forms.includes(form.id) ? 'border-[#ec5b13] bg-orange-50/20' : 'border-slate-100 bg-white'}`}>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-sm">{form.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{form.code} | Versión {form.ver}</p>
                        </div>
                        <button onClick={() => toggleForm(form.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${settings.enabled_forms.includes(form.id) ? 'bg-[#ec5b13] text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {settings.enabled_forms.includes(form.id) ? 'Activo' : 'Inactivo'}
                        </button>
                    </div>
                ))}
            </div>

            {/* SECCIÓN PERSONALIZACIÓN DE CAMPOS */}
            <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white">
                <h3 className="text-xl font-black uppercase mb-6 tracking-tight text-[#ec5b13]">Variables del Operador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipos de Operación</label>
                        <textarea 
                            className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm font-medium" 
                            rows="4"
                            placeholder="Fotogrametría, Inspección, Aspersión..."
                            value={settings.custom_options?.op_types?.join(', ')}
                            onChange={(e) => updateSettings({...settings, custom_options: {...settings.custom_options, op_types: e.target.value.split(', ')}})}
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inventario Adicional</label>
                        <textarea 
                            className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm font-medium" 
                            rows="4"
                            placeholder="Anemómetro, Radio Control, Tablet..."
                            value={settings.custom_options?.inventory?.join(', ')}
                            onChange={(e) => updateSettings({...settings, custom_options: {...settings.custom_options, inventory: e.target.value.split(', ')}})}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
