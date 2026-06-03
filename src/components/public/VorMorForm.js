'use client';
/**
 * Formulario público VOR / MOR
 * Usado por /vor/[orgCode] y /mor/[orgCode] — sin autenticación.
 *
 * Los campos se resuelven dinámicamente:
 *   BASE_FIELDS (código) + overrides del cliente (DB) + campos custom (DB)
 * → Solo se almacena el delta en Supabase, no los campos base.
 */
import { useState, useRef } from 'react';
import { resolveFields, parseFormConfig, SECTION_LABELS } from '@/lib/vorMorFields';

const MAX_FILES = 5;
const MAX_MB    = 10;

const THEME = {
  VOR: { bg: 'bg-sky-600',  btn: 'bg-sky-600 hover:bg-sky-500',  icon: 'volunteer_activism' },
  MOR: { bg: 'bg-rose-600', btn: 'bg-rose-600 hover:bg-rose-500', icon: 'warning' },
};

const INPUT    = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all';
const LABEL_CL = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-2';

// ── Renderizador de un campo individual ──────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  const { label, type, required, placeholder, options } = field;

  if (type === 'textarea') return (
    <textarea required={required} rows={field.id === 'description' ? 5 : 3}
      value={value || ''} onChange={e => onChange(e.target.value)}
      className={`${INPUT} resize-none`} placeholder={placeholder} />
  );

  if (type === 'select') return (
    <select required={required} value={value || ''} onChange={e => onChange(e.target.value)} className={INPUT}>
      <option value="">Seleccionar...</option>
      {(options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
    </select>
  );

  if (type === 'checkbox') return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" required={required} checked={!!value}
        onChange={e => onChange(e.target.checked)} className="size-4 rounded" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );

  if (type === 'email') return (
    <div>
      <input type="email" required={required} value={value || ''}
        onChange={e => onChange(e.target.value)} className={INPUT} placeholder={placeholder} />
      {/* Aviso anónimo: sin nombre + con email */}
      {field.id === 'reporter_email' && value && !value.includes(' ') && (
        <p className="text-xs text-slate-400 mt-1.5 px-1" id="anon-hint">
          Si no escribes tu nombre, el reporte será anónimo. Aun así recibirás actualizaciones.
        </p>
      )}
    </div>
  );

  return (
    <input type={type === 'date' ? 'date' : type === 'time' ? 'time' : 'text'}
      required={required} value={value || ''}
      onChange={e => onChange(e.target.value)} className={INPUT} placeholder={placeholder} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VorMorForm({ orgCode, type, orgName, formDef }) {
  const c = THEME[type];

  // Resolver campos (base + overrides + custom) una sola vez
  const formConfig = parseFormConfig(formDef?.custom_fields);
  const allFields  = resolveFields(formConfig);

  // Agrupar por sección para el layout visual
  const sections = allFields.reduce((acc, f) => {
    const sec = f.isBase ? (f.section || 'event') : 'custom';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(f);
    return acc;
  }, {});

  const [step, setStep]             = useState('form');
  const [submissionId, setSubmissionId] = useState(null);
  const [isAnonymous, setIsAnonymous]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [files, setFiles]               = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [values, setValues]             = useState({});  // { fieldId: value }
  const fileInputRef = useRef(null);

  const setValue = (id, val) => setValues(prev => ({ ...prev, [id]: val }));

  // ── Archivos ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.size <= MAX_MB * 1024 * 1024);
    if (valid.length < selected.length) alert(`Algunos archivos superan ${MAX_MB} MB y fueron descartados.`);
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.description?.trim()) return;
    setErrorMsg('');

    setStep('uploading');
    const attachments = [];
    setUploadProgress(files.map(() => 0));

    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append('file', files[i]);
        const res  = await fetch(`/api/public/upload/${orgCode}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.path) attachments.push(data.path);
        setUploadProgress(prev => prev.map((v, idx) => idx === i ? 100 : v));
      } catch (_) { /* continuar sin el archivo */ }
    }

    setStep('submitting');
    try {
      // Separar valores base de valores custom
      const baseFieldIds  = new Set(allFields.filter(f => f.isBase).map(f => f.id));
      const customResponses = {};
      const baseValues    = {};

      for (const [k, v] of Object.entries(values)) {
        if (baseFieldIds.has(k)) baseValues[k] = v;
        else customResponses[k] = v;
      }

      const res = await fetch(`/api/public/${type.toLowerCase()}/${orgCode}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name:        baseValues.reporter_name?.trim()  || null,
          reporter_email:       baseValues.reporter_email?.trim() || null,
          occurrence_date:      baseValues.occurrence_date        || null,
          occurrence_time:      baseValues.occurrence_time        || null,
          location:             baseValues.location?.trim()       || null,
          description:          baseValues.description?.trim(),
          immediate_actions:    baseValues.immediate_actions?.trim()    || null,
          contributing_factors: baseValues.contributing_factors?.trim() || null,
          attachments,
          custom_responses: customResponses,
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

  const resetForm = () => {
    setStep('form'); setFiles([]); setValues({});
    setSubmissionId(null); setIsAnonymous(false); setErrorMsg('');
  };

  const isLoading = step === 'uploading' || step === 'submitting';

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
          <button onClick={resetForm}
            className={`w-full ${c.btn} text-white font-black py-3 rounded-2xl text-sm uppercase tracking-widest transition-opacity`}>
            Enviar otro reporte
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  const SECTION_ORDER = ['reporter', 'occurrence', 'event', 'custom'];

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
          {formDef?.description && (
            <p className="text-sm opacity-75 mt-2 leading-relaxed">{formDef.description}</p>
          )}
          <p className="text-xs font-bold mt-3 opacity-60">{orgName}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 pt-8 space-y-5">

        {/* Renderizar secciones en orden */}
        {SECTION_ORDER.map(sec => {
          const secFields = sections[sec];
          if (!secFields?.length) return null;

          return (
            <section key={sec} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                {sec === 'custom' ? 'Información adicional' : SECTION_LABELS[sec]}
              </h3>
              <div className={`space-y-4 ${sec === 'occurrence' ? 'grid grid-cols-1 sm:grid-cols-2 sm:gap-4 sm:space-y-0' : ''}`}>
                {secFields.map(field => (
                  <div key={field.id} className={sec === 'occurrence' && (field.id === 'location') ? 'sm:col-span-2' : ''}>
                    {field.type !== 'checkbox' && (
                      <label className={LABEL_CL}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    <FieldRenderer
                      field={field}
                      value={values[field.id]}
                      onChange={(val) => setValue(field.id, val)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Archivos adjuntos */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
            Evidencias — máx. {MAX_FILES} archivos · {MAX_MB} MB c/u
          </h3>
          {files.length < MAX_FILES && (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-5 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors">
                <span className="material-symbols-outlined text-2xl">attach_file</span>
                <span className="text-xs font-bold uppercase tracking-widest">Seleccionar archivos</span>
              </button>
              <input ref={fileInputRef} type="file" multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden" onChange={handleFileChange} />
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
                  {step === 'uploading' && uploadProgress[i] === 100
                    ? <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                    : <button type="button" onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                  }
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
        <button type="submit" disabled={isLoading}
          className={`w-full ${c.btn} disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2`}>
          {isLoading ? (
            <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              {step === 'uploading' ? 'Subiendo archivos...' : 'Enviando reporte...'}</>
          ) : (
            <><span className="material-symbols-outlined text-base">{c.icon}</span> Enviar reporte {type}</>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 pb-4">
          Plataforma de Seguridad Operacional · BitaFly
        </p>
      </form>
    </div>
  );
}
