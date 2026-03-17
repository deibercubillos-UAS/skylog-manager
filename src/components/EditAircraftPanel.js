'use client';

export default function AircraftCard({ aircraft }) {
  // LÓGICA DE ALERTAS
  const hoursRemaining = (aircraft.maintenance_interval_hours || 50) - (aircraft.total_hours % (aircraft.maintenance_interval_hours || 50));
  
  const today = new Date();
  const nextServiceDate = aircraft.next_maintenance_date ? new Date(aircraft.next_maintenance_date) : null;
  const daysRemaining = nextServiceDate ? Math.ceil((nextServiceDate - today) / (1000 * 60 * 60 * 24)) : 999;

  // Criterios de Alerta (Punto Rojo)
  const isNearMaintenance = hoursRemaining <= 5 || daysRemaining <= 7;
  const isMaintenanceOverdue = aircraft.status === 'Mantenimiento' || hoursRemaining <= 0 || daysRemaining <= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left relative h-44">
      
      {/* INDICADOR DE ALERTA (PUNTO ROJO) */}
      {(isNearMaintenance || isMaintenanceOverdue) && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg">
          <span className="size-1.5 bg-white rounded-full"></span>
          INSPECCIÓN REQUERIDA
        </div>
      )}

      {/* Imagen */}
      <div className="w-44 bg-slate-100 dark:bg-slate-900 relative shrink-0">
        <img 
          src={aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'} 
          alt={aircraft.model}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Info Técnica */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="overflow-hidden">
            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">{aircraft.model}</h3>
            <p className="text-[#ec5b13] text-[9px] font-black uppercase tracking-widest">{aircraft.serial_number}</p>
          </div>
          
          {/* Círculo de Salud dinámico basado en las horas reales */}
          <div 
            className="size-10 rounded-full flex items-center justify-center text-[9px] font-black border-4 border-slate-50 relative shrink-0"
            style={{ 
              background: `conic-gradient(${isNearMaintenance ? '#ef4444' : '#ec5b13'} ${(1 - (hoursRemaining / (aircraft.maintenance_interval_hours || 50))) * 100}%, #f1f5f9 0)` 
            }}
          >
            <div className="absolute inset-0.5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
              {Math.round((1 - (hoursRemaining / (aircraft.maintenance_interval_hours || 50))) * 100)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-50 pt-3 mt-2">
          <StatMini label="Horas Totales" value={`${aircraft.total_hours?.toFixed(1)} h`} />
          <StatMini label="MTOW" value={`${aircraft.mtow || 0} kg`} />
          <StatMini 
            label="Mantenimiento" 
            value={daysRemaining < 30 ? `En ${daysRemaining} días` : 'Programado'} 
            color={daysRemaining <= 7 ? 'text-red-500' : 'text-slate-500'}
          />
          <StatMini 
            label="Horas Restantes" 
            value={`${hoursRemaining.toFixed(1)} h`}
            color={hoursRemaining <= 5 ? 'text-red-500' : 'text-[#ec5b13]'}
          />
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color = "text-slate-700" }) {
  return (
    <div className="overflow-hidden">
      <p className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{label}</p>
      <p className={`text-[11px] font-bold truncate ${color}`}>{value}</p>
    </div>
  );
}