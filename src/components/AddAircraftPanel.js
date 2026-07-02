'use client';
import { useState } from 'react';
import FleetImageUpload from './FleetImageUpload';
import { toast } from '@/lib/toast';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand: '', model: '', serial_number: '', ruas: '', mtow: '',
    image_url: '', total_hours: 0,
    last_maintenance_date: '', last_maintenance_hours: 0,
    maintenance_interval_hours: 200, maintenance_interval_days: 180,
    operational_status: 'disponible',
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
            brand:                      form.brand,
            model:                      form.model,
            serial_number:              form.serial_number,
            ruas:                       form.ruas,
            mtow:                       form.mtow === '' ? null : parseFloat(form.mtow),
            image_url:                  form.image_url,
            total_hours:                parseFloat(form.total_hours || 0),
            last_maintenance_hours:     parseFloat(form.last_maintenance_hours || 0),
            last_maintenance_date:      form.last_maintenance_date === '' ? null : form.last_maintenance_date,
            maintenance_interval_hours: parseInt(form.maintenance_interval_hours || 0, 10),
            maintenance_interval_days:  parseInt(form.maintenance_interval_days || 0, 10),
            operational_status:         form.operational_status,
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

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Flota</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">Nueva aeronave</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        {/* Hero */}
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Flota &amp; Equipo</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">Registrar aeronave</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Queda disponible de inmediato para programar misiones</p>
        </div>

        <form id="add-aircraft-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Columna izquierda: identidad */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Identidad</p>
              <FleetImageUpload onUploadSuccess={(url) => setForm({ ...form, image_url: url })} />
              <div className="space-y-1">
                <label className={labelCls}>Modelo <span className="text-orange-600">*</span></label>
                <input required className={inputCls} placeholder="Ej. Matrice 350 RTK" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Fabricante</label>
                <input className={inputCls} placeholder="DJI" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>N.º de serie (fabricante) <span className="text-orange-600">*</span></label>
                <input required className={inputCls + ' font-mono uppercase'} placeholder="Ej. SN-M350-0144" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
              </div>
            </div>

            {/* Columna derecha: matrícula y equipo */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Matrícula y equipo</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Matrícula RUAS / AeroCivil</label>
                  <input className={inputCls} placeholder="Ej. EXA-1234" value={form.ruas} onChange={e => setForm({ ...form, ruas: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Peso máx. despegue (MTOW)</label>
                  <input type="number" step="0.1" className={inputCls} placeholder="Ej. 9.2 kg" value={form.mtow} onChange={e => setForm({ ...form, mtow: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Horas al momento de inscripción</label>
                  <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={form.total_hours} onChange={e => setForm({ ...form, total_hours: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Última fecha de mantenimiento</label>
                  <input type="date" className={inputCls} value={form.last_maintenance_date} onChange={e => setForm({ ...form, last_maintenance_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Horas en ese último servicio</label>
                <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={form.last_maintenance_hours} onChange={e => setForm({ ...form, last_maintenance_hours: e.target.value })} />
              </div>

              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100 mt-2">Periodicidad de mantenimiento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Cada (horas de vuelo)</label>
                  <input type="number" className={inputCls} value={form.maintenance_interval_hours} onChange={e => setForm({ ...form, maintenance_interval_hours: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Cada (días)</label>
                  <input type="number" className={inputCls} value={form.maintenance_interval_days} onChange={e => setForm({ ...form, maintenance_interval_days: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-2.5">
                <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                <span className="text-[10px] font-semibold text-orange-800 leading-snug">Bitafly alertará automáticamente cuando se cumpla cualquiera de los dos límites — lo que ocurra primero.</span>
              </div>
            </div>
          </div>

          {/* Estado inicial */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
            <div className="flex items-center gap-5">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Estado inicial</span>
              <button type="button" onClick={() => setForm({ ...form, operational_status: 'disponible' })} className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${form.operational_status === 'disponible' ? 'text-orange-600' : 'text-slate-300'}`}>
                  {form.operational_status === 'disponible' ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <span className="text-xs font-bold text-slate-800">Operativo</span>
              </button>
              <button type="button" onClick={() => setForm({ ...form, operational_status: 'en_mantenimiento' })} className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${form.operational_status === 'en_mantenimiento' ? 'text-orange-600' : 'text-slate-300'}`}>
                  {form.operational_status === 'en_mantenimiento' ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <span className="text-xs font-bold text-slate-800">En mantenimiento</span>
              </button>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Podrás cambiar el estado en cualquier momento desde Flota</span>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Modelo y N.º de serie son los únicos campos obligatorios — el resto puedes completarlo después
          </p>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button form="add-aircraft-form" type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">add_circle</span>
          {loading ? 'Sincronizando...' : 'Registrar aeronave'}
        </button>
      </div>
    </aside>
  );
}
