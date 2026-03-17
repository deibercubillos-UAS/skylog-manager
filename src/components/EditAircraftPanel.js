'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(aircraft?.image_url || '');
  
  // Estado del formulario con todos los campos técnicos
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

    try {
      const { error } = await supabase
        .from('aircraft')
        .update({
          ...formData,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', aircraft.id);

      if (error) throw error;

      alert("✅ Datos técnicos actualizados correctamente.");
      onSuccess();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Ficha Técnica</h3>
          <p className="text-[10px] text-[#ec5b13] font-bold uppercase tracking-widest">Editar Drone</p>
        </div>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500 transition-colors">close</button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6 pb-10">
        
        {/* FOTO DEL DRON */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imagen de Referencia</label>
          {imageUrl && (
            <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-100 mb-2 shadow-inner">
              <img src={imageUrl} alt="Drone" className="w-full h-full object-cover" />
            </div>
          )}
          <FileUpload bucket="documents" path="aircraft_photos" label={imageUrl ? "Cambiar Foto" : "Subir Foto"} onUploadSuccess={setImageUrl} />
        </div>

        {/* IDENTIFICACIÓN BÁSICA */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Marca / Modelo</label>
            <input required value={formData.model} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20" onChange={e => setFormData({...formData, model: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número de Serie (S/N)</label>
            <input required value={formData.serial_number} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-mono outline-none" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">MTOW - Peso Máx. Despegue (Kg)</label>
            <input type="number" step="0.01" value={formData.mtow} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none" onChange={e => setFormData({...formData, mtow: e.target.value})} />
          </div>
        </div>

        {/* PLAN DE MANTENIMIENTO */}
        <div className="bg-orange-50 p-5 rounded-[1.5rem] border border-orange-100 space-y-4 shadow-sm">
          <h4 className="text-[10px] font-black text-[#ec5b13] uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">build_circle</span> Programación Técnica
          </h4>
          
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-orange-400 uppercase ml-1">Cada cuántas horas requiere servicio</label>
            <input type="number" value={formData.maintenance_interval_hours} className="w-full bg-white border-none rounded-xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-orange-200" onChange={e => setFormData({...formData, maintenance_interval_hours: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-orange-400 uppercase ml-1">Fecha de próxima inspección anual</label>
            <input type="date" value={formData.next_maintenance_date} className="w-full bg-white border-none rounded-xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-orange-200" onChange={e => setFormData({...formData, next_maintenance_date: e.target.value})} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
          {loading ? 'Sincronizando...' : 'Guardar Ficha Técnica'}
        </button>
      </form>
    </aside>
  );
}