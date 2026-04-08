'use client';
export default function PilotCard({ pilot, canManage, onEdit, onDelete }) {
  const isMedicalExpired = new Date(pilot.medical_expiry) < new Date();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-4 group hover:shadow-md transition-all text-left">
      <div className="flex justify-between items-start">
        <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-3xl">person</span>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button onClick={() => onEdit(pilot)} className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600"><span className="material-symbols-outlined text-lg">edit</span></button>
            <button onClick={() => onDelete(pilot.id)} className="size-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white"><span className="material-symbols-outlined text-lg">delete</span></button>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-black text-slate-800 uppercase text-sm">{pilot.name}</h4>
        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{pilot.pilot_role || 'Piloto'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase">CIPU / Licencia</p>
          <p className="text-[11px] font-bold text-slate-700">{pilot.license_number || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase">Vencimiento Médico</p>
          <p className={`text-[11px] font-black ${isMedicalExpired ? 'text-red-600' : 'text-emerald-600'}`}>
            {pilot.medical_expiry || 'Pendiente'}
          </p>
        </div>
      </div>
    </div>
  );
}