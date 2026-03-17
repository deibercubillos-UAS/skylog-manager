'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditPilotPanel({ pilot, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: pilot.name,
    license_number: pilot.license_number,
    medical_expiry: pilot.medical_expiry,
    pilot_role: pilot.pilot_role || 'piloto'
  });
  const [docs, setDocs] = useState({
    license: pilot.certificate_url,
    medical: pilot.medical_url
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('pilots')
      .update({
        ...formData,
        certificate_url: docs.license,
        medical_url: docs.medical,
        updated_at: new Date()
      })
      .eq('id', pilot.id);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      alert("Registro de piloto actualizado correctamente.");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Editar Piloto</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</label>
            <input required value={formData.name} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rol en la Organización</label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none appearance-none"
              value={formData.pilot_role}
              onChange={e => setFormData({...formData, pilot_role: e.target.value})}
            >
              <option value="piloto">Piloto Estándar</option>
              <option value="jefe_pilotos">Jefe de Pilotos</option>
              <option value="gerente_sms">Gerente de SMS</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Licencia / DAN</label>
            <input required value={formData.license_number} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vencimiento Médico</label>
            <input required type="date" value={formData.medical_expiry} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <FileUpload bucket="documents" path="pilot_licenses" label="Actualizar Licencia" onUploadSuccess={(url) => setDocs({...docs, license: url})} />
          <FileUpload bucket="documents" path="pilot_medical" label="Actualizar Certificado Médico" onUploadSuccess={(url) => setDocs({...docs, medical: url})} />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-widest transition-all">
          {loading ? 'Guardando...' : 'Actualizar Datos'}
        </button>
      </form>
    </aside>
  );
}