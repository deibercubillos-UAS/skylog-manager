'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

// PERFORMANCE: los paneles solo se descargan cuando el usuario hace click en
// "Registrar Miembro" o en "Editar". Antes pesaban ~15 KB en el bundle inicial.
const AddPilotPanel = dynamic(() => import('@/components/AddPilotPanel'), {
  ssr: false,
});
const EditPilotPanel = dynamic(() => import('@/components/EditPilotPanel'), {
  ssr: false,
});

export default function PilotsClient({ initialData }) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
const [editingPilot, setEditingPilot] = useState(null);
const menuRef = useRef(null);

// Cerrar el menú al hacer click fuera
useEffect(() => {
    const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setOpenMenuId(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

const handleEdit = (pilot) => {
    setOpenMenuId(null);
    setEditingPilot(pilot);
};

const handleDelete = async (pilot) => {
    setOpenMenuId(null);
    if (!confirm(`¿Eliminar a ${pilot.full_name}? Esta acción es irreversible.`)) return;
    try {
        const { error } = await supabase.from('pilots').delete().eq('id', pilot.id);
        if (error) throw error;
        router.refresh();
    } catch (err) {
        alert('⚠️ No se pudo eliminar: ' + err.message);
    }
};
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
          <p className="text-gray-400 text-xs font-black uppercase">
            {pilots.length} MIEMBROS REGISTRADOS
          </p>
        </div>

        <div className="flex gap-2">
    {canManage && (
        <button 
            onClick={() => setShowAddPanel(true)}
            className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
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
              <tr className="text-xs font-black text-slate-400 uppercase tracking-widest">
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
                    <div className="text-xs text-slate-400 font-bold uppercase">{pilot.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {pilot.license_number || '---'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    <div>{pilot.email}</div>
                    <div className="text-xs text-slate-400">{pilot.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-black uppercase">
                    <span className={pilot.medical_expiry && new Date(pilot.medical_expiry) < new Date() ? 'text-red-500' : 'text-emerald-500'}>
                      {pilot.medical_expiry ? `Médico: ${pilot.medical_expiry}` : 'VIGENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    {canManage ? (
                        <div className="inline-block relative" ref={openMenuId === pilot.id ? menuRef : null}>
                            <button
                                onClick={() => setOpenMenuId(openMenuId === pilot.id ? null : pilot.id)}
                                className="size-11 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-navy transition-all active:scale-95"
                                title="Acciones"
                            >
                                <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                            {openMenuId === pilot.id && (
                                <div className="absolute right-0 top-12 z-20 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                    <button
                                        onClick={() => handleEdit(pilot)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-xs font-black uppercase text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">edit_square</span>
                                        Editar
                                    </button>
                                    <div className="border-t border-slate-100"></div>
                                    <button
                                        onClick={() => handleDelete(pilot)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-xs font-black uppercase text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="material-symbols-outlined text-slate-200">more_vert</span>
                    )}
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

      {editingPilot && (
          <EditPilotPanel 
              pilot={editingPilot} 
              onClose={() => setEditingPilot(null)} 
              onSuccess={() => { setEditingPilot(null); router.refresh(); }} 
          />
      )}
    </div>
  );
}