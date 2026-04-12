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

  // Sincronizar datos si el piloto cambia
  useEffect(() => {
    setForm({ ...pilot });
  }, [pilot]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // DATOS PROTEGIDOS: No incluimos 'name' ni 'id_number' en el update
      const updateData = {
        phone: form.phone,
        email: form.email,
        license_number: form.license_number,
        medical_expiry: form.medical_expiry || null,
        pilot_role: form.pilot_role,
        // URLs de Documentos
        id_doc_url: form.id_doc_url,
        pilot_course_url: form.pilot_course_url,
        theoretical_exam_url: form.theoretical_exam_url,
        medical_cert_url: form.medical_cert_url,
        // Emergencia
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pilots')
        .update(updateData)
        .eq('id', pilot.id);

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
    <aside className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-[150] p-10 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Expediente</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-8 pb-10">
        
        {/* SECCIÓN 1: DATOS BÁSICOS (BLOQUEADOS) */}
        <div className="space-y-4 opacity-70">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">01. Identidad (No Editable)</p>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                <input disabled className="w-full p-4 bg-slate-100 rounded-2xl border-none font-bold text-sm text-slate-500 cursor-not-allowed" value={form.name} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número de Identificación</label>
                <input disabled className="w-full p-4 bg-slate-100 rounded-2xl border-none font-bold text-sm text-slate-500 cursor-not-allowed" value={form.id_number} />
            </div>
        </div>

        {/* SECCIÓN 2: CONTACTO (EDITABLE) */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">02. Información de Contacto</p>
            <div className="grid grid-cols-2 gap-4">
                <input required className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Teléfono" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
                <input required type="email" className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Correo" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
        </div>

        {/* SECCIÓN 3: CREDENCIALES AERONÁUTICAS */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">03. Credenciales Aerocivil</p>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número CIPU</label>
                <input required className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-orange-600 uppercase" value={form.license_number || ''} onChange={e => setForm({...form, license_number: e.target.value})} />
            </div>
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Vence Médico</label>
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.medical_expiry || ''} onChange={e => setForm({...form, medical_expiry: e.target.value})} />
            </div>
        </div>

        <div className="space-y-1 mt-4">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cargo / Responsabilidad</label>
          <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-orange-600 outline-none focus:ring-2 focus:ring-orange-500" 
              value={form.pilot_role || 'Piloto'} 
              onChange={e => setForm({...form, pilot_role: e.target.value})}
          >
              <option value="Piloto">Piloto Estándar</option>
              <option value="Jefe de Pilotos">Jefe de Pilotos</option>
              <option value="Gerente SMS">Gerente SMS</option>
              <option value="Gerente General">Gerente General</option>
          </select>
      </div>

        {/* SECCIÓN 4: GESTIÓN DOCUMENTAL */}
        <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actualizar Documentos (PDF/JPG)</p>
            <FileUpload path="crew/docs" label="Cédula" onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
            <FileUpload path="crew/docs" label="Diploma Curso Piloto" onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
            <FileUpload path="crew/docs" label="Certificado Médico" onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
        </div>

        {/* SECCIÓN 5: ADICIONES */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">04. Adiciones Vigentes</p>
            <div className="bg-slate-50 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 custom-scrollbar border border-slate-100">
                {AEROCIVIL_ADDITIONS.map(add => (
                    <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                        <span className="text-[10px] font-bold text-slate-600">{add}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* SECCIÓN 6: EMERGENCIA */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b pb-2">05. Contacto de Emergencia</p>
            <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Contacto" value={form.emergency_contact_name || ''} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Teléfono" value={form.emergency_contact_phone || ''} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
        </div>

        <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
          {loading ? 'SINCRONIZANDO...' : 'ACTUALIZAR EXPEDIENTE'}
        </button>
      </form>
    </aside>
  );
}