'use client';
import { useState, useEffect } from 'react';
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

export default function EditPilotPanel({ pilot, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...pilot });

  useEffect(() => {
    setForm({ ...pilot });
  }, [pilot]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        phone: form.phone,
        email: form.email,
        license_number: form.license_number,
        medical_expiry: form.medical_expiry || null,
        pilot_role: form.pilot_role,
        id_doc_url: form.id_doc_url,
        pilot_course_url: form.pilot_course_url,
        theoretical_exam_url: form.theoretical_exam_url,
        medical_cert_url: form.medical_cert_url,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pilots').update(updateData).eq('id', pilot.id);
      if (error) throw error;
      alert("✅ Expediente actualizado correctamente.");
      onSuccess();
    } catch (err) {
      alert("⚠️ Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[150] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-[450px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Editar Expediente</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleUpdate} className="space-y-6 pb-4">

          {/* 01. IDENTIDAD (BLOQUEADA) */}
          <div className="space-y-3 opacity-70">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">01. Identidad (No Editable)</p>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
              <input disabled className="w-full p-3 bg-slate-100 rounded-xl border-none font-bold text-sm text-slate-500 cursor-not-allowed mt-1" value={form.name} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Número de Identificación</label>
              <input disabled className="w-full p-3 bg-slate-100 rounded-xl border-none font-bold text-sm text-slate-500 cursor-not-allowed mt-1" value={form.id_number} />
            </div>
          </div>

          {/* 02. CONTACTO */}
          <div className="space-y-3">
            <p className="text-xs font-black text-orange-600 uppercase tracking-widest border-b pb-2">02. Información de Contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <input required className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Teléfono" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
              <input required type="email" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Correo" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>

          {/* 03. CREDENCIALES */}
          <div className="space-y-3">
            <p className="text-xs font-black text-orange-600 uppercase tracking-widest border-b pb-2">03. Credenciales Aerocivil</p>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Número CIPU</label>
              <input required className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-orange-600 uppercase text-sm mt-1" value={form.license_number || ''} onChange={e => setForm({...form, license_number: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Fecha Vence Médico</label>
              <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.medical_expiry || ''} onChange={e => setForm({...form, medical_expiry: e.target.value})} />
            </div>
            <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm text-orange-600 outline-none" value={form.pilot_role || 'Piloto'} onChange={e => setForm({...form, pilot_role: e.target.value})}>
              <option value="Piloto">Piloto Estándar</option>
              <option value="Jefe de Pilotos">Jefe de Pilotos</option>
              <option value="Gerente SMS">Gerente SMS</option>
              <option value="Gerente General">Gerente General</option>
            </select>
          </div>

          {/* 04. DOCUMENTOS */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Actualizar Documentos (PDF/JPG)</p>
            <FileUpload path="crew/docs" label="Cédula" onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
            <FileUpload path="crew/docs" label="Diploma Curso Piloto" onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
            <FileUpload path="crew/docs" label="Certificado Médico" onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
          </div>

          {/* 05. ADICIONES */}
          <div className="space-y-3">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">04. Adiciones Vigentes</p>
            <div className="bg-slate-50 p-3 rounded-2xl max-h-40 overflow-y-auto space-y-2 custom-scrollbar border border-slate-100">
              {AEROCIVIL_ADDITIONS.map(add => (
                <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                  <span className="text-xs font-bold text-slate-600">{add}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 06. EMERGENCIA */}
          <div className="space-y-3">
            <p className="text-xs font-black text-red-600 uppercase tracking-widest border-b pb-2">05. Contacto de Emergencia</p>
            <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Nombre Contacto" value={form.emergency_contact_name || ''} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
            <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Teléfono" value={form.emergency_contact_phone || ''} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60">
            {loading ? 'SINCRONIZANDO...' : 'ACTUALIZAR EXPEDIENTE'}
          </button>
        </form>
      </div>
    </aside>
  );
}
