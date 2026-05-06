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
    <aside className="fixed z-[200] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Ficha de Aeronave</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form id="edit-aircraft-form" onSubmit={handleUpdate} className="space-y-5">
          <FileUpload path="fleet/drones" label="Cambiar Foto" onUploadSuccess={(url) => setForm({...form, image_url: url})} />

          <div className="space-y-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-400">Identidad</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.ruas} onChange={e => setForm({...form, ruas: e.target.value})} placeholder="Registro RUAS" />
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-2 uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">Control de Horas (T.T)</label>
              <input type="number" step="0.01" className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-xl text-orange-600 mt-1" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} />
              <p className="text-xs text-slate-400 mt-1 uppercase ml-1">Ajuste manual de tiempo acumulado</p>
            </div>
          </div>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <button form="edit-aircraft-form" type="submit" disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg disabled:opacity-60 active:scale-95 transition-all">
          {loading ? 'Actualizando...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>
    </aside>
  );
}
