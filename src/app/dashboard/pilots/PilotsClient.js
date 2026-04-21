'use client';
import { useState } from 'react';
// Asegúrate de tener este componente para agregar pilotos, si el nombre es distinto cámbialo aquí:
import AddPilotPanel from '@/components/AddPilotPanel'; 

export default function PilotsClient({ initialData }) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const { pilots, organization, userRole } = initialData;

  // Lógica de roles corregida:
  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy uppercase tracking-tighter">
            Tripulación: {organization.company_name}
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase">
            {pilots.length} MIEMBROS REGISTRADOS EN LA ORGANIZACIÓN
          </p>
        </div>

        {/* BOTÓN REGISTRAR: Ahora sí funcionará al hacer clic */}
        {canManage && (
          <button 
            onClick={() => setShowAddPanel(true)}
            className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Registrar Piloto / Staff
          </button>
        )}
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Miembro</th>
                <th className="px-6 py-4">Identificación / Licencia</th>
                <th className="px-6 py-4">Contacto Directo</th>
                <th className="px-6 py-4">Estado Médico</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-navy uppercase text-sm">{pilot.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{pilot.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {pilot.license_number || 'S.N.'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                    <div>{pilot.email}</div>
                    <div className="text-[10px] text-slate-400">{pilot.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                        pilot.medical_expiry && new Date(pilot.medical_expiry) < new Date() 
                        ? 'bg-red-50 text-red-600 border border-red-100' 
                        : 'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                      {pilot.medical_expiry ? pilot.medical_expiry : 'VIGENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-300 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL PARA AGREGAR (Se activa con el estado) */}
      {showAddPanel && (
        <AddPilotPanel 
          onClose={() => setShowAddPanel(false)} 
          onSuccess={() => {
            setShowAddPanel(false);
            window.location.reload(); // Recarga para ver el nuevo piloto
          }}
        />
      )}
    </div>
  );
}