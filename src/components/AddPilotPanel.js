'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';
import { toast } from '@/lib/toast';
import { getOrgContext } from '@/lib/apiAuth';

const AEROCIVIL_ADDITIONS = [
    "PBMO SUPERIOR A 25 KG Y HASTA 250 KG", "DISPERSIÓN", "ASPERSIÓN", "ENJAMBRE",
    "TRANSPORTE DE CARGA (DRONE DELIVERY)", "VUELO NOCTURNO", "BVLOS",
    "INSTRUCTOR DE VUELO UAS < 25 KG", "INSTRUCTOR DE VUELO UAS 25-250 KG",
    "INSTRUCTOR DE VUELO UAS EN ASPERSIÓN", "INSTRUCTOR DE VUELO UAS EN DISPERSIÓN",
    "INSTRUCTOR DE VUELO UAS EN ENJAMBRE", "INSTRUCTOR DE VUELO UAS EN CARGA",
    "INSTRUCTOR DE VUELO UAS EN NOCTURNAS", "INSTRUCTOR DE VUELO UAS EN BVLOS"
];

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('manual');
  const [aerocivilChecked, setAerocivilChecked] = useState([]);

  const [form, setForm] = useState({
    name: '', id_number: '', phone: '', email: '',
    license_number: '', medical_expiry: '',
    id_doc_url: '', pilot_course_url: '', theoretical_exam_url: '', medical_cert_url: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    pilot_role: 'Piloto', is_active: true,
  });

  const [inviteEmail, setInviteEmail] = useState('');

  const toggleAerocivil = (addition) => {
    setAerocivilChecked(prev =>
      prev.includes(addition) ? prev.filter(a => a !== addition) : [...prev, addition]
    );
  };

  const handleManualSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      let insertedPilotId = null;
      try {
          const ctx = await getOrgContext(supabase);
          const user = ctx.user;
          const prof = { organization_id: ctx.orgId, full_name: ctx.fullName };
          const { data: org } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();

          const cleanData = {
              ...form,
              owner_id: user.id,
              organization_id: prof.organization_id,
              medical_expiry: form.medical_expiry === '' ? null : form.medical_expiry,
              aerocivil_additions: aerocivilChecked,
              invitation_status: 'pending',
          };

          // 1. Insertar piloto y guardar su ID para poder hacer rollback
          const { data: pilotData, error: dbError } = await supabase
              .from('pilots').insert([cleanData]).select('id').single();
          if (dbError) throw dbError;
          insertedPilotId = pilotData.id;

          // 2. Enviar invitación (crea la fila real en `invitations` con
          // token/pilot_id/status='pending' server-side — ver /api/invite)
          // — si falla, hacer rollback del piloto.
          const inviteRes = await fetch('/api/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: form.email,
                  role: form.pilot_role,
                  orgName: org.company_name,
                  inviterName: prof.full_name,
                  orgCode: org.unique_code,
                  pilotId: insertedPilotId,
                  pilotName: form.name,
              })
          });

          if (!inviteRes.ok) {
              // Rollback: eliminar el piloto recién insertado
              await supabase.from('pilots').delete().eq('id', insertedPilotId);
              const errBody = await inviteRes.json().catch(() => ({}));
              throw new Error(errBody.error || 'No se pudo enviar la invitación');
          }

          toast.success(`Tripulante registrado. Correo de acceso enviado a ${form.email}`);
          onSuccess();
      } catch (err) {
          toast.error("Error en el proceso: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const ctx = await getOrgContext(supabase);
      const prof = { organization_id: ctx.orgId, full_name: ctx.fullName };
      const { data: org } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();

      // /api/invite crea la fila real en `invitations` server-side (token/status
      // 'pending') — sin pilotId: no hay una fila `pilots` propia todavía, se crea
      // al aceptar (ver POST /api/invitations/accept).
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
        toast.success("Invitación enviada exitosamente.");
        onSuccess();
      } else {
        const errBody = await res.json().catch(() => ({}));
        toast.error(errBody.error || 'No se pudo enviar la invitación');
      }
    } catch (e) { toast.error("Falla al enviar invitación"); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Tripulación</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">Nuevo piloto</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        {/* Hero */}
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Flota &amp; Equipo</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">Registrar piloto</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Datos personales, licencia RPAS y certificaciones</p>
        </div>

        {/* SELECTOR DE MODO */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setMode('manual')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${mode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Registro completo</button>
          <button onClick={() => setMode('invite')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${mode === 'invite' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Solo invitación</button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Columna izquierda: identidad */}
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Identidad</p>
                <div className="space-y-1">
                  <label className={labelCls}>Nombre completo <span className="text-orange-600">*</span></label>
                  <input required className={inputCls} placeholder="Ej. Andrea Salazar" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Documento de identidad <span className="text-orange-600">*</span></label>
                  <input required className={inputCls} placeholder="Ej. 1.020.XXX.XXX" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Correo electrónico <span className="text-orange-600">*</span></label>
                  <input required type="email" className={inputCls} placeholder="nombre@dominio.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Teléfono de contacto <span className="text-orange-600">*</span></label>
                  <input required className={inputCls} placeholder="+57 300 000 0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Rol en la operación</label>
                  <select className={inputCls} value={form.pilot_role} onChange={e => setForm({ ...form, pilot_role: e.target.value })}>
                    <option value="Piloto">Piloto</option>
                    <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                    <option value="Gerente SMS">Gerente SMS</option>
                    <option value="Gerente General">Gerente General</option>
                  </select>
                </div>

                <p className="text-[11px] font-black uppercase tracking-wide text-red-500 pb-2 border-b border-slate-100 mt-2">Contacto de emergencia</p>
                <div className="space-y-1">
                  <label className={labelCls}>Nombre del contacto</label>
                  <input className={inputCls} placeholder="Ej. Marcela Salazar" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Teléfono de emergencia</label>
                  <input className={inputCls} placeholder="+57 300 000 0000" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                </div>
              </div>

              {/* Columna derecha: licencia + certificaciones */}
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Licencia RPAS</p>
                <div className="space-y-1">
                  <label className={labelCls}>N.º de licencia RPAS (CIPU)</label>
                  <input className={inputCls + ' font-mono uppercase'} placeholder="Ej. RPAS-CO-00312" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Vencimiento cert. médica</label>
                  <input type="date" className={inputCls} value={form.medical_expiry} onChange={e => setForm({ ...form, medical_expiry: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Adiciones vigentes (Aerocivil)</label>
                  <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar">
                    {AEROCIVIL_ADDITIONS.map(add => {
                      const checked = aerocivilChecked.includes(add);
                      return (
                        <button type="button" key={add} onClick={() => toggleAerocivil(add)}
                          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-all ${
                            checked ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                          }`}>
                          {add}
                          {checked && <span className="material-symbols-outlined text-xs">close</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Documentación adjunta (PDF/JPG)</label>
                  <FileUpload path="crew/docs" label="Cédula / documento de identidad" onUploadSuccess={(url) => setForm({ ...form, id_doc_url: url })} />
                  <FileUpload path="crew/docs" label="Diploma curso piloto UAS" onUploadSuccess={(url) => setForm({ ...form, pilot_course_url: url })} />
                  <FileUpload path="crew/docs" label="Examen teórico Aerocivil" onUploadSuccess={(url) => setForm({ ...form, theoretical_exam_url: url })} />
                  <FileUpload path="crew/docs" label="Certificado médico aeronáutico" onUploadSuccess={(url) => setForm({ ...form, medical_cert_url: url })} />
                </div>
              </div>
            </div>

            {/* Estado inicial */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-5">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Estado inicial</span>
                <button type="button" onClick={() => setForm({ ...form, is_active: true })} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-lg ${form.is_active ? 'text-orange-600' : 'text-slate-300'}`}>
                    {form.is_active ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">Activo</span>
                </button>
                <button type="button" onClick={() => setForm({ ...form, is_active: false })} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-lg ${!form.is_active ? 'text-orange-600' : 'text-slate-300'}`}>
                    {!form.is_active ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">Inactivo</span>
                </button>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Podrás cambiar el estado en cualquier momento desde Tripulación</span>
            </div>

            <p className="text-[10px] font-semibold text-slate-400">
              <span className="text-orange-600">*</span> Identidad y contacto son obligatorios — licencia, certificaciones y adjuntos puedes completarlos después. Se envía un correo de acceso automáticamente.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-base">person_add</span>
                {loading ? 'Sincronizando...' : 'Registrar piloto'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSendInvite} className="bg-[#1A202C] rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="size-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-orange-500 border border-white/10">
                <span className="material-symbols-outlined text-3xl">mail</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase text-sm text-white">Invitación corporativa</h4>
                <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">El tripulante recibirá un enlace de acceso vinculado a su organización — completará su propio expediente al ingresar.</p>
              </div>
            </div>
            <div className="space-y-3 text-left">
              <input required type="email" placeholder="correo@tripulante.com" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-orange-500 placeholder:text-slate-500" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm text-white" value={form.pilot_role} onChange={e => setForm({ ...form, pilot_role: e.target.value })}>
                <option value="Piloto">Piloto</option>
                <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                <option value="Gerente SMS">Gerente SMS</option>
              </select>
            </div>
            <button disabled={loading} type="submit" className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-60">
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
