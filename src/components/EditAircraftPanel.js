'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  // Inicialización defensiva
  const [form, setForm] = useState({
    brand: aircraft?.brand || '',
    model: aircraft?.model || '',
    serial_number: aircraft?.serial_number || '',
    ruas: aircraft?.ruas || '',
    image_url: aircraft?.image_url || '',
    total_hours: aircraft?.total_hours || 0,
    last_maintenance_date: aircraft?.last_maintenance_date || '',
    last_maintenance_hours: aircraft?.last_maintenance_hours || 0
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
        total_hours: parseFloat(form.total_hours || 0),
        last_maintenance_date: form.last_maintenance_date || null,
        last_maintenance_hours: parseFloat(form.last_maintenance_hours || 0)
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
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Ficha Técnica</h3>
      <form onSubmit={handleUpdate} className="space-y-5">
        <FileUpload path="fleet/drones" label="Actualizar Foto" onUploadSuccess={(url) => setForm({...form, image_url: url})} />
        
        <div className="space-y-4">
            <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
            <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.ruas} onChange={e => setForm({...form, ruas: e.target.value})} placeholder="RUAS" />
            
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Total Time (T.T)</label>
              <input type="number" step="0.01" className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-lg text-orange-600" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Último Mantenimiento</p>
              <input type="date" className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold mb-2" value={form.last_maintenance_date} onChange={e => setForm({...form, last_maintenance_date: e.target.value})} />
              <input type="number" step="0.01" className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold" value={form.last_maintenance_hours} onChange={e => setForm({...form, last_maintenance_hours: e.target.value})} placeholder="Horas en servicio" />
            </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-4">
          {loading ? 'Sincronizando...' : 'GUARDAR CAMBIOS'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}