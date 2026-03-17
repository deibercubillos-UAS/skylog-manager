'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function EditPilotPanel({ pilot, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  
  // Inicializamos el estado con validación manual para evitar el crash
  const [formData, setFormData] = useState({
    name: pilot?.name || '',
    license_number: pilot?.license_number || '',
    medical_expiry: pilot?.medical_expiry || '',
    pilot_role: pilot?.pilot_role || 'piloto'
  });

  const [docs, setDocs] = useState({
    license: pilot?.certificate_url || '',
    medical: pilot?.medical_url || ''
  });

  // Si por alguna razón el piloto cambia mientras el panel está abierto, actualizamos datos
  useEffect(() => {
    if (pilot) {
      setFormData({
        name: pilot.name || '',
        license_number: pilot.license_number || '',
        medical_expiry: pilot.medical_expiry || '',
        pilot_role: pilot.pilot_role || 'piloto'
      });
    }
  }, [pilot]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!pilot?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pilots')
        .update({
          name: formData.name,
          license_number: formData.license_number,
          medical_expiry: formData.medical_expiry,
          pilot_role: formData.pilot_role,
          certificate_url: docs.license,
          medical_url: docs.medical,
          updated_at: new Date().toISOString()
          // ELIMINAMOS OWNER_ID DE AQUÍ PARA QUE NO FALLE EL RLS
        })
        .eq('id', pilot.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        alert("✅ " + formData.name + " actualizado correctamente por nivel Administrativo.");
        onSuccess();
      } else {
        alert("⚠️ El servidor no procesó el cambio. Revisa el rol de tu cuenta.");
      }
    } catch (err) {
      alert("Error de permisos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter">Editar Tripulante</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre</label>
            <input required value={formData.name} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rol Operativo</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none" value={formData.pilot_role} onChange={e => setFormData({...formData, pilot_role: e.target.value})}>
              <option value="piloto">Piloto Estándar</option>
              <option value="jefe_pilotos">Jefe de Pilotos</option>
              <option value="gerente_sms">Gerente de SMS</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Licencia / DAN</label>
            <input required value={formData.license_number} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vence Médico</label>
            <input required type="date" value={formData.medical_expiry} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <FileUpload bucket="documents" path="pilot_licenses" label="Actualizar Licencia" onUploadSuccess={(url) => setDocs({...docs, license: url})} />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest mt-4">
          {loading ? 'Sincronizando...' : 'Guardar Cambios'}
        </button>
      </form>
    </aside>
  );
}