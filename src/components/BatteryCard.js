'use client';
export default function BatteryCard({ battery, onEdit, onDelete }) {
  const MAX_CYCLES = 200;
  const currentCycles = parseInt(battery.cycles || 0);
  const cycleProgress = Math.min(100, (currentCycles / MAX_CYCLES) * 100);

  // Lógica de Alerta Visual
  let statusColor = "text-emerald-500";
  let barColor = "bg-emerald-500";
  let bgAlert = "bg-emerald-50";

  if (cycleProgress >= 80) {
    statusColor = "text-orange-500";
    barColor = "bg-orange-500";
    bgAlert = "bg-orange-50";
  }
  if (cycleProgress >= 90) {
    statusColor = "text-red-600";
    barColor = "bg-red-600";
    bgAlert = "bg-red-50";
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col gap-4 group hover:shadow-md transition-all text-left">
      <div className="flex justify-between items-start">
        <div className={`size-10 rounded-2xl ${bgAlert} flex items-center justify-center transition-colors`}>
          <span className={`material-symbols-outlined text-2xl ${statusColor}`}>battery_charging_full</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(battery)} className="p-1.5 text-slate-300 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
          <button onClick={() => onDelete(battery.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
        </div>
      </div>

      <div>
        <h4 className="font-black text-slate-800 uppercase text-xs truncate">{battery.brand} {battery.model}</h4>
        <p className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-0.5">S/N: {battery.serial_number}</p>
      </div>

      <div className="space-y-2 mt-2">
        <div className="flex justify-between items-end">
          <p className={`text-[9px] font-black uppercase ${statusColor}`}>
            {currentCycles} / {MAX_CYCLES} <span className="opacity-60">Ciclos</span>
          </p>
          <p className="text-[10px] font-bold text-slate-700">{Math.round(cycleProgress)}% <span className="text-[8px] text-slate-400 uppercase tracking-tighter">Uso</span></p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${cycleProgress}%` }}></div>
        </div>
        {cycleProgress >= 90 && <p className="text-[7px] font-black text-red-600 uppercase animate-pulse">Retiro de servicio recomendado</p>}
      </div>
    </div>
  );
}