'use client';

export default function PilotCard({ pilot, onEdit, onDelete, canEdit }) {
  const today = new Date();
  const expiryDate = new Date(pilot.medical_expiry);
  const isExpired = expiryDate < today;
  const isWarning = !isExpired && (expiryDate - today) < (30 * 24 * 60 * 60 * 1000);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left h-40">
      
      <div className="w-32 bg-slate-100 dark:bg-slate-900 relative shrink-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
        <div className={`absolute top-2 left-2 px-2 py-0.5 text-[8px] font-black rounded uppercase ${
          isExpired ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
        }`}>
          {isExpired ? 'Médico Vencido' : isWarning ? 'Vence Pronto' : 'Médico OK'}
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="overflow-hidden">
            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">{pilot.name}</h3>
            <p className="text-[#ec5b13] text-[9px] font-black uppercase mt-0.5">{pilot.pilot_role?.replace('_', ' ') || 'Piloto'}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            {canEdit && (
              <>
                <button onClick={() => onEdit(pilot)} className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all">
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button 
                  onClick={() => { if(confirm(`¿Dar de baja a ${pilot.name}?`)) onDelete(pilot.id); }}
                  className="size-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Licencia</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{pilot.license_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Vence Médico</p>
            <p className={`text-xs font-black ${isExpired ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-700'}`}>
              {pilot.medical_expiry || 'No Registrada'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}