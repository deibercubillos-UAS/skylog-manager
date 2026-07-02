'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import PageHero from '@/components/PageHero';
import ProgramacionActivaClient from '@/app/dashboard/programacion-activa/ProgramacionActivaClient';

const MissionFormPanel = dynamic(() => import('@/components/authorizations/MissionFormPanel'), { ssr: false });

export default function MissionControlClient({ initialData }) {
    const { pilots, drones, org, userRole } = initialData;
    const [panelOpen, setPanelOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // fuerza al calendario a re-consultar tras crear una misión

    return (
        <div className="space-y-5 md:space-y-6 pb-20 animate-in fade-in duration-500 text-left">
            {/* HEADER */}
            <PageHero
                eyebrow="Operación"
                title="Programación de misiones"
                description={`Calendario de vuelos, aeronaves y tripulación asignada — ${org?.company_name || ''}`}
                right={
                    <button
                        onClick={() => setPanelOpen(true)}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
                    >
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        Nueva misión
                    </button>
                }
            />

            {/* CALENDARIO — mismo componente que Programación Activa, incrustado */}
            <ProgramacionActivaClient
                key={refreshKey}
                embedded
                title="Programación de misiones"
                onCreateMission={() => setPanelOpen(true)}
            />

            {panelOpen && (
                <MissionFormPanel
                    pilots={pilots}
                    drones={drones}
                    org={org}
                    userRole={userRole}
                    onClose={() => setPanelOpen(false)}
                    onSuccess={() => { setPanelOpen(false); setRefreshKey(k => k + 1); }}
                />
            )}
        </div>
    );
}
