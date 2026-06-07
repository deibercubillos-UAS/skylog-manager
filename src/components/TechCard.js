'use client';
export default function TechCard({ item, onEdit, onDelete, canManage = true }) {
  if (!item) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 group hover:shadow-md transition-all text-left">
      <div className="size-14 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-600 transition-colors">
          {item.category?.toLowerCase().includes('camara') ? 'photo_camera' : 'settings_input_component'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 uppercase text-xs truncate leading-none">
          {item.brand} {item.model}
        </h4>
        <p className="text-xs font-mono text-slate-400 font-bold uppercase mt-1">S/N: {item.serial_number || 'N/A'}</p>
        <div className="mt-2">
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-black uppercase">
            {item.category || 'Payload'}
          </span>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-col gap-1">
          <button onClick={() => onEdit(item)}
            className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-orange-600 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button onClick={() => onDelete(item.id)}
            className="size-11 rounded-xl bg-red-50 flex items-center justify-center text-slate-200 hover:text-red-500 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
