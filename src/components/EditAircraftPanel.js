'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    model: aircraft?.model || '',
    serial_number: aircraft?.serial_number || '',
    mtow: aircraft?.mtow || 0,
    maintenance_interval_hours: aircraft?.maintenance_interval_hours || 50,
    next_maintenance_date: aircraft?.next_maintenance_date || '',
    status: aircraft?.status || 'Operativo'
  });
  const [imageUrl, setImageUrl] = useState(aircraft?.image_url || '');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('aircraft')
      .update({
        ...formData,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', aircraft.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Aeronave actualizada correctamente.");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Editar Aeronave</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Imagen del Dron */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imagen de la Unidad</label>
          {imageUrl && (
            <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-100 mb-2">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <FileUpload bucket="documents" path="aircraft_photos" label={imageUrl ? "Cambiar Imagen" : "Subir Foto del Dron"} onUploadSuccess={(url) => setImageUrl(url)} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <input required value={formData.model} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold" placeholder="Modelo" onChange={e => setFormData({...formData, model: e.target.value})} />
            <input required value={formData.serial_number} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-mono" placeholder="S/N" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
          </div>

          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-4">
            <h4 className="text-[10px] font-black text-[#ec5b13] uppercase tracking-widest">Programación de Mantenimiento</h4>
            <div>
              <label className="text-[9px] font-bold text-orange-400 uppercase">Intervalo (Horas de vuelo)</label>
              <input type="number" value={formData.maintenance_interval_hours} className="w-full bg-white border-none rounded-xl p-2 text-sm font-black mt-1" onChange={e => setFormData({...formData, maintenance_interval_hours: e.target.value})} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-orange-400 uppercase">Próxima Fecha de Inspección</label>
              <input type="date" value={formData.next_maintenance_date} className="w-full bg-white border-none rounded-xl p-2 text-sm font-black mt-1" onChange={e => setFormData({...formData, next_maintenance_date: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">MTOW (kg)</label>
            <input type="number" step="0.01" value={formData.mtow} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold mt-1" onChange={e => setFormData({...formData, mtow: e.target.value})} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest mt-4 hover:scale-[1.02] transition-all">
          {loading ? 'Sincronizando...' : 'Guardar Cambios Técnicos'}
        </button>
      </form>
    </aside>
  );
}