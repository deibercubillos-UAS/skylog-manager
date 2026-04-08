'use client';
export default function BatteryCard({ battery, onEdit, onDelete }) {
  const isExpired = battery.cycles >= 200;
  const isWarning = battery.cycles >= 180;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 group hover:shadow-md transition-all text-left">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${isExpired ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
        <span className="material-symbols-outlined text-2xl">battery_charging_full</span>
      </div>
      
      <div className="flex-1">
        <h4 className="font-black text-slate-800 uppercase text-xs truncate">{battery.brand} {battery.model}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[14px] font-black ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>{battery.cycles} / 200</span>
          <p className="text-[8px] font-bold text-slate-400 uppercase">Ciclos</p>
        </div>
        {isExpired && <p className="text-[7px] font-black text-red-500 uppercase animate-pulse">Retirar de servicio</p>}
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={() => onEdit(battery)} className="text-slate-300 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
        <button onClick={() => onDelete(battery.id)} className="text-slate-200 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
      </div>
    </div>
  );
}