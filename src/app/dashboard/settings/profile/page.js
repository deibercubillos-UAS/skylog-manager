'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { toast } from '@/lib/toast';
export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState(null);

    // REEMPLACE EL BLOQUE useEffect (Líneas 10 a 18 aprox) POR ESTE:
useEffect(() => {
    async function loadFullProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Traemos Perfil y Organización en una sola carga
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);

        if (prof?.organization_id) {
            const { data: orgData } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();
            setProfile(prev => ({ ...prev, company_name: orgData?.company_name, unique_code: orgData?.unique_code }));
        }
        setLoading(false);
    }
    loadFullProfile();
}, []);

    const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
        // Extraemos solo los campos que pertenecen a la tabla 'profiles'
        const updateData = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: `${profile.first_name} ${profile.last_name}`,
            phone: profile.phone,
            city: profile.city,
            address: profile.address,
            license_number: profile.license_number,
            medical_expiry: profile.medical_expiry,
            avatar_url: profile.avatar_url,
            emergency_contact_name: profile.emergency_contact_name,
            emergency_contact_phone: profile.emergency_contact_phone
        };

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id);

        if (error) throw error;
        toast.success("Expediente guardado exitosamente");
    } catch (err) {
        toast.error("Error al guardar: " + err.message);
    } finally {
        setUpdating(false);
    }
};

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO EXPEDIENTE...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mi Perfil</h2>
                    <p className="text-slate-500 text-sm">Gestión de identidad y credenciales aeronáuticas.</p>
                </div>
                <div className="text-right">
                    <span className="px-4 py-1 bg-orange-600 text-white rounded-full text-xs font-black uppercase tracking-widest">{profile.role?.replace('_', ' ')}</span>
                </div>
            </header>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* COLUMNA IZQUIERDA: FOTO Y CREDENCIALES */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="size-32 bg-slate-100 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 relative group">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} className="size-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-5xl text-slate-300">person</span>
                            )}
                        </div>
                        <div className="mt-4 w-full">
                          <FileUpload 
                                path="crew/avatars" 
                                label="Cambiar Foto de Perfil" 
                                // Esto SOLO actualiza la variable en memoria, no guarda en DB aún
                                onUploadSuccess={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))} 
                            />
                        </div>
                        <h3 className="font-black text-slate-900 uppercase leading-tight">{profile.full_name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{profile.email}</p>
                    </div>

                    <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-4">
                        <h4 className="text-orange-500 text-xs font-black uppercase tracking-widest border-b border-white/5 pb-2">Estatus Médico</h4>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase">Vencimiento Examen</label>
                            <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={profile.medical_expiry || ''} onChange={e => setProfile({...profile, medical_expiry: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase">Licencia / CIPU</label>
                            <input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white uppercase" placeholder="CO-CIPU-XXXX" value={profile.license_number || ''} onChange={e => setProfile({...profile, license_number: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS FORMULARIO */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <h4 className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Información de Contacto</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombres</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.first_name || ''} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Apellidos</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.last_name || ''} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Teléfono Móvil</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Ciudad</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                            </div>
                            <div className="col-span-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 mt-2">
                                <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Organización Actual</p>
                                <div className="flex justify-between items-center mt-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase">{profile.company_name || 'Individual'}</h3>
                                    <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-orange-200">ID: {profile.unique_code || '---'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <h4 className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Contacto de Emergencia</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.emergency_contact_name || ''} onChange={e => setProfile({...profile, emergency_contact_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Teléfono</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.emergency_contact_phone || ''} onChange={e => setProfile({...profile, emergency_contact_phone: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            disabled={updating}
                            type="submit" 
                            className="w-full py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-slate-900 active:scale-95"
                        >
                            {updating ? 'SINCRONIZANDO...' : 'GUARDAR EXPEDIENTE'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}