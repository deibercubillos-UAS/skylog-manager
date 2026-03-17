'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload'; // Importamos el componente reutilizable

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    medical_expiry: '',
    pilot_role: 'PIC - Piloto al Mando'
  });

  // Estados para las URLs de los documentos
  const [licenseUrl, setLicenseUrl] = useState('');
  const [medicalUrl, setMedicalUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    // Insertar piloto con los enlaces a sus documentos
    const { error } = await supabase
      .from('pilots')
      .insert([{ 
        ...formData, 
        owner_id: user.id,
        certificate_url: licenseUrl, // Enlace a la licencia
        medical_url: medicalUrl      // Enlace al examen médico
      }]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter">Nuevo Piloto</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-400 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Nombre Completo" onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Número de Licencia / DAN" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Vencimiento Médico</label>
            <input required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
          </div>
        </div>

        {/* SECCIÓN DE CARGA DE DOCUMENTOS */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <FileUpload 
            bucket="documents" 
            path="pilot_licenses" 
            label="Licencia de Piloto (PDF/JPG)"
            onUploadSuccess={(url) => setLicenseUrl(url)} 
          />
          
          <FileUpload 
            bucket="documents" 
            path="pilot_medical" 
            label="Certificado Médico Vigente"
            onUploadSuccess={(url) => setMedicalUrl(url)} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-widest mt-4"
        >
          {loading ? 'Sincronizando...' : 'Registrar Piloto'}
        </button>
      </form>
    </aside>
  );
}