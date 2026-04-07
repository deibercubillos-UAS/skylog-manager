'use client';

export default function BatteryCard({ battery, onEdit }) {
  const isCritical = battery.cycles >= 200; // Ejemplo: alerta a los 200 ciclos

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 p-6 flex items-center gap-6 group hover:shadow-md transition-all text-left">
      <div className="size-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#ec5b13] transition-colors">
        <span className="material-symbols-outlined text-3xl">battery_charging_full</span>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-black text-slate-800 uppercase text-sm">{battery.brand} {battery.model}</h4>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">S/N: {battery.serial_number}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isCritical ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {battery.status}
          </span>
        </div>

        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ciclos</p>
            <p className={`text-sm font-black ${isCritical ? 'text-red-500' : 'text-slate-700'}`}>{battery.cycles}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salud</p>
            <p className="text-sm font-black text-slate-700">{battery.health_status}%</p>
          </div>
        </div>
      </div>

      <button onClick={() => onEdit(battery)} className="material-symbols-outlined text-slate-200 hover:text-[#ec5b13] transition-colors">edit</button>
    </div>
  );
}