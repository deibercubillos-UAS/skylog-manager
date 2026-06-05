'use client';
import { useState } from 'react';
import FileUpload from './FileUpload';
import { toast } from '@/lib/toast';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand: '', model: '', serial_number: '', ruas: '',
    image_url: '', total_hours: 0,
    last_maintenance_date: '', last_maintenance_hours: 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Rutar por /api/fleet para que el servidor verifique límites del plan
      const res = await fetch('/api/fleet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aircraftData: {
            brand:                  form.brand,
            model:                  form.model,
            serial_number:          form.serial_number,
            ruas:                   form.ruas,
            image_url:              form.image_url,
            total_hours:            parseFloat(form.total_hours || 0),
            last_maintenance_hours: parseFloat(form.last_maintenance_hours || 0),
            last_maintenance_date:  form.last_maintenance_date === '' ? null : form.last_maintenance_date,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar la aeronave.');
      toast.success('Aeronave inscrita correctamente.');
      onSuccess();
    } catch (err) {
      toast.error('Error de registro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[150] bg-white flex flex-col text-left
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
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Inscribir Aeronave</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form id="add-aircraft-form" onSubmit={handleSubmit} className="space-y-5">
          <FileUpload path="fleet/drones" label="Fotografía de Identificación"
            onUploadSuccess={(url) => setForm({ ...form, image_url: url })} />

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400">Datos del Fabricante</label>
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
              placeholder="Marca (Ej: DJI)" onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
              placeholder="Modelo (Ej: Mavic 3 Enterprise)" onChange={e => setForm({ ...form, model: e.target.value })} />
            <input required className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-mono text-sm uppercase"
              placeholder="Número de Serie (S/N)" onChange={e => setForm({ ...form, serial_number: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400">Identificación y Uso</label>
            <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
              placeholder="Registro RUAS" onChange={e => setForm({ ...form, ruas: e.target.value })} />
            <div>
              <label className="text-xs font-black uppercase text-orange-600 ml-1">Horas Totales (T.T)</label>
              <input type="number" step="0.01"
                className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-lg mt-1"
                placeholder="0.00" onChange={e => setForm({ ...form, total_hours: e.target.value })} />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase">Historial Técnico Inicial</p>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Fecha último servicio</label>
              <input type="date" className="w-full p-3 bg-white rounded-xl border-none text-sm font-bold mt-1"
                onChange={e => setForm({ ...form, last_maintenance_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Horas en ese servicio</label>
              <input type="number" step="0.01" className="w-full p-3 bg-white rounded-xl border-none text-sm font-bold mt-1"
                placeholder="0.00" onChange={e => setForm({ ...form, last_maintenance_hours: e.target.value })} />
            </div>
          </div>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <button form="add-aircraft-form" type="submit" disabled={loading}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl uppercase text-xs shadow-lg transition-all active:scale-95 disabled:opacity-60">
          {loading ? 'Sincronizando...' : 'FINALIZAR INSCRIPCIÓN'}
        </button>
      </div>
    </aside>
  );
}
