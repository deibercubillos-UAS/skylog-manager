'use client';

export default function AircraftCard({ aircraft }) {
  // --- LÓGICA DE CÁLCULO DE ESTADO REAL ---
  const today = new Date();
  const nextDate = aircraft.next_maintenance_date ? new Date(aircraft.next_maintenance_date) : null;
  
  // Cálculo de horas para el ciclo actual
  const interval = aircraft.maintenance_interval_hours || 50;
  const hoursInCycle = aircraft.total_hours % interval;
  const hoursRemaining = interval - hoursInCycle;

  // Determinar FLAGS de alerta
  const isExpiredByDate = nextDate && nextDate < today;
  const isExpiredByHours = hoursRemaining <= 0;
  const isWarningHours = hoursRemaining <= 5 && hoursRemaining > 0; // Alerta 5 horas antes
  
  // ESTADO FINAL
  let statusLabel = "Operativo";
  let statusColor = "bg-green-100 text-green-700 border-green-200";
  let dotColor = "bg-green-500";

  if (isExpiredByDate || isExpiredByHours || aircraft.status === 'Mantenimiento') {
    statusLabel = "Mantenimiento Requerido";
    statusColor = "bg-red-100 text-red-700 border-red-200";
    dotColor = "bg-red-500";
  } else if (isWarningHours) {
    statusLabel = "Inspección Próxima";
    statusColor = "bg-amber-100 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500";
  }

  // Porcentaje de salud técnica
  const healthPercent = Math.max(0, Math.min(100, (hoursRemaining / interval) * 100));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left h-48">
      
      {/* IMAGEN Y BADGE DINÁMICO */}
      <div className="w-48 bg-slate-100 dark:bg-slate-900 relative shrink-0">
        <div className={`absolute top-3 left-3 px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest z-10 shadow-sm ${statusColor}`}>
          {statusLabel}
        </div>
        <div 
          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}
        ></div>
      </div>

      {/* INFORMACIÓN TÉCNICA */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight uppercase tracking-tighter">
              {aircraft.model}
            </h3>
            <p className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] mt-1">
              S/N: {aircraft.serial_number}
            </p>
          </div>
          
          {/* Indicador de Salud Circular */}
          <div className="size-12 rounded-full border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center relative">
             <svg className="size-full -rotate-90">
                <circle 
                  cx="24" cy="24" r="18" fill="none" 
                  stroke={isExpiredByHours || isExpiredByDate ? "#ef4444" : "#ec5b13"} 
                  strokeWidth="4" 
                  strokeDasharray="113" 
                  strokeDashoffset={113 - (113 * healthPercent) / 100}
                  className="transition-all duration-1000"
                />
             </svg>
             <span className="absolute text-[9px] font-black">{Math.round(healthPercent)}%</span>
          </div>
        </div>

        {/* MÉTRICAS DE VUELO */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-50 dark:border-slate-700 pt-4">
          <div>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Total Horas</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{aircraft.total_hours?.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">MTOW</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{aircraft.mtow || 0}kg</p>
          </div>
          <div>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Próx. Servicio</p>
            <p className={`text-xs font-black font-mono ${isExpiredByHours ? 'text-red-500' : 'text-[#ec5b13]'}`}>
              {hoursRemaining.toFixed(1)}h
            </p>
          </div>
        </div>

        {/* ESTATUS DE SENSORES */}
        <div className="flex items-center gap-2 mt-2">
           <span className={`size-1.5 rounded-full ${dotColor} animate-pulse`}></span>
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
             {isExpiredByDate ? `Vencido el ${aircraft.next_maintenance_date}` : 'Sistemas de Vuelo OK'}
           </span>
        </div>
      </div>
    </div>
  );
}