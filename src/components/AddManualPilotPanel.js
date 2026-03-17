'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canAddResource } from '@/lib/planLimits';
import FileUpload from './FileUpload';

export default function AddManualPilotPanel({ onClose, onSuccess, currentPlan, currentCount }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', license_number: '', medical_expiry: '', pilot_role: 'piloto' });
  const [docs, setDocs] = useState({ license: '', medical: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!canAddResource(currentPlan, currentCount, 'pilot')) {
      alert(`⚠️ LÍMITE DE PLAN: Tu ${currentPlan} no permite más pilotos.`);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('pilots').insert([{
      ...formData,
      owner_id: user.id,
      certificate_url: docs.license,
      medical_url: docs.medical
    }]);

    if (!error) {
      alert("Piloto registrado exitosamente.");
      onSuccess();
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Registro Manual</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Nombre del Piloto" onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Licencia / DAN" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Vencimiento Médico</label>
            <input required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <FileUpload bucket="documents" path="pilot_licenses" label="Subir Licencia" onUploadSuccess={(url) => setDocs({...docs, license: url})} />
          <FileUpload bucket="documents" path="pilot_medical" label="Subir Certificado Médico" onUploadSuccess={(url) => setDocs({...docs, medical: url})} />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-widest">
          {loading ? 'Validando...' : 'Guardar Piloto'}
        </button>
      </form>
    </aside>
  );
}