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
  const [mode, setMode] = useState('manual'); // 'manual' o 'invite'
  
  // ESTADO REGISTRO MANUAL COMPLETO
  const [form, setForm] = useState({ 
    name: '', id_number: '', phone: '', email: '',
    license_number: '', medical_expiry: '', 
    id_doc_url: '', pilot_course_url: '', theoretical_exam_url: '', medical_cert_url: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    pilot_role: 'Piloto'
  });

  // ESTADO INVITACIÓN
  const [inviteEmail, setInviteEmail] = useState('');

  const handleManualSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          // 1. Obtener datos de la organización e invitador para el correo
          const { data: prof } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single();
          const { data: org } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();

          const cleanData = {
              ...form,
              owner_id: user.id,
              organization_id: prof.organization_id,
              medical_expiry: form.medical_expiry === '' ? null : form.medical_expiry,
          };

          // 2. Crear el registro técnico en la tabla 'pilots'
          const { error: dbError } = await supabase.from('pilots').insert([cleanData]);
          if (dbError) throw dbError;

          // 3. DISPARAR INVITACIÓN AUTOMÁTICA (Backend Sync)
          await fetch('/api/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: form.email,
                  role: form.pilot_role,
                  orgName: org.company_name,
                  inviterName: prof.full_name,
                  orgCode: org.unique_code
              })
          });

          // 4. Registrar en la tabla de invitaciones para seguimiento
          await supabase.from('invitations').insert([{
              email: form.email,
              role: form.pilot_role,
              organization_id: prof.organization_id,
              invited_by: user.id,
              status: 'creado_manualmente'
          }]);

          alert(`✅ Tripulante registrado.\n🚀 Se ha enviado un correo de acceso a ${form.email}`);
          onSuccess();
      } catch (err) { 
          alert("⚠️ Error en el proceso: " + err.message); 
      } finally { 
          setLoading(false); 
      }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single();
      const { data: org } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: form.pilot_role,
          orgName: org.company_name,
          inviterName: prof.full_name,
          orgCode: org.unique_code
        })
      });

      if (res.ok) {
        await supabase.from('invitations').insert([{
          email: inviteEmail,
          role: form.pilot_role,
          organization_id: prof.organization_id,
          invited_by: user.id
        }]);
        alert("🚀 Invitación enviada exitosamente.");
        onSuccess();
      }
    } catch (e) { alert("Falla al enviar invitación"); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-[150] p-10 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nuevo Tripulante</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      {/* SELECTOR DE MODO */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10 shadow-inner">
          <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'manual' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500'}`}> Registro Manual </button>
          <button onClick={() => setMode('invite')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'invite' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500'}`}> Invitación Email </button>
      </div>

      {mode === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="space-y-8 pb-10 animate-in fade-in duration-300">
           {/* 01. IDENTIDAD */}
           <div className="space-y-4">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">01. Identidad</p>
              <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                  <input required className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="ID / Cédula" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} />
                  <input required className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <input required type="email" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Correo" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
           </div>

           {/* 02. AERONÁUTICA */}
           <div className="space-y-4">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">02. Credenciales</p>
              <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.pilot_role} onChange={e => setForm({...form, pilot_role: e.target.value})}>
                    <option value="Piloto">Piloto Estándar</option>
                    <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                    <option value="Gerente SMS">Gerente SMS</option>
                    <option value="Gerente General">Gerente General</option>
              </select>
              <input required className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-orange-600 uppercase" placeholder="Número CIPU" value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} />
              <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Vence Médico</label>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" value={form.medical_expiry} onChange={e => setForm({...form, medical_expiry: e.target.value})} />
              </div>
           </div>

           {/* 03. DOCUMENTOS */}
           <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentación Adjunta (PDF/JPG)</p>
              <FileUpload path="crew/docs" label="Cédula" onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
              <FileUpload path="crew/docs" label="Diploma Curso" onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
              <FileUpload path="crew/docs" label="Examen Médico" onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
           </div>

           {/* 04. ADICIONES */}
           <div className="space-y-4">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">03. Adiciones Aerocivil</p>
              <div className="bg-slate-50 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 custom-scrollbar border border-slate-100">
                  {AEROCIVIL_ADDITIONS.map(add => (
                      <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                          <span className="text-[10px] font-bold text-slate-600">{add}</span>
                      </label>
                  ))}
              </div>
           </div>

           {/* 05. EMERGENCIA */}
           <div className="space-y-4">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b pb-2">04. Contacto de Emergencia</p>
              <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Contacto" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm w-full" placeholder="Teléfono Emergencia" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
           </div>

           <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
             {loading ? 'SINCRONIZANDO...' : 'REGISTRAR TRIPULANTE'}
           </button>
        </form>
      ) : (
        <form onSubmit={handleSendInvite} className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white text-center space-y-6">
                <div className="size-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto text-orange-500 border border-white/10">
                    <span className="material-symbols-outlined text-4xl">mail</span>
                </div>
                <div className="space-y-2">
                    <h4 className="font-black uppercase text-sm">Invitación Corporativa</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed px-4">El tripulante recibirá un enlace de acceso vinculado a su organización.</p>
                </div>
                <div className="space-y-4 text-left">
                    <input required type="email" placeholder="correo@tripulante.com" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-orange-500" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                    <select className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-white" value={form.pilot_role} onChange={e => setForm({...form, pilot_role: e.target.value})}>
                        <option value="Piloto">Piloto Estándar</option>
                        <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                        <option value="Gerente SMS">Gerente SMS</option>
                    </select>
                </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
                {loading ? 'Enviando...' : 'Enviar Invitación Oficial'}
            </button>
        </form>
      )}
    </aside>
  );
}