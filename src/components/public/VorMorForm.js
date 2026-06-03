'use client';
/**
 * Formulario público VOR / MOR
 * Usado por /vor/[orgCode] y /mor/[orgCode]
 * Sin autenticación requerida.
 */
import { useState, useRef } from 'react';

const MAX_FILES = 5;
const MAX_MB    = 10;

const STATUS_COLOR = {
  VOR: { bg: 'bg-sky-600',  ring: 'ring-sky-300',  text: 'text-sky-700',  light: 'bg-sky-50',  border: 'border-sky-200',  icon: 'volunteer_activism' },
  MOR: { bg: 'bg-rose-600', ring: 'ring-rose-300', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-rose-200', icon: 'warning' },
};

export default function VorMorForm({ orgCode, type, orgName, formDef }) {
  const c = STATUS_COLOR[type];

  const [step, setStep] = useState('form');   // 'form' | 'uploading' | 'submitting' | 'success' | 'error'
  const [submissionId, setSubmissionId] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    reporter_name:       '',
    reporter_email:      '',
    occurrence_date:     '',
    occurrence_time:     '',
    location:            '',
    description:         '',
    immediate_actions:   '',
    contributing_factors:'',
  });

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // ── Archivos ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.size <= MAX_MB * 1024 * 1024);
    if (valid.length < selected.length) alert(`Algunos archivos superan ${MAX_MB} MB y fueron descartados.`);
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setErrorMsg('');

    // 1. Subir archivos adjuntos
    setStep('uploading');
    const attachments = [];
    setUploadProgress(files.map(() => 0));

    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append('file', files[i]);
        const res = await fetch(`/api/public/upload/${orgCode}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.path) attachments.push(data.path);
        setUploadProgress(prev => prev.map((v, idx) => idx === i ? 100 : v));
      } catch (_) {
        // archivo falló → continuar sin él
      }
    }

    // 2. Enviar reporte
    setStep('submitting');
    try {
      const endpoint = `/api/public/${type.toLowerCase()}/${orgCode}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reporter_name:  form.reporter_name.trim()  || null,
          reporter_email: form.reporter_email.trim() || null,
          attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar el reporte');
      setSubmissionId(data.submission_id);
      setIsAnonymous(data.is_anonymous);
      setStep('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  };

  // ── Pantalla éxito ─────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-8 text-center space-y-5">
          <div className={`size-20 ${c.bg} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Reporte enviado</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {isAnonymous
                ? 'Tu reporte fue recibido de forma anónima. El equipo de seguridad lo revisará.'
                : 'Tu reporte fue recibido. Recibirás actualizaciones en tu correo electrónico.'}
            </p>
          </div>
          {submissionId && (
            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Referencia</p>
              <p className="font-mono text-xs text-slate-600 mt-1 break-all">{submissionId}</p>
            </div>
          )}
          <button
            onClick={() => { setStep('form'); setFiles([]); setForm({ reporter_name:'',reporter_email:'',occurrence_date:'',occurrence_time:'',location:'',description:'',immediate_actions:'',contributing_factors:'' }); }}
            className={`w-full ${c.bg} hover:opacity-90 text-white font-black py-3 rounded-2xl text-sm uppercase tracking-widest transition-opacity`}
          >
            Enviar otro reporte
          </button>
        </div>
      </div>
    );
  }

  const isLoading = step === 'uploading' || step === 'submitting';

  const INPUT  = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all';
  const LABEL  = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-2';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* Header */}
      <header className={`${c.bg} text-white px-6 py-8`}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-2xl opacity-80">{c.icon}</span>
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
              Reporte {type === 'VOR' ? 'Voluntario' : 'Obligatorio'} de Ocurrencia
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">
            {formDef?.title || `${type} — ${orgName}`}
          </h1>
          <p className="text-sm opacity-75 mt-2 leading-relaxed">
            {formDef?.description || 'Completa el formulario para reportar la ocurrencia. Puedes enviarlo de forma anónima.'}
          </p>
          <p className="text-xs font-bold mt-3 opacity-60">{orgName}</p>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 pt-8 space-y-6">

        {/* Anónimo / Identificado */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Datos del reportante (opcionales)</h3>
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Nombre</label>
              <input value={form.reporter_name} onChange={set('reporter_name')} className={INPUT} placeholder="Dejar en blanco para enviar anónimamente" />
            </div>
            <div>
              <label className={LABEL}>Correo electrónico</label>
              <input type="email" value={form.reporter_email} onChange={set('reporter_email')} className={INPUT} placeholder="Para recibir actualizaciones (opcional)" />
              {!form.reporter_name && form.reporter_email && (
                <p className="text-xs text-slate-400 mt-1.5 px-1">
                  Tu identidad permanecerá anónima. Solo recibirás actualizaciones del equipo SMS.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Datos de la ocurrencia */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Datos de la ocurrencia</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={LABEL}>Fecha</label>
              <input type="date" value={form.occurrence_date} onChange={set('occurrence_date')} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Hora</label>
              <input type="time" value={form.occurrence_time} onChange={set('occurrence_time')} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Lugar / Ubicación</label>
            <input value={form.location} onChange={set('location')} className={INPUT} placeholder="Ciudad, coordenadas o descripción del lugar" />
          </div>
        </section>

        {/* Descripción */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Descripción del evento *</h3>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={set('description')}
            className={`${INPUT} resize-none`}
            placeholder="Describe detalladamente lo que ocurrió..."
          />
          <div className="mt-4">
            <label className={LABEL}>Acciones inmediatas tomadas</label>
            <textarea rows={3} value={form.immediate_actions} onChange={set('immediate_actions')} className={`${INPUT} resize-none`} placeholder="¿Qué medidas se tomaron en el momento?" />
          </div>
          <div className="mt-4">
            <label className={LABEL}>Factores contribuyentes</label>
            <textarea rows={3} value={form.contributing_factors} onChange={set('contributing_factors')} className={`${INPUT} resize-none`} placeholder="Condiciones, factores humanos, técnicos u organizacionales..." />
          </div>
        </section>

        {/* Archivos adjuntos */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
            Evidencias (imágenes / PDF) — máx. {MAX_FILES} archivos de {MAX_MB} MB
          </h3>
          {files.length < MAX_FILES && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">attach_file</span>
                <span className="text-xs font-bold uppercase tracking-widest">Seleccionar archivos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <span className="material-symbols-outlined text-slate-400 text-lg">
                    {f.type.startsWith('image') ? 'image' : 'picture_as_pdf'}
                  </span>
                  <span className="text-xs text-slate-600 font-medium truncate flex-1">{f.name}</span>
                  {step === 'uploading' && uploadProgress[i] === 100 && (
                    <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                  )}
                  {step !== 'uploading' && (
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Error */}
        {step === 'error' && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full ${c.bg} hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              {step === 'uploading' ? 'Subiendo archivos...' : 'Enviando reporte...'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">{c.icon}</span>
              Enviar reporte {type}
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 pb-4">
          Plataforma de Seguridad Operacional · BitaFly
        </p>
      </form>
    </div>
  );
}
