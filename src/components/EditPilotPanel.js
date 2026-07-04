'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';
import { toast } from '@/lib/toast';
import { docOpenUrl } from '@/lib/docUrl';

const AEROCIVIL_ADDITIONS = [
    "PBMO SUPERIOR A 25 KG Y HASTA 250 KG", "DISPERSIÓN", "ASPERSIÓN", "ENJAMBRE",
    "TRANSPORTE DE CARGA (DRONE DELIVERY)", "VUELO NOCTURNO", "BVLOS",
    "INSTRUCTOR DE VUELO UAS < 25 KG", "INSTRUCTOR DE VUELO UAS 25-250 KG",
    "INSTRUCTOR DE VUELO UAS EN ASPERSIÓN", "INSTRUCTOR DE VUELO UAS EN DISPERSIÓN",
    "INSTRUCTOR DE VUELO UAS EN ENJAMBRE", "INSTRUCTOR DE VUELO UAS EN CARGA",
    "INSTRUCTOR DE VUELO UAS EN NOCTURNAS", "INSTRUCTOR DE VUELO UAS EN BVLOS"
];

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const TRAINING_TYPE_LABEL = { operaciones: 'Operaciones', mantenimiento: 'Mantenimiento' };

export default function EditPilotPanel({ pilot, onClose, onSuccess, canEditMedical = false }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...pilot, additions: pilot?.additions || [] });

  // Evaluaciones de capacitación (solo lectura aquí — se registran en /dashboard/training)
  const [trainingEvals, setTrainingEvals] = useState([]);
  const [loadingEvals, setLoadingEvals] = useState(true);

  useEffect(() => {
    setForm({ ...pilot, additions: pilot?.additions || [] });
  }, [pilot]);

  useEffect(() => {
    if (!pilot?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingEvals(true);
      const { data } = await supabase
        .from('training_evaluations')
        .select('id, type, evaluation_date, result')
        .eq('pilot_id', pilot.id)
        .order('evaluation_date', { ascending: false });
      if (!cancelled) { setTrainingEvals(data || []); setLoadingEvals(false); }
    })();
    return () => { cancelled = true; };
  }, [pilot?.id]);

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
        additions: form.additions || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pilots').update(updateData).eq('id', pilot.id);
      if (error) throw error;
      toast.success("Expediente actualizado correctamente.");
      onSuccess();
    } catch (err) {
      toast.error("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
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
        <form id="edit-pilot-form" onSubmit={handleUpdate} className="space-y-6 pb-4">

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

            {/* Médico: solo editable por jefe_pilotos y superiores */}
            <div className={!canEditMedical ? 'opacity-60' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Fecha Vence Médico</label>
                {!canEditMedical && (
                  <span className="flex items-center gap-1 text-xs font-black text-slate-400 uppercase">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Solo Jefe de Pilotos
                  </span>
                )}
              </div>
              <input
                type="date"
                disabled={!canEditMedical}
                className={`w-full p-3 rounded-xl border-none font-bold text-sm mt-0.5 ${canEditMedical ? 'bg-slate-50' : 'bg-slate-100 cursor-not-allowed text-slate-400'}`}
                value={form.medical_expiry || ''}
                onChange={e => canEditMedical && setForm({...form, medical_expiry: e.target.value})}
              />
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
            <p className="text-xs font-black text-orange-600 uppercase tracking-widest border-b pb-2">04. Documentos del Piloto</p>

            {/* Links a documentos ya cargados */}
            {(form.id_doc_url || form.pilot_course_url || form.theoretical_exam_url || form.medical_cert_url) && (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Archivos cargados</p>
                {[
                  { url: form.id_doc_url,           label: 'Cédula / Identidad' },
                  { url: form.pilot_course_url,     label: 'Diploma Curso Piloto UAS' },
                  { url: form.theoretical_exam_url, label: 'Examen Teórico Aerocivil' },
                  { url: form.medical_cert_url,     label: 'Certificado Médico' },
                ].filter(d => d.url).map(d => (
                  <a key={d.label} href={docOpenUrl(d.url)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-800 truncate">
                    <span className="material-symbols-outlined text-sm shrink-0">description</span>
                    <span className="truncate">{d.label}</span>
                    <span className="material-symbols-outlined text-sm shrink-0 ml-auto">open_in_new</span>
                  </a>
                ))}
              </div>
            )}

            {/* Subir / reemplazar */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Subir o reemplazar (PDF / JPG)</p>
            <FileUpload path="crew/docs" label="Cédula / Documento de Identidad"   onUploadSuccess={(url) => setForm({...form, id_doc_url: url})} />
            <FileUpload path="crew/docs" label="Diploma Curso Piloto UAS"          onUploadSuccess={(url) => setForm({...form, pilot_course_url: url})} />
            <FileUpload path="crew/docs" label="Examen Teórico Aerocivil"          onUploadSuccess={(url) => setForm({...form, theoretical_exam_url: url})} />
            <FileUpload path="crew/docs" label="Certificado Médico Aeronáutico"    onUploadSuccess={(url) => setForm({...form, medical_cert_url: url})} />
          </div>

          {/* 05. ADICIONES */}
          <div className="space-y-3">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">04. Adiciones Vigentes</p>
            <div className="bg-slate-50 p-3 rounded-2xl max-h-40 overflow-y-auto space-y-2 custom-scrollbar border border-slate-100">
              {AEROCIVIL_ADDITIONS.map(add => (
                <label key={add} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-0"
                    checked={form.additions?.includes(add) || false}
                    onChange={() => {
                      const current = form.additions || [];
                      const updated = current.includes(add)
                        ? current.filter(a => a !== add)
                        : [...current, add];
                      setForm({ ...form, additions: updated });
                    }}
                  />
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

          {/* 06. CAPACITACIÓN (solo lectura — se registra en /dashboard/training) */}
          <div className="space-y-3">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-2">06. Capacitación</p>
            {loadingEvals ? (
              <p className="text-xs text-slate-300 font-bold italic">Cargando evaluaciones...</p>
            ) : trainingEvals.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold italic">Sin evaluaciones de capacitación registradas.</p>
            ) : (
              <div className="space-y-1.5">
                {trainingEvals.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700 uppercase truncate">{TRAINING_TYPE_LABEL[ev.type] || ev.type}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{fmtDate(ev.evaluation_date)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full ${ev.result === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {ev.result === 'aprobado' ? 'Aprobado' : 'No aprobado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <button form="edit-pilot-form" type="submit" disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60">
          {loading ? 'SINCRONIZANDO...' : 'ACTUALIZAR EXPEDIENTE'}
        </button>
      </div>
    </aside>
  );
}
