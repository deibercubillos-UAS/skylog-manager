'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ManageSubscriptionPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse font-black">Cargando perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mi Suscripción</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Gestión manual de membresía aeronáutica.</p>
            </header>

            <div className="bg-[#1A202C] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <span className="material-symbols-outlined text-9xl text-orange-500">verified</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[#ec5b13] text-xs font-black uppercase tracking-[0.3em] mb-2">Plan Actual</p>
                    <h3 className="text-5xl font-black uppercase tracking-tighter mb-6">{profile?.subscription_plan || 'PILOTO'}</h3>
                    <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-8">
                        Para cambios de plan, facturación corporativa o soporte técnico, por favor contacta a nuestro centro de mando.
                    </p>
                    <button className="bg-white text-[#1A202C] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all">
                        Contactar Soporte
                    </button>
                </div>
            </div>
        </div>
    );
}
