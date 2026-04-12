'use client';
export default function AircraftCard({ aircraft, onEdit, onDelete }) {
  if (!aircraft) return null; // Escudo 1

  const hours = parseFloat(aircraft.total_hours || 0);
  const lastMaintHours = parseFloat(aircraft.last_maintenance_hours || 0);
  const diffHours = Math.max(0, hours - lastMaintHours);
  const hourProgress = Math.min(100, (diffHours / 200) * 100);

  const creationDate = aircraft.created_at ? new Date(aircraft.created_at) : new Date();
  const lastDate = aircraft.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : creationDate;
  const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
  const timeProgress = Math.min(100, (daysSince / 182) * 100);

  const finalProgress = Math.max(hourProgress, timeProgress);
  let barColor = finalProgress >= 90 ? "bg-red-600" : finalProgress >= 75 ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col sm:flex-row group hover:shadow-md transition-all text-left">
      <div className="w-full sm:w-40 h-40 sm:h-auto bg-slate-100 shrink-0 relative">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}></div>
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
        <div className="flex justify-between items-start">
          <div className="truncate pr-2">
            <h3 className="font-black text-slate-900 text-base md:text-lg uppercase leading-tight truncate">{aircraft.model || 'UAS'}</h3>
            <p className="text-orange-600 text-[9px] font-black font-mono tracking-widest mt-1">RUAS: {aircraft.ruas || '---'}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onEdit(aircraft)} className="size-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit_square</span></button>
            <button onClick={() => onDelete(aircraft.id)} className="size-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-end">
            <p className="text-[10px] font-bold text-slate-700">{hours.toFixed(2)}h <span className="text-[8px] text-slate-400 uppercase">T.T</span></p>
            <p className="text-[8px] font-black text-slate-400 uppercase">Salud Técnica</p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${finalProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}