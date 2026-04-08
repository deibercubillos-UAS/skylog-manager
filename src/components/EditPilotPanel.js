'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditPilotPanel({ pilot, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...pilot });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('pilots').update({
      name: form.name,
      license_number: form.license_number,
      medical_expiry: form.medical_expiry,
      pilot_role: form.pilot_role,
      certificate_url: form.certificate_url
    }).eq('id', pilot.id);

    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Editar Tripulante</h3>
      <form onSubmit={handleUpdate} className="space-y-5">
        <FileUpload path="crew/licenses" label="Actualizar Licencia (PDF/JPG)" onUploadSuccess={(url) => setForm({...form, certificate_url: url})} />
        
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Información General</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nombre Completo" />
          <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.pilot_role} onChange={e => setForm({...form, pilot_role: e.target.value})}>
            <option value="Piloto">Piloto</option>
            <option value="Jefe de Pilotos">Jefe de Pilotos</option>
            <option value="Instructor">Instructor</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Licencia y Médico</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} placeholder="Número CIPU" />
          <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.medical_expiry} onChange={e => setForm({...form, medical_expiry: e.target.value})} />
        </div>

        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Sincronizando...' : 'Actualizar Piloto'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}