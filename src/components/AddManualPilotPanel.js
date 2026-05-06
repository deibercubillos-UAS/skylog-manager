'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canAddResource } from '@/lib/planLimits';
import FileUpload from './FileUpload';
import { toast } from '@/lib/toast';

export default function AddManualPilotPanel({ onClose, onSuccess, currentPlan, currentCount }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', license_number: '', medical_expiry: '', pilot_role: 'piloto' });
  const [docs, setDocs] = useState({ license: '', medical: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!canAddResource(currentPlan, currentCount, 'pilot')) {
      toast.warn(`Límite de plan: tu plan ${currentPlan} no permite más pilotos.`);
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
      toast.success("Piloto registrado exitosamente.");
      onSuccess();
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <aside className="fixed z-50 bg-white flex flex-col text-left
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
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Registro Manual</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold" placeholder="Nombre del Piloto" onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold" placeholder="Licencia / DAN" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1 ml-1">Vencimiento Médico</label>
            <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <FileUpload bucket="documents" path="pilot_licenses" label="Subir Licencia" onUploadSuccess={(url) => setDocs({...docs, license: url})} />
            <FileUpload bucket="documents" path="pilot_medical" label="Subir Certificado Médico" onUploadSuccess={(url) => setDocs({...docs, medical: url})} />
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest disabled:opacity-60 active:scale-95 transition-all">
            {loading ? 'Validando...' : 'Guardar Piloto'}
          </button>
        </form>
      </div>
    </aside>
  );
}
