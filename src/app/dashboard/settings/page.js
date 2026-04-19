'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [org, setOrg] = useState(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        async function loadOrgData() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            setProfile(prof);
            
            const { data: orgData } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
            if (orgData) setOrg(orgData);
            setLoading(false);
        }
        loadOrgData();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { data: updatedData, error: orgErr } = await supabase
                .from('organizations')
                .update({
                    company_name: org.company_name,
                    tax_id: org.tax_id,
                    tax_id_type: org.tax_id_type,
                    dan_number: org.dan_number,
                    legal_rep: org.legal_rep,
                    operator_email: org.operator_email,
                    phone: org.phone,
                    address: org.address
                })
                .eq('id', profile.organization_id)
                .select();

            if (orgErr) throw orgErr;
            if (!updatedData || updatedData.length === 0) throw new Error("No se pudo persistir el cambio.");

            alert("✅ Identidad Corporativa actualizada.");
            setOrg(updatedData[0]);
        } catch (err) {
            alert("⚠️ Error: " + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', org.id);
        setOrg({ ...org, logo_url: url });
        alert("✅ Logo actualizado.");
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">Sincronizando Identidad...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-700 pb-20 px-2 md:px-0">
            <header className="flex justify-between items-end border-b pb-6 px-2 md:px-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Configuración</h2>
                    <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase mt-2 tracking-widest">Identidad Legal de la Empresa</p>
                </div>
            </header>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                
                {/* COLUMNA IZQUIERDA: LOGO Y CÓDIGO (Apilado en mobile) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="size-28 md:size-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6">
                            {org.logo_url ? (
                                <img src={org.logo_url} className="size-full object-contain p-2" alt="Logo" />
                            ) : (
                                <span className="material-symbols-outlined text-4xl text-slate-300">business</span>
                            )}
                        </div>
                        <FileUpload path="org/logos" label="Actualizar Logo Corporativo" onUploadSuccess={updateLogo} />
                    </div>

                    <div className="bg-[#1A202C] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-white">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">ID de Vinculación</p>
                        <p className="text-xl md:text-2xl font-mono font-black text-orange-500 mt-1">{org.unique_code}</p>
                        <p className="text-[7px] text-slate-400 mt-4 uppercase leading-tight italic">
                            Proporcione este código a su tripulación para vincularlos a esta flota.
                        </p>
                    </div>
                </div>

                {/* COLUMNA DERECHA: FORMULARIO TÉCNICO-LEGAL */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <h4 className="col-span-full text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">01. Datos de Registro</h4>
                            
                            <div className="col-span-full space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Razón Social</label>
                                <input required className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.company_name || ''} onChange={e => setOrg({...org, company_name: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tipo Identificación</label>
                                <select 
                                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                    value={org.tax_id_type || 'NIT'}
                                    onChange={e => setOrg({...org, tax_id_type: e.target.value})}
                                >
                                    <option value="NIT">NIT (Empresa)</option>
                                    <option value="CC">Cédula (Persona Natural)</option>
                                    <option value="PP">Pasaporte</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">N° Documento</label>
                                <input required className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.tax_id || ''} onChange={e => setOrg({...org, tax_id: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">N° Explotador (DAN)</label>
                                <input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.dan_number || ''} onChange={e => setOrg({...org, dan_number: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Representante Legal</label>
                                <input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.legal_rep || ''} onChange={e => setOrg({...org, legal_rep: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4">
                            <h4 className="col-span-full text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">02. Contacto Administrativo</h4>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Email Corporativo</label>
                                <input type="email" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.operator_email || ''} onChange={e => setOrg({...org, operator_email: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Teléfono</label>
                                <input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.phone || ''} onChange={e => setOrg({...org, phone: e.target.value})} />
                            </div>

                            <div className="col-span-full space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Dirección Oficial</label>
                                <input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.address || ''} onChange={e => setOrg({...org, address: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            disabled={updating}
                            type="submit" 
                            className="w-full py-4 md:py-5 bg-slate-900 text-white font-black rounded-2xl md:rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-orange-600 active:scale-95"
                        >
                            {updating ? 'SINCRONIZANDO...' : 'ACTUALIZAR IDENTIDAD CORPORATIVA'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}