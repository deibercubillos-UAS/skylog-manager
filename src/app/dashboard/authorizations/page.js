'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';

export default function MissionControlPage() {
    const [activeTab, setActiveTab] = useState('basica');
    const [data, setData] = useState({ pilots: [], drones: [], missions: [], org: null, loading: true });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        const [mRes, pRes, dRes, oRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
            supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
        ]);
        
        setData({
            missions: await mRes.json(),
            pilots: pRes.data || [],
            drones: dRes.data || [],
            org: oRes.data,
            loading: false
        });
    };

    useEffect(() => { loadData(); }, []);

    if (data.loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Iniciando Torre de Control...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
    <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Mando y Control Operativo</p>
    </div>

    <div className="flex items-center gap-4">
        {/* BOTÓN DE ACCESO AL EDITOR DE CHECKLISTS */}
        {['superadmin', 'admin', 'gerente_sms'].includes(userRole) && (
            <Link 
                href="/dashboard/settings/forms" 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase shadow-sm"
            >
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                Editor de Protocolos
            </Link>
        )}

        <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
            <button onClick={() => setActiveTab('basica')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Básica</button>
            <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Aerocivil</button>
        </div>
    </div>
            </header>

            {activeTab === 'basica' ? (
                <BasicForm 
                    pilots={data.pilots} 
                    drones={data.drones} 
                    missions={data.missions} 
                    org={data.org} // <--- AÑADIR ESTO
                    loadData={loadData} 
                />
            ) : (
                <AerocivilForm 
                    drones={data.drones} 
                    pilots={data.pilots} 
                    org={data.org} // <--- ENLACE MAESTRO: Enviamos la organización al hijo
                    loadData={loadData} 
                />
            )}
        </div>
    );
}