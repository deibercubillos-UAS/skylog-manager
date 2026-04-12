'use client';
export default function AircraftCard({ aircraft, onEdit, onDelete }) {
  // CONFIGURACIÓN TÉCNICA Y PROTECCIÓN DE DATOS
  const LIMIT_HOURS = 200;
  const LIMIT_DAYS = 182; 

  const hours = parseFloat(aircraft?.total_hours || 0);
  const lastMaintHours = parseFloat(aircraft?.last_maintenance_hours || 0);
  const hoursSinceMaint = Math.max(0, hours - lastMaintHours);
  const hourProgress = (hoursSinceMaint / LIMIT_HOURS) * 100;

  const lastMaintDate = aircraft?.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : new Date(aircraft?.created_at || Date.now());
  const diffTime = Math.abs(new Date() - lastMaintDate);
  const daysSinceMaint = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const timeProgress = (daysSinceMaint / LIMIT_DAYS) * 100;

  const finalProgress = Math.min(100, Math.max(hourProgress, timeProgress) || 0);
  const isTimeCritical = timeProgress > hourProgress;

  let barColor = "bg-emerald-500";
  let statusText = "Sistemas OK";
  if (finalProgress >= 75) barColor = "bg-orange-500";
  if (finalProgress >= 90) { barColor = "bg-red-600"; statusText = "Servicio Requerido"; }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col sm:flex-row group hover:shadow-md transition-all text-left">
      <div className="w-full sm:w-40 h-40 sm:h-auto bg-slate-100 relative shrink-0">
        <div 
          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
          style={{ backgroundImage: `url(${aircraft?.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}
        ></div>
        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm">
           <p className="text-[8px] font-black text-slate-900 uppercase leading-none">Status</p>
           <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">{aircraft?.status || 'Operativo'}</p>
        </div>
      </div>

      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-slate-900 text-base md:text-lg uppercase leading-tight truncate max-w-[150px]">{aircraft?.model || 'UAS'}</h3>
            <p className="text-orange-600 text-[9px] font-black font-mono tracking-widest mt-1">RUAS: {aircraft?.ruas || '---'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(aircraft)} className="size-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-all"><span className="material-symbols-outlined text-lg">edit_square</span></button>
            <button onClick={() => onDelete(aircraft?.id)} className="size-8 rounded-xl bg-red-50/50 flex items-center justify-center text-red-400 hover:bg-red-600 transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-end">
            <div>
                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{statusText}</p>
                <p className="text-[10px] md:xs font-black mt-1">
                    {isTimeCritical ? `${Math.max(0, LIMIT_DAYS - daysSinceMaint)} días` : `${Math.max(0, LIMIT_HOURS - hoursSinceMaint).toFixed(2)}h`} <span className="font-medium text-slate-400">restantes</span>
                </p>
            </div>
            <p className="text-[10px] font-bold text-slate-900 font-mono">{(hours).toFixed(2)}h <span className="text-[8px] text-slate-400 uppercase">T.T</span></p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${finalProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}