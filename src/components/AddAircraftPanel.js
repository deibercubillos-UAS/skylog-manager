'use client';

export default function AddAircraftPanel({ onClose }) {
  return (
    <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 right-0 z-50 shadow-2xl animate-in slide-in-from-right">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-bold">Nueva Aeronave</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex px-6 pt-4 border-b border-slate-100 dark:border-slate-800 gap-6">
        <button className="pb-3 text-sm font-bold text-primary border-b-2 border-primary">General</button>
        <button className="pb-3 text-sm font-medium text-slate-400 hover:text-slate-600">Técnico</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Marca / Modelo</label>
            <input className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2" placeholder="Ej: Autel Evo II RTK" type="text"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">S/N</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2" placeholder="Serial" type="text"/>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">MTOW (kg)</label>
              <input className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2" placeholder="0.0" type="number"/>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carga de Documentación</h4>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer">
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary mb-2 text-4xl">cloud_upload</span>
            <p className="text-xs font-medium text-slate-500">Arrastra aquí el registro DAN</p>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
        <button onClick={onClose} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-bold">Cancelar</button>
        <button className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20">Guardar</button>
      </div>
    </aside>
  );
}