'use client';
export default function BatteryCard({ battery, onEdit }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-6 group hover:shadow-md transition-all text-left">
      <div className="size-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors">
        <span className="material-symbols-outlined text-3xl">battery_charging_full</span>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-black text-slate-800 uppercase text-sm">{battery.brand} {battery.model}</h4>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">S/N: {battery.serial_number}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${battery.status === 'Operativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {battery.status}
          </span>
        </div>
        <div className="flex gap-4 mt-4">
          <p className="text-[10px] font-bold text-slate-600">Ciclos: {battery.cycles || 0}</p>
          <p className="text-[10px] font-bold text-slate-600">Salud: {battery.health_status || 100}%</p>
        </div>
      </div>

      <button onClick={() => onEdit(battery)} className="material-symbols-outlined text-slate-300 hover:text-orange-600 transition-colors">
        edit_square
      </button>
    </div>
  );
}