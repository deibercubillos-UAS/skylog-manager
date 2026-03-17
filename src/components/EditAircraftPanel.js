'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(aircraft?.image_url || '');
  const [formData, setFormData] = useState({
    model: aircraft?.model || '',
    serial_number: aircraft?.serial_number || '',
    mtow: aircraft?.mtow || 0,
    maintenance_interval_hours: aircraft?.maintenance_interval_hours || 50,
    next_maintenance_date: aircraft?.next_maintenance_date || '',
    status: aircraft?.status || 'Operativo'
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aircraft').update({ ...formData, image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', aircraft.id);
    if (!error) { alert("✅ Drone actualizado."); onSuccess(); }
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter">Editar Aeronave</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300">close</button>
      </div>
      <form onSubmit={handleUpdate} className="space-y-6">
        <FileUpload bucket="documents" path="aircraft_photos" label="Imagen del Drone" onUploadSuccess={setImageUrl} />
        <input required value={formData.model} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Modelo" onChange={e => setFormData({...formData, model: e.target.value})} />
        <input required value={formData.serial_number} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-mono" placeholder="S/N" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">{loading ? 'Procesando...' : 'Guardar Cambios'}</button>
      </form>
    </aside>
  );
}
