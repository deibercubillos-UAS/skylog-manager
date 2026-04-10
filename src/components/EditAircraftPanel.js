'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...aircraft });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aircraft').update({
      brand: form.brand,
      model: form.model,
      serial_number: form.serial_number,
      ruas: form.ruas,
      image_url: form.image_url,
      total_hours: parseFloat(form.total_hours) // <--- ESTO ES VITAL
    }).eq('id', aircraft.id);

    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Ficha Técnica</h3>
      
      <form onSubmit={handleUpdate} className="space-y-5">
        <FileUpload 
          bucket="fleet" 
          path="drones" 
          label="Fotografía del Equipo" 
          onUploadSuccess={(url) => setForm({...form, image_url: url})} 
        />

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Modelo y RUAS</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.ruas} onChange={e => setForm({...form, ruas: e.target.value})} placeholder="Registro RUAS" />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ajustar Horas Totales</label>
          <div className="relative mt-1">
            <input 
              type="number" 
              step="0.1" 
              className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-lg text-orange-600 pr-12" 
              value={form.total_hours} 
              onChange={e => setForm({...form, total_hours: e.target.value})} 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">HRS</span>
          </div>
          <p className="text-[8px] text-slate-400 mt-1 uppercase ml-1">Modificación manual para corrección de bitácora</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Historial de Mantenimiento</p>
          <div className="space-y-3">
            <div>
              <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Fecha última intervención</label>
              <input 
                type="date" 
                className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold" 
                value={form.last_maintenance_date || ''} 
                onChange={e => setForm({...form, last_maintenance_date: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Horas en esa intervención</label>
              <input 
                type="number" 
                className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold" 
                value={form.last_maintenance_hours || 0} 
                onChange={e => setForm({...form, last_maintenance_hours: e.target.value})} 
              />
            </div>
          </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Sincronizando...' : 'Guardar Cambios'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cerrar</button>
      </form>
    </aside>
  );
}