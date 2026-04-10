'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
            setLoading(false);
        }
        getProfile();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        const { error } = await supabase.from('profiles').update(profile).eq('id', profile.id);
        if (!error) alert("✅ Perfil Actualizado");
        setUpdating(false);
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
                    <span className="px-4 py-1 bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{profile.role?.replace('_', ' ')}</span>
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
                        <h3 className="font-black text-slate-900 uppercase leading-tight">{profile.full_name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{profile.email}</p>
                    </div>

                    <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-4">
                        <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">Estatus Médico</h4>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Vencimiento Examen</label>
                            <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={profile.medical_expiry || ''} onChange={e => setProfile({...profile, medical_expiry: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Licencia / CIPU</label>
                            <input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white uppercase" placeholder="CO-CIPU-XXXX" value={profile.license_number || ''} onChange={e => setProfile({...profile, license_number: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS FORMULARIO */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <h4 className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Información de Contacto</h4>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombres</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.first_name || ''} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Apellidos</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.last_name || ''} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono Móvil</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ciudad</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <h4 className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Contacto de Emergencia</h4>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.emergency_contact_name || ''} onChange={e => setProfile({...profile, emergency_contact_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono</label>
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