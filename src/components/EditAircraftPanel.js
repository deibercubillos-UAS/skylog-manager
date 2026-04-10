'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand: aircraft?.brand || '',
    model: aircraft?.model || '',
    serial_number: aircraft?.serial_number || '',
    ruas: aircraft?.ruas || '',
    image_url: aircraft?.image_url || '',
    total_hours: aircraft?.total_hours || 0
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('aircraft').update({
        brand: form.brand,
        model: form.model,
        serial_number: form.serial_number,
        ruas: form.ruas,
        image_url: form.image_url,
        total_hours: parseFloat(form.total_hours || 0)
      }).eq('id', aircraft.id);

      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Ficha de Aeronave</h3>
      <form onSubmit={handleUpdate} className="space-y-5">
        <FileUpload path="fleet/drones" label="Cambiar Foto" onUploadSuccess={(url) => setForm({...form, image_url: url})} />
        
        <div className="space-y-4">
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Identidad</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.ruas} onChange={e => setForm({...form, ruas: e.target.value})} placeholder="Registro RUAS" />
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-2 uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Control de Horas (T.T)</label>
              <input type="number" step="0.01" className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-xl text-orange-600" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} />
              <p className="text-[8px] text-slate-400 mt-1 uppercase ml-1">Ajuste manual de tiempo acumulado</p>
            </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Actualizando...' : 'GUARDAR CAMBIOS'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cerrar</button>
      </form>
    </aside>
  );
}