'use client';
export default function AircraftCard({ aircraft, onEdit, onDelete }) {
  // Lógica de Mantenimiento (Intervalo 50h)
  const hours = parseFloat(aircraft.total_hours || 0);
  const remainingHours = (50 - (hours % 50)).toFixed(1);
  const percentage = (remainingHours / 50) * 100;

  // Determinar color del semáforo
  let barColor = "bg-emerald-500";
  if (remainingHours <= 10) barColor = "bg-orange-500";
  if (remainingHours <= 2) barColor = "bg-red-600";

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left h-48">
      <div className="w-40 bg-slate-100 relative shrink-0">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}></div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase leading-tight">{aircraft.model}</h3>
            <p className="text-orange-600 text-[9px] font-bold font-mono tracking-widest">RUAS: {aircraft.ruas || 'PTE'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(aircraft)} className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors"><span className="material-symbols-outlined text-lg">edit_square</span></button>
            <button onClick={() => onDelete(aircraft.id)} className="size-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <p className="text-[8px] font-black text-slate-400 uppercase">Salud Técnica: {remainingHours}h para servicio</p>
            <p className="text-[10px] font-bold text-slate-700">{hours}h Totales</p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}