'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // IMPORTANTE
import AddPilotPanel from '@/components/AddPilotPanel'; 

export default function PilotsClient({ initialData }) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const { pilots, organization, userRole } = initialData;
  const router = useRouter(); // Inicializamos el router

  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  const handleSuccess = () => {
    setShowAddPanel(false);
    // REVALIDACIÓN AERONÁUTICA:
    // Esto le dice a Next.js: "Los datos en el servidor cambiaron, tráelos de nuevo"
    router.refresh(); 
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy uppercase tracking-tighter">
            Tripulación: {organization.company_name}
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase">
            {pilots.length} MIEMBROS REGISTRADOS
          </p>
        </div>

        <div className="flex gap-2">
          {/* Botón de refresco manual por si el internet falla */}
          <button 
            onClick={() => router.refresh()} 
            className="p-2.5 text-slate-400 hover:text-navy transition-colors bg-white rounded-xl border border-slate-100 shadow-sm"
            title="Refrescar lista"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>

          {canManage && (
            <button 
              onClick={() => setShowAddPanel(true)}
              className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Registrar Miembro
            </button>
          )}
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Miembro</th>
                <th className="px-6 py-4">Licencia</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-gray-50/50 transition-colors animate-in fade-in duration-300">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-navy uppercase text-sm">{pilot.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{pilot.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {pilot.license_number || '---'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    <div>{pilot.email}</div>
                    <div className="text-[10px] text-slate-400">{pilot.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase">
                    <span className={pilot.medical_expiry && new Date(pilot.medical_expiry) < new Date() ? 'text-red-500' : 'text-emerald-500'}>
                      {pilot.medical_expiry ? `Médico: ${pilot.medical_expiry}` : 'VIGENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    <span className="material-symbols-outlined">more_vert</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pilots.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold uppercase text-xs">No hay tripulación en base.</div>
          )}
        </div>
      </div>

      {showAddPanel && (
        <AddPilotPanel 
          onClose={() => setShowAddPanel(false)} 
          onSuccess={handleSuccess} 
        />
      )}
    </div>
  );
}