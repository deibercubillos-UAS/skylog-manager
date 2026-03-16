'use client';

export default function MaintenanceDroneCard({ drone }) {
  // Simulamos límites técnicos (MTBF): Motores cada 200h, Hélices cada 50h
  const motorLimit = 200;
  const propLimit = 50;
  
  const motorHours = drone.total_hours % motorLimit;
  const propHours = drone.total_hours % propLimit;
  
  const motorPercent = (motorHours / motorLimit) * 100;
  const propPercent = (propHours / propLimit) * 100;

  // Determinar estado visual
  const isCritical = motorPercent > 90 || propPercent > 90;
  const isWarning = !isCritical && (motorPercent > 75 || propPercent > 75);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-[#ec5b13]/50 transition-all group text-left">
      {/* Cabecera con Imagen */}
      <div className="h-32 bg-slate-800 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:scale-110 transition-transform duration-700" 
          style={{ backgroundImage: `url(${drone.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}
        ></div>
        <div className={`absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse ${
          isCritical ? 'bg-red-500 text-white' : isWarning ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
        }`}>
          {isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'OPTIMAL'}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">{drone.model}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{drone.serial_number}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Total Flight</p>
            <p className="font-bold font-mono text-[#ec5b13]">{drone.total_hours}h</p>
          </div>
        </div>

        {/* Barras de Desgaste */}
        <div className="space-y-4">
          <HealthBar label="MOTORS MTBF" current={motorHours.toFixed(1)} max={motorLimit} percent={motorPercent} />
          <HealthBar label="PROPELLERS SERVICE" current={propHours.toFixed(1)} max={propLimit} percent={propPercent} />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500' : 'bg-green-500'}`}></span>
            <span className="text-[10px] font-black text-slate-500 uppercase">IMU Status OK</span>
          </div>
          <button className="text-[#ec5b13] text-[10px] font-black hover:underline uppercase tracking-widest">Ver Diagnóstico</button>
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, current, max, percent }) {
  const isHigh = percent > 85;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-slate-500 uppercase">{label}</span>
        <span className={`${isHigh ? 'text-red-500 font-black' : 'text-slate-400'} font-mono`}>{current}/{max}h</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isHigh ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-[#ec5b13]'}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}