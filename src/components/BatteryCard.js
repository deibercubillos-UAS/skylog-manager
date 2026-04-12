'use client';
export default function BatteryCard({ battery, onEdit, onDelete }) {
  const MAX_CYCLES = 200;
  const currentCycles = Number(battery?.cycles || 0); // Forzamos número
  const cycleProgress = Math.min(100, (currentCycles / MAX_CYCLES) * 100);

  let statusColor = "text-emerald-500";
  let barColor = "bg-emerald-500";
  let bgAlert = "bg-emerald-50";

  if (cycleProgress >= 80) { statusColor = "text-orange-500"; barColor = "bg-orange-500"; bgAlert = "bg-orange-50"; }
  if (cycleProgress >= 90) { statusColor = "text-red-600"; barColor = "bg-red-600"; bgAlert = "bg-red-50"; }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 flex items-center gap-4 group hover:shadow-md transition-all text-left">
      <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${bgAlert}`}>
        <span className={`material-symbols-outlined text-2xl ${statusColor}`}>battery_charging_full</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 uppercase text-[11px] truncate leading-none">{battery?.brand || 'Bat'} {battery?.model || ''}</h4>
        <div className="flex items-center gap-3 mt-2">
          <div>
             <p className="text-[7px] font-black text-slate-400 uppercase">Ciclos</p>
             <p className={`text-xs font-black ${cycleProgress >= 90 ? 'text-red-600' : 'text-slate-700'}`}>{currentCycles}<span className="text-[9px] text-slate-300">/200</span></p>
          </div>
          <div className="border-l border-slate-100 pl-3">
             <p className="text-[7px] font-black text-slate-400 uppercase">Salud</p>
             <p className="text-xs font-black text-slate-700">{battery?.health_status || 100}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <button onClick={() => onEdit(battery)} className="p-1 text-slate-300 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
        <button onClick={() => onDelete(battery?.id)} className="p-1 text-slate-200 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
      </div>
    </div>
  );
}