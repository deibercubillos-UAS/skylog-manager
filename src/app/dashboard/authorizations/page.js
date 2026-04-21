'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link'; // FIX 1: Esto quita el error "Link is not defined"
import { createClient } from '@/utils/supabase/client'; // FIX 2: Motor optimizado
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';

export default function MissionControlPage() {
    const supabase = createClient();
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState('basica');
    const [data, setData] = useState({ 
        pilots: [], 
        drones: [], 
        missions: [], 
        org: null, 
        loading: true 
    });

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Obtener perfil con ROL y ORG_ID
            const { data: prof } = await supabase
                .from('profiles')
                .select('organization_id, role')
                .eq('id', user.id)
                .single();
            
            if (prof) setUserRole(prof.role); // FIX 3: Definimos userRole para el frontend

            if (prof?.organization_id) {
                // 2. CARGA MASIVA DE LA EMPRESA (No solo tu nombre)
                const [mRes, pRes, dRes, oRes] = await Promise.all([
                    fetch('/api/flights/authorize'),
                    // Traemos a TODOS los pilotos de la organización
                    supabase.from('profiles')
                        .select('id, full_name, role')
                        .eq('organization_id', prof.organization_id)
                        .eq('role', 'Piloto'),
                    // Traer aeronaves operativas
                    supabase.from('aircraft')
                        .select('*')
                        .eq('organization_id', prof.organization_id)
                        .eq('status', 'Operativo'),
                    // Datos de la empresa
                    supabase.from('organizations')
                        .select('*')
                        .eq('id', prof.organization_id)
                        .single()
                ]);
                
                setData({
                    missions: await mRes.json(),
                    pilots: pRes.data || [],
                    drones: dRes.data || [],
                    org: oRes.data,
                    loading: false
                });
            }
        } catch (error) {
            console.error("Error en Mission Control:", error);
            setData(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => { loadData(); }, []);

    if (data.loading) {
        return (
            <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400 tracking-widest">
                Abriendo Torre de Control...
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* 
               AQUÍ VA TU FRONTEND ROBUSTO ACTUAL 
               Ahora ya reconoce 'userRole' y tiene 'Link' importado.
            */}
            <header className="flex justify-between items-center border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black text-navy uppercase tracking-tighter">Programación</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase italic">
                        Organización: {data.org?.company_name}
                    </p>
                </div>
                <Link href="/dashboard" className="text-[10px] font-black text-primary uppercase underline">
                    Volver al mando
                </Link>
            </header>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('basica')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Misión Básica
                </button>
                <button 
                    onClick={() => setActiveTab('aerocivil')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Aerocivil (Apendice 13)
                </button>
            </div>

            {/* FORMULARIO DINÁMICO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-12">
                {activeTab === 'basica' ? (
                    <BasicForm pilots={data.pilots} drones={data.drones} userRole={userRole} />
                ) : (
                    <AerocivilForm pilots={data.pilots} drones={data.drones} userRole={userRole} />
                )}
            </div>
        </div>
    );
}