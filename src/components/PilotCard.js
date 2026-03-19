'use client';

export default function PilotCard({ pilot, onEdit, canEdit }) {
  // 1. Lógica de cálculo de vencimiento médico
  const today = new Date();
  const expiryDate = new Date(pilot.medical_expiry);
  const isExpired = expiryDate < today;
  const isWarning = !isExpired && (expiryDate - today) < (30 * 24 * 60 * 60 * 1000); // Menos de 30 días

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left h-36">
      
      {/* SECCIÓN IZQUIERDA: AVATAR Y ESTADO MÉDICO */}
      <div className="w-32 bg-slate-100 dark:bg-slate-900 relative shrink-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
        <div className={`absolute top-2 left-2 px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-tighter shadow-sm ${
          isExpired ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
        }`}>
          {isExpired ? 'Médico Vencido' : isWarning ? 'Vence Pronto' : 'Médico OK'}
        </div>
      </div>

      {/* SECCIÓN DERECHA: INFORMACIÓN Y ACCIONES */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        
        <div className="flex justify-between items-start">
          <div className="overflow-hidden">
            <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight truncate">{pilot.name}</h3>
            <p className="text-[#ec5b13] text-[9px] font-black uppercase tracking-[0.15em] mt-0.5">{pilot.pilot_role?.replace('_', ' ') || 'Piloto'}</p>
          </div>

          {/* ACCIONES: EDITAR Y DOCUMENTOS */}
          <div className="flex gap-2 shrink-0 ml-4">
            {/* BOTÓN EDITAR: Solo visible si tiene permisos (Admin/Gerente SMS) */}
            {canEdit && (
              <button 
                onClick={() => onEdit(pilot)}
                className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all"
                title="Editar Información"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            )}

            {pilot.certificate_url && (
              <a href={pilot.certificate_url} target="_blank" rel="noreferrer" className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#ec5b13] hover:border-[#ec5b13] transition-all">
                <span className="material-symbols-outlined text-lg">badge</span>
              </a>
            )}
            {pilot.medical_url && (
              <a href={pilot.medical_url} target="_blank" rel="noreferrer" className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#ec5b13] hover:border-[#ec5b13] transition-all">
                <span className="material-symbols-outlined text-lg">medical_services</span>
              </a>
            )}
          </div>
        </div>

        {/* INFO INFERIOR */}
        <div className="grid grid-cols-2 gap-4">
          <div className="overflow-hidden">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-0.5">Licencia / DAN</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{pilot.license_number || 'N/A'}</p>
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-0.5">Expiración Médica</p>
            <p className={`text-xs font-black ${isExpired ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {pilot.medical_expiry ? new Date(pilot.medical_expiry).toLocaleDateString() : 'No Registrada'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 shrink-0 ml-4">
        {canEdit && (
          <>
            <button 
              onClick={() => onEdit(pilot)}
              className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all"
              title="Editar"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>

            {/* NUEVO BOTÓN DE ELIMINAR (BAJA) */}
            <button 
              onClick={() => {
                if(confirm(`¿Está seguro de dar de baja al piloto ${pilot.name}? El historial de vuelos se conservará.`)) {
                  onDelete(pilot.id);
                }
              }}
              className="size-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
              title="Dar de baja"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </>
        )}
        {/* ... botones de documentos ... */}
      </div>
      
    </div>
  );
}