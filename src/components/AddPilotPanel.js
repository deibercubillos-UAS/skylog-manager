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
  const AEROCIVIL_ADDITIONS = [
    "PBMO SUPERIOR A 25 KG Y HASTA 250 KG", "DISPERSIÓN", "ASPERSIÓN", "ENJAMBRE", 
    "TRANSPORTE DE CARGA (DRONE DELIVERY)", "VUELO NOCTURNO", "BVLOS",
    "INSTRUCTOR DE VUELO UAS < 25 KG", "INSTRUCTOR DE VUELO UAS 25-250 KG",
    "INSTRUCTOR DE VUELO UAS EN ASPERSIÓN", "INSTRUCTOR DE VUELO UAS EN DISPERSIÓN",
    "INSTRUCTOR DE VUELO UAS EN ENJAMBRE", "INSTRUCTOR DE VUELO UAS EN CARGA",
    "INSTRUCTOR DE VUELO UAS EN NOCTURNAS", "INSTRUCTOR DE VUELO UAS EN BVLOS"
];

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

      <form onSubmit={handleSubmit} className="space-y-8">
    {/* SECCIÓN 1: IDENTIDAD */}
    <div className="space-y-4">
        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">01. Identidad del Tripulante</p>
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Nombre Completo" onChange={e => setForm({...form, name: e.target.value})} />
        <div className="grid grid-cols-2 gap-3">
            <input required className="p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Cédula / ID" onChange={e => setForm({...form, id_number: e.target.value})} />
            <input required className="p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Teléfono" onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <input required type="email" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Correo Electrónico" onChange={e => setForm({...form, email: e.target.value})} />
    </div>

    {/* SECCIÓN 2: AERONÁUTICA */}
    <div className="space-y-4">
        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">02. Credenciales Aerocivil</p>
        <input required className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-orange-600 uppercase" placeholder="Número CIPU" onChange={e => setForm({...form, license_number: e.target.value})} />
        <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Certificado Médico</label>
            <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" onChange={e => setForm({...form, medical_expiry: e.target.value})} />
        </div>
    </div>

    {/* SECCIÓN 3: DOCUMENTACIÓN ADJUNTA */}
    <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos de Control (PDF/JPG)</p>
        <FileUpload path="crew/docs" label="Cédula de Ciudadanía" onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
        <FileUpload path="crew/docs" label="Diploma Curso Piloto" onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
        <FileUpload path="crew/docs" label="Certificado Examen Teórico" onUploadSuccess={(url) => setForm({...form, theoretical_exam_url: url})} />
        <FileUpload path="crew/docs" label="Certificado Médico" onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
    </div>

    {/* SECCIÓN 4: ADICIONES (Lógica simplificada para creación) */}
    <div className="space-y-4">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">03. Adiciones Obtenidas</p>
        <div className="bg-slate-50 p-4 rounded-2xl max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {AEROCIVIL_ADDITIONS.map(add => (
                <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                    <input type="checkbox" className="rounded text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-600">{add}</span>
                </label>
            ))}
        </div>
    </div>

    {/* SECCIÓN 5: EMERGENCIA */}
    <div className="space-y-4">
        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b pb-2">04. Contacto de Emergencia</p>
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Nombre Contacto" onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Teléfono Emergencia" onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
    </div>

    <button type="submit" className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs">REGISTRAR TRIPULANTE</button>
</form>
    </aside>
  );
}