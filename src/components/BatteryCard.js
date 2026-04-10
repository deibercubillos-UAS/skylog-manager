'use client';
export default function BatteryCard({ battery, onEdit, onDelete }) {
  const isExpired = battery.cycles >= 200;
  const health = battery.health_status || 100;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 flex items-center gap-4 group hover:shadow-md transition-all text-left">
      <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
        <span className="material-symbols-outlined text-2xl">battery_charging_full</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 uppercase text-[11px] truncate leading-none">{battery.brand} {battery.model}</h4>
        <div className="flex items-center gap-3 mt-2">
          <div>
             <p className="text-[7px] font-black text-slate-400 uppercase">Ciclos</p>
             <p className={`text-xs font-black ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>{battery.cycles}<span className="text-[9px] text-slate-300">/200</span></p>
          </div>
          <div className="border-l border-slate-100 pl-3">
             <p className="text-[7px] font-black text-slate-400 uppercase">Salud</p>
             <p className="text-xs font-black text-slate-700">{health}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <button onClick={() => onEdit(battery)} className="p-1 text-slate-300 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
        <button onClick={() => onDelete(battery.id)} className="p-1 text-slate-200 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
      </div>
    </div>
  );
}