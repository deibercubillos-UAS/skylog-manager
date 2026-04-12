'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

const AEROCIVIL_ADDITIONS = [
    "PBMO SUPERIOR A 25 KG Y HASTA 250 KG", "DISPERSIÓN", "ASPERSIÓN", "ENJAMBRE", 
    "TRANSPORTE DE CARGA (DRONE DELIVERY)", "VUELO NOCTURNO", "BVLOS",
    "INSTRUCTOR DE VUELO UAS < 25 KG", "INSTRUCTOR DE VUELO UAS 25-250 KG",
    "INSTRUCTOR DE VUELO UAS EN ASPERSIÓN", "INSTRUCTOR DE VUELO UAS EN DISPERSIÓN",
    "INSTRUCTOR DE VUELO UAS EN ENJAMBRE", "INSTRUCTOR DE VUELO UAS EN CARGA",
    "INSTRUCTOR DE VUELO UAS EN NOCTURNAS", "INSTRUCTOR DE VUELO UAS EN BVLOS"
];

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    name: '', id_number: '', phone: '', email: '',
    license_number: '', medical_expiry: '', 
    id_doc_url: '', pilot_course_url: '', theoretical_exam_url: '', medical_cert_url: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    pilot_role: 'Piloto'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      // LIMPIEZA DE FECHAS: Si el string está vacío, enviamos NULL para no romper PostgreSQL
      const cleanData = {
        ...form,
        owner_id: user.id,
        organization_id: prof.organization_id,
        medical_expiry: form.medical_expiry === '' ? null : form.medical_expiry,
      };

      const { error } = await supabase.from('pilots').insert([cleanData]);

      if (error) throw error;
      alert("✅ Tripulante registrado en el sistema.");
      onSuccess();
    } catch (err) {
      alert("⚠️ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-[150] p-10 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Nuevo Expediente</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
        {/* IDENTIDAD */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">01. Identidad</p>
            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
                <input required className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="ID / Cédula" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} />
                <input required className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <input required type="email" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Correo" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>

        {/* AERONAUTICA */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">02. Credenciales</p>
            <input required className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-orange-600 uppercase" placeholder="Número CIPU" value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} />
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Certificado Médico</label>
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.medical_expiry} onChange={e => setForm({...form, medical_expiry: e.target.value})} />
            </div>
        </div>

        {/* DOCUMENTOS */}
        <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentación Adjunta (PDF/JPG)</p>
            <FileUpload path="crew/docs" label="Cédula de Ciudadanía" onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
            <FileUpload path="crew/docs" label="Diploma Curso Piloto" onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
            <FileUpload path="crew/docs" label="Certificado Examen Teórico" onUploadSuccess={(url) => setForm({...form, theoretical_exam_url: url})} />
            <FileUpload path="crew/docs" label="Certificado Médico" onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
        </div>

        {/* ADICIONES */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">03. Adiciones Aerocivil</p>
            <div className="bg-slate-50 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                {AEROCIVIL_ADDITIONS.map(add => (
                    <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                        <span className="text-[10px] font-bold text-slate-600">{add}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* EMERGENCIA */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b pb-2">04. Contacto de Emergencia</p>
            <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Completo" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
            <input className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm w-full" placeholder="Teléfono" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
        </div>

        <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
          {loading ? 'SINCRONIZANDO...' : 'REGISTRAR TRIPULANTE'}
        </button>
      </form>
    </aside>
  );
}