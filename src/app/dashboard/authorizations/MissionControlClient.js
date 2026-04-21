'use client';
import { useState } from 'react';
import Link from 'next/link';
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';

export default function MissionControlClient({ initialData }) {
    const [activeTab, setActiveTab] = useState('basica');
    const { pilots, drones, org, userRole } = initialData;

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 text-left">
            {/* HEADER */}
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black text-navy uppercase tracking-tighter">Autorización de Vuelo</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase italic">
                        Centro de Control: {org?.company_name}
                    </p>
                </div>
                <Link href="/dashboard" className="text-[10px] font-black text-primary uppercase underline">
                    Volver al mando
                </Link>
            </header>

            {/* SELECTOR DE PESTAÑAS */}
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
                    Apendice 13 (Aerocivil)
                </button>
            </div>

            {/* FORMULARIOS (Tu diseño robusto intacto) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-12">
                {activeTab === 'basica' ? (
                    <BasicForm pilots={pilots} drones={drones} userRole={userRole} />
                ) : (
                    <AerocivilForm pilots={initialData.pilots} drones={drones} userRole={userRole} />
                )}
            </div>
            
            {/* FOOTER DE ESTADO */}
            <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Sincronizado con base de datos - {pilots.length} pilotos disponibles
                </span>
            </div>
        </div>
    );
}