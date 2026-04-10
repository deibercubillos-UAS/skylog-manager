'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    brand: '', model: '', serial_number: '', ruas: '', 
    image_url: '', total_hours: 0, 
    last_maintenance_date: '', last_maintenance_hours: 0 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      const { error } = await supabase.from('aircraft').insert([{ 
        ...form, 
        owner_id: user.id,
        organization_id: prof.organization_id,
        status: 'Operativo',
        total_hours: parseFloat(form.total_hours || 0),
        last_maintenance_hours: parseFloat(form.last_maintenance_hours || 0)
      }]);

      if (error) throw error;
      alert("✅ Aeronave inscrita correctamente.");
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Inscribir Aeronave</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FileUpload path="fleet/drones" label="Fotografía de Identificación" onUploadSuccess={(url) => setForm({...form, image_url: url})} />
        
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Datos del Fabricante</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Marca (Ej: DJI)" onChange={e => setForm({...form, brand: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" placeholder="Modelo (Ej: Mavic 3 Enterprise)" onChange={e => setForm({...form, model: e.target.value})} />
          <input required className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-mono text-sm mt-2 uppercase" placeholder="Número de Serie (S/N)" onChange={e => setForm({...form, serial_number: e.target.value})} />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Identificación y Uso</label>
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Registro RUAS" onChange={e => setForm({...form, ruas: e.target.value})} />
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase text-orange-600 ml-1">Horas Totales (T.T) a la fecha</label>
            <input type="number" step="0.01" className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-lg" placeholder="0.00" onChange={e => setForm({...form, total_hours: e.target.value})} />
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Historial Técnico Inicial</p>
          <div className="space-y-3">
            <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Fecha último servicio</label>
                <input type="date" className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold" onChange={e => setForm({...form, last_maintenance_date: e.target.value})} />
            </div>
            <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Horas en ese servicio</label>
                <input type="number" step="0.01" className="w-full p-2 bg-white rounded-lg border-none text-xs font-bold" placeholder="0.00" onChange={e => setForm({...form, last_maintenance_hours: e.target.value})} />
            </div>
          </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-4">
          {loading ? 'Sincronizando...' : 'FINALIZAR INSCRIPCIÓN'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}