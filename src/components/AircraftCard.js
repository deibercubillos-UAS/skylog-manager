'use client';
export default function AircraftCard({ aircraft, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex group hover:shadow-md transition-all text-left h-44">
      <div className="w-40 bg-slate-100 relative shrink-0">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}
        ></div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase leading-tight">{aircraft.model}</h3>
            <p className="text-orange-600 text-[9px] font-bold font-mono uppercase tracking-widest">
              RUAS: {aircraft.ruas || 'Pte Registro'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(aircraft)} className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors">
              <span className="material-symbols-outlined text-lg">edit_square</span>
            </button>
            <button onClick={() => onDelete(aircraft.id)} className="size-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>

        <div className="flex gap-6 border-t pt-4">
           <div>
              <p className="text-[8px] font-black text-slate-400 uppercase">Horas Totales</p>
              <p className="text-xs font-bold text-slate-700">{aircraft.total_hours}h</p>
           </div>
           <div className="text-right flex-1">
              <p className="text-[8px] font-black text-slate-400 uppercase">S/N</p>
              <p className="text-[10px] font-mono text-slate-500">{aircraft.serial_number}</p>
           </div>
        </div>
      </div>
    </div>
  );
}