'use client';

export default function PilotCard({ pilot }) {
  const today = new Date();
  const expiryDate = new Date(pilot.medical_expiry);
  const isExpired = expiryDate < today;
  const isWarning = !isExpired && (expiryDate - today) < (30 * 24 * 60 * 60 * 1000); // Menos de 30 días

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left">
      {/* Avatar / Foto */}
      <div className="w-32 bg-slate-100 dark:bg-slate-900 relative shrink-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
        <div className={`absolute top-2 left-2 px-2 py-0.5 text-[8px] font-black rounded uppercase ${
          isExpired ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
        }`}>
          {isExpired ? 'Médico Vencido' : isWarning ? 'Próximo a Vencer' : 'Certificado OK'}
        </div>
      </div>

      {/* Información del Piloto */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{pilot.name}</h3>
            <p className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.1em]">{pilot.pilot_role || 'Piloto de Mando'}</p>
          </div>
          <button className="material-symbols-outlined text-slate-400 hover:text-[#ec5b13] text-lg transition-colors">edit</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-black">Licencia / ID</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{pilot.license_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-black">Vence Médico</p>
            <p className={`text-xs font-bold ${isExpired ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {pilot.medical_expiry}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}