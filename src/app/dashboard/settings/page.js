'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [org, setOrg] = useState(null);
    const [profile, setProfile] = useState(null); // Estado del Usuario 

    useEffect(() => {
        async function loadOrgData() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            setProfile(prof); // <--- AGREGUE ESTA LÍNEA AQUÍ
            
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
            const { data: auth } = await supabase.auth.getUser();
            
            // 1. Intentar actualización
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
                .eq('id', org.id)
                .select(); // <--- IMPORTANTE: Pedimos los datos de vuelta para confirmar

            if (orgErr) throw orgErr;

            // 2. VERIFICACIÓN REAL: Si updatedData está vacío, RLS bloqueó la edición
            if (!updatedData || updatedData.length === 0) {
                throw new Error("Privilegios insuficientes: No tienes permiso para editar esta organización.");
            }

            alert("✅ Identidad Corporativa persistida en la base de datos.");
            setOrg(updatedData[0]); // Actualizamos el estado con la respuesta real de la DB
            
        } catch (err) {
            console.error("Falla de persistencia:", err.message);
            alert("⚠️ Error: " + err.message);
        } finally {
            setUpdating(false);
        }
        };  

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', org.id);
        setOrg({ ...org, logo_url: url });
        alert("✅ Logo corporativo actualizado.");
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">CARGANDO DATOS CORPORATIVOS...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Configuración</h2>
                    <p className="text-slate-500 text-sm">Gestión de identidad legal y operativa de la empresa.</p>
                </div>
            </header>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* COLUMNA IZQUIERDA: LOGO Y CÓDIGO */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="size-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6">
                            {org.logo_url ? (
                                <img src={org.logo_url} className="size-full object-contain p-2" alt="Logo" />
                            ) : (
                                <span className="material-symbols-outlined text-4xl text-slate-300">business</span>
                            )}
                        </div>
                        <FileUpload path="org/logos" label="Cargar Logo PNG" onUploadSuccess={updateLogo} />
                    </div>

                    <div className="bg-[#1A202C] p-6 rounded-[2rem] text-white">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ID Único de Vinculación</p>
                        <p className="text-xl font-mono font-black text-orange-500 mt-1">{org.unique_code}</p>
                        <p className="text-[7px] text-slate-400 mt-4 uppercase leading-tight italic">
                            Comparta este código con sus pilotos para que se vinculen a su organización.
                        </p>
                    </div>
                </div>

                {/* COLUMNA DERECHA: FORMULARIO LEGAL */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <h4 className="col-span-2 text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">Información Legal</h4>
                            
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Razón Social</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.company_name || ''} onChange={e => setOrg({...org, company_name: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Identificación</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                                    value={org.tax_id_type || 'NIT'} // Cambiado de profile.id_type a org.tax_id_type
                                    onChange={e => setOrg({...org, tax_id_type: e.target.value})}
                                >
                                    <option value="NIT">NIT (Persona Jurídica)</option>
                                    <option value="CC">Cédula de Ciudadanía</option>
                                    <option value="CE">Cédula de Extranjería</option>
                                    <option value="PP">Pasaporte</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Numero de Identificación</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.tax_id || ''} onChange={e => setOrg({...org, tax_id: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">N° Explotador (DAN)</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.dan_number || ''} onChange={e => setOrg({...org, dan_number: e.target.value})} />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Representante Legal</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.legal_rep || ''} onChange={e => setOrg({...org, legal_rep: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <h4 className="col-span-2 text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">Contacto Corporativo</h4>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</label>
                                <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.operator_email || ''} onChange={e => setOrg({...org, operator_email: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.phone || ''} onChange={e => setOrg({...org, phone: e.target.value})} />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dirección Física</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={org.address || ''} onChange={e => setOrg({...org, address: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            disabled={updating}
                            type="submit" 
                            className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-orange-600 active:scale-95"
                        >
                            {updating ? 'GUARDANDO...' : 'ACTUALIZAR IDENTIDAD CORPORATIVA'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}