'use client';
import BasicForm from '@/components/authorizations/BasicForm';
import { ROLE_LABELS } from '@/lib/roles';
// La pestaña "Apéndice 13" (AerocivilForm) queda oculta por ahora a pedido del usuario —
// el componente y su import siguen disponibles en components/authorizations/AerocivilForm.js
// para reactivarla más adelante sin reescribir nada.

/**
 * Panel deslizable de "Nueva misión" — envuelve el formulario (BasicForm, sin
 * cambios de lógica) para incrustarlo sobre el calendario de Programación en
 * vez de navegar a una página aparte.
 */
export default function MissionFormPanel({ pilots, drones, org, userRole, onClose, onSuccess }) {
  const handleCreated = () => {
    onSuccess?.();
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[760px] xl:max-w-[860px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header — breadcrumb + rol + cerrar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Programación</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">Nueva misión</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {userRole && (
            <span className="hidden sm:flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
              <span className="material-symbols-outlined text-xs text-indigo-600">verified_user</span>
              <span className="text-[9.5px] font-black uppercase tracking-wide text-indigo-600">Rol: {ROLE_LABELS[userRole] || userRole}</span>
            </span>
          )}
          <button type="button" onClick={onClose}
            className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <BasicForm pilots={pilots} drones={drones} org={org} userRole={userRole} loadData={handleCreated} onClose={onClose} />
      </div>
    </aside>
  );
}
