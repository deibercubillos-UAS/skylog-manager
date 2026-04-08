'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', ruas: '', image_url: '' });

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
        total_hours: 0
      }]);

      if (error) throw error;
      alert("✅ Aeronave registrada con éxito.");
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Nueva Aeronave</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FileUpload path="fleet/drones" label="Foto del Equipo" onUploadSuccess={(url) => setForm({...form, image_url: url})} />
        
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Marca / Modelo</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Ej: DJI" onChange={e => setForm({...form, brand: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" placeholder="Ej: Mavic 3E" onChange={e => setForm({...form, model: e.target.value})} />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">S/N y RUAS</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-1 uppercase" placeholder="Número de Serie" onChange={e => setForm({...form, serial_number: e.target.value})} />
          <input className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-bold text-sm mt-2 text-orange-600" placeholder="Registro RUAS (Opcional)" onChange={e => setForm({...form, ruas: e.target.value})} />
        </div>

        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'REGISTRANDO...' : 'FINALIZAR REGISTRO'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}