'use client';
import { useState } from 'react';
import BasicForm from '@/components/authorizations/BasicForm';
import AerocivilForm from '@/components/authorizations/AerocivilForm';

/**
 * Panel deslizable de "Nueva misión" — envuelve las pestañas Misión Básica /
 * Apéndice 13 (BasicForm/AerocivilForm, sin cambios) para incrustarlas sobre
 * el calendario de Programación en vez de navegar a una página aparte.
 */
export default function MissionFormPanel({ pilots, drones, org, userRole, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('basica');

  const handleCreated = () => {
    onSuccess?.();
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[760px] xl:max-w-[860px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Nueva misión</h3>
          <p className="text-xs font-bold text-slate-400 mt-0.5">Autorización de vuelo — {org?.company_name || ''}</p>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Selector de pestañas */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab('basica')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
            Misión Básica
          </button>
          <button onClick={() => setActiveTab('aerocivil')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
            Apéndice 13
          </button>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'basica' ? (
          <BasicForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={handleCreated} />
        ) : (
          <AerocivilForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={handleCreated} />
        )}
      </div>
    </aside>
  );
}
