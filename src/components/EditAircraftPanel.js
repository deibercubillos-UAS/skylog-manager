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
      total_hours: form.total_hours
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
          <label className="text-[10px] font-black uppercase text-slate-400">Número de Serie</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-1 uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
        </div>

        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Sincronizando...' : 'Guardar Cambios'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cerrar</button>
      </form>
    </aside>
  );
}