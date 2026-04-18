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
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación</h2>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
                    <button onClick={() => setActiveTab('basica')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Básica</button>
                    <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Aerocivil</button>
                </div>
            </header>

            {activeTab === 'basica' ? (
                <BasicForm pilots={data.pilots} drones={data.drones} missions={data.missions} loadData={loadData} />
            ) : (
                <AerocivilForm 
                        drones={data.drones} 
                    pilots={data.pilots} 
                    org={data.org} // <--- ESTO ES LO QUE ESTABA FALTANDO
                    loadData={loadData} 
                />  
            )}
        </div>
    );
}