'use client';
import { useState } from 'react';
import Link from 'next/link';
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';
import PageHero from '@/components/PageHero';

export default function MissionControlClient({ initialData }) {
    const [activeTab, setActiveTab] = useState('basica');
    const { pilots, drones, org, userRole } = initialData;

    // Tras crear una misión, no refrescamos tabla aquí (vive en Programación Activa)
    const loadData = () => {};

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 text-left">
            {/* HEADER */}
            <PageHero
                eyebrow="Operación"
                title="Autorización de Vuelo"
                description={`Centro de Control: ${org?.company_name || ''}`}
            />
            <div className="flex justify-end -mt-4">
                <Link href="/dashboard/programacion-activa" className="text-xs font-black text-primary uppercase underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">flight_takeoff</span>
                    Ver programación activa
                </Link>
            </div>

            {/* SELECTOR DE PESTAÑAS */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                    onClick={() => setActiveTab('basica')}
                    className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Misión Básica
                </button>
                <button
                    onClick={() => setActiveTab('aerocivil')}
                    className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Apéndice 13
                </button>
            </div>

            {/* CONTENIDO */}
            {activeTab === 'basica' ? (
                <BasicForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={loadData} />
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-12">
                    <AerocivilForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={loadData} />
                </div>
            )}

            {/* FOOTER DE ESTADO */}
            <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Sincronizado con base de datos - {pilots.length} pilotos disponibles
                </span>
            </div>
        </div>
    );
}
