'use client';

export default function AircraftCard({ aircraft }) {
  const isMaintenance = aircraft.status === 'Mantenimiento';
  
  // Cálculo del color del círculo de progreso
  const progressColor = aircraft.health > 90 ? '#ef4444' : '#ec5b13'; // Rojo si es crítico

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left">
      {/* Imagen y Estado */}
      <div className="w-48 bg-slate-100 dark:bg-slate-900 relative shrink-0">
        <div className={`absolute top-3 left-3 px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider z-10 ${
          isMaintenance ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
          {aircraft.status}
        </div>
        <div 
          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}
        ></div>
      </div>

      {/* Información Técnica */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{aircraft.model}</h3>
            <p className="text-[#ec5b13] text-xs font-black uppercase tracking-widest">{aircraft.serial_number.slice(-8)}</p>
          </div>
          
          {/* Círculo de Progreso (CSS puro) */}
          <div 
            className="size-12 rounded-full flex items-center justify-center text-[10px] font-black border-4 border-slate-100 relative"
            style={{ 
              background: `conic-gradient(${progressColor} ${aircraft.health}% , transparent 0)` 
            }}
          >
            <div className="absolute inset-0.5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
              {aircraft.health}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-auto">
          <Stat label="Serial Number" value={aircraft.serial_number} />
          <Stat label="Total Hours" value={`${aircraft.total_hours} h`} />
          <Stat label="MTOW" value={`${aircraft.mtow} kg`} />
          <Stat 
            label="Next Service" 
            value={isMaintenance ? 'INMEDIATO' : '25.5 h'} 
            highlight={isMaintenance}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="overflow-hidden">
      <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter truncate">{label}</p>
      <p className={`text-xs font-bold truncate ${highlight ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
        {value}
      </p>
    </div>
  );
}