'use client';
/**
 * Formulario público VOR / MOR
 * Usado por /vor/[orgCode] y /mor/[orgCode] — sin autenticación.
 *
 * Los campos se resuelven dinámicamente:
 *   BASE_FIELDS (código) + overrides del cliente (DB) + campos custom (DB)
 * → Solo se almacena el delta en Supabase, no los campos base.
 */
import { useState, useRef, useEffect } from 'react';
import { resolveFields, parseFormConfig, SECTION_LABELS } from '@/lib/vorMorFields';

const MAX_FILES = 5;
const MAX_MB    = 10;

const THEME = {
  VOR: { bg: 'bg-sky-600',  btn: 'bg-sky-600 hover:bg-sky-500',  icon: 'volunteer_activism' },
  MOR: { bg: 'bg-rose-600', btn: 'bg-rose-600 hover:bg-rose-500', icon: 'warning' },
};

const INPUT    = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all';
const LABEL_CL = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-2';

// ── Indicador de progreso ─────────────────────────────────────────────────────
const STEPS = [
  { key: 'form',    label: 'Formulario', icon: 'edit_note' },
  { key: 'sending', label: 'Enviando',   icon: 'send' },
  { key: 'success', label: 'Confirmado', icon: 'check_circle' },
];

function StepIndicator({ step, color }) {
  const activeIdx = step === 'form' ? 0 : step === 'success' ? 2 : 1;
  return (
    <div className="max-w-xl mx-auto px-6 pt-5 pb-2" aria-label="Progreso del formulario" role="navigation">
      <ol className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done    = i < activeIdx;
          const current = i === activeIdx;
          return (
            <li key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`size-8 rounded-full flex items-center justify-center transition-all
                  ${done    ? `${color} text-white` : ''}
                  ${current ? `${color} text-white ring-4 ring-white shadow-md` : ''}
                  ${!done && !current ? 'bg-white/30 text-white/60' : ''}`}
                  aria-current={current ? 'step' : undefined}>
                  <span className="material-symbols-outlined text-base">
                    {done ? 'check' : s.icon}
                  </span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap
                  ${current ? 'text-white' : 'text-white/60'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all
                  ${done ? 'bg-white/80' : 'bg-white/20'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Renderizador de un campo individual ──────────────────────────────────────
function FieldRenderer({ field, value, onChange, barriers }) {
  const { label, type, required, placeholder, options, id: fieldId } = field;
  const inputId = `field-${fieldId}`;

  if (type === 'textarea') return (
    <textarea id={inputId} required={required} rows={fieldId === 'description' ? 5 : 3}
      value={value || ''} onChange={e => onChange(e.target.value)}
      className={`${INPUT} resize-none`} placeholder={placeholder}
      aria-required={required} />
  );

  if (type === 'select') return (
    <select id={inputId} required={required} value={value || ''}
      onChange={e => onChange(e.target.value)} className={INPUT}
      aria-required={required}>
      <option value="">Seleccionar...</option>
      {(options || []).map((opt, i) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        return <option key={i} value={val}>{lbl}</option>;
      })}
    </select>
  );

  // Barrera de seguridad relacionada — opciones dinámicas (activas de la org, no código estático)
  if (type === 'barrier_select') return (
    <select id={inputId} required={required} value={value || ''}
      onChange={e => onChange(e.target.value)} className={INPUT}
      aria-required={required} disabled={!barriers?.length}>
      <option value="">{barriers?.length ? 'Seleccionar...' : 'Sin barreras activas registradas'}</option>
      {(barriers || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );

  if (type === 'checkbox') return (
    <label htmlFor={inputId} className="flex items-center gap-3 cursor-pointer">
      <input id={inputId} type="checkbox" required={required} checked={!!value}
        onChange={e => onChange(e.target.checked)} className="size-4 rounded" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );

  if (type === 'email') return (
    <div>
      <input id={inputId} type="email" required={required} value={value || ''}
        onChange={e => onChange(e.target.value)} className={INPUT}
        placeholder={placeholder} aria-required={required}
        aria-describedby={fieldId === 'reporter_email' ? 'anon-hint' : undefined} />
      {fieldId === 'reporter_email' && value && !value.includes(' ') && (
        <p className="text-xs text-slate-400 mt-1.5 px-1" id="anon-hint">
          Si no escribes tu nombre, el reporte será anónimo. Aun así recibirás actualizaciones.
        </p>
      )}
    </div>
  );

  return (
    <input id={inputId}
      type={type === 'date' ? 'date' : type === 'time' ? 'time' : 'text'}
      required={required} value={value || ''}
      onChange={e => onChange(e.target.value)} className={INPUT}
      placeholder={placeholder} aria-required={required} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VorMorForm({ orgCode, type, orgName, formDef, barriers }) {
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
  const errorRef     = useRef(null);

  // Mover foco al error cuando aparece
  useEffect(() => {
    if (step === 'error' && errorRef.current) errorRef.current.focus();
  }, [step]);

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
          reported_severity:    baseValues.reported_severity  || null,
          related_barrier_id:   baseValues.related_barrier_id || null,
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
  const stepForIndicator = step === 'uploading' || step === 'submitting' ? 'sending' : step;

  // ── Pantalla éxito ─────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header con indicador completo */}
        <header className={`${c.bg} text-white px-6 pt-8 pb-2`}>
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-2xl opacity-80">{c.icon}</span>
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
                Reporte {type === 'VOR' ? 'Voluntario' : 'Obligatorio'} de Ocurrencia
              </span>
            </div>
          </div>
          <StepIndicator step="success" color="bg-white/30" />
        </header>

        <div className="max-w-md mx-auto px-6 pt-8 pb-20 space-y-6">
          {/* Confirmación */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
            <div className={`size-20 ${c.bg} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
              <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Reporte enviado</h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {isAnonymous
                  ? 'Tu reporte fue recibido de forma anónima. El equipo de seguridad lo revisará.'
                  : 'Tu reporte fue recibido. Recibirás actualizaciones en tu correo electrónico.'}
              </p>
            </div>
            {submissionId && (
              <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 text-left">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Número de referencia</p>
                <p className="font-mono text-xs text-slate-600 mt-1 break-all select-all">{submissionId}</p>
                <p className="text-xs text-slate-400 mt-1">Guarda este código para hacer seguimiento</p>
              </div>
            )}
            <button onClick={resetForm}
              className={`w-full ${c.btn} text-white font-black py-3 rounded-2xl text-sm uppercase tracking-widest transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}>
              Enviar otro reporte
            </button>
          </div>

          {/* ¿Qué pasa después? */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              ¿Qué pasa después?
            </h2>
            <ol className="space-y-4" aria-label="Pasos del proceso de revisión">
              {[
                { icon: 'inbox',          title: 'Tu reporte es recibido',           desc: 'El sistema lo registra de inmediato en el módulo SMS de la organización.' },
                { icon: 'manage_search',  title: 'Asignación a un investigador',      desc: 'Un miembro del equipo de seguridad es asignado para revisar el caso.' },
                { icon: 'checklist',      title: 'Análisis y acciones correctivas',   desc: 'Se documentan los hallazgos, causas raíz y las medidas preventivas.' },
                { icon: isAnonymous ? 'visibility_off' : 'mail', title: isAnonymous ? 'Proceso confidencial' : 'Recibirás una actualización', desc: isAnonymous ? 'Tu identidad permanece protegida durante todo el proceso.' : 'Te notificaremos por correo cuando haya novedades.' },
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`size-8 rounded-full flex items-center justify-center ${c.bg} text-white`}>
                      <span className="material-symbols-outlined text-sm">{item.icon}</span>
                    </div>
                    {i < 3 && <div className="w-0.5 h-4 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-black text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
              El proceso de investigación puede tomar entre 5 y 15 días hábiles según la complejidad del evento.
            </p>
          </div>

          <p className="text-center text-xs text-slate-400">
            Plataforma de Seguridad Operacional · BitaFly · RAC 100
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  const SECTION_ORDER = ['reporter', 'occurrence', 'event', 'safety', 'custom'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* Header */}
      <header className={`${c.bg} text-white px-6 pt-8 pb-2`}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-2xl opacity-80" aria-hidden="true">{c.icon}</span>
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
        <StepIndicator step={stepForIndicator} color="bg-white/30" />
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 pt-6 space-y-5" noValidate>

        {/* Renderizar secciones en orden */}
        {SECTION_ORDER.map(sec => {
          const secFields = sections[sec];
          if (!secFields?.length) return null;

          return (
            <section key={sec} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                {sec === 'custom' ? 'Información adicional' : SECTION_LABELS[sec]}
              </h3>
              <div className="space-y-4">
                {secFields.map(field => (
                  <div key={field.id}>
                    {field.type !== 'checkbox' && (
                      <label htmlFor={`field-${field.id}`} className={LABEL_CL}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                      </label>
                    )}
                    <FieldRenderer
                      field={field}
                      value={values[field.id]}
                      onChange={(val) => setValue(field.id, val)}
                      barriers={barriers}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Archivos adjuntos */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
            Evidencias
          </h3>
          <p className="text-xs text-slate-400 mb-4">Opcional · máx. {MAX_FILES} archivos · {MAX_MB} MB c/u · JPG, PNG, PDF</p>
          {files.length < MAX_FILES && (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                aria-label="Adjuntar archivos de evidencia"
                className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-5 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">attach_file</span>
                <span className="text-xs font-bold uppercase tracking-widest">Seleccionar archivos</span>
              </button>
              <input ref={fileInputRef} type="file" multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden" onChange={handleFileChange}
                aria-label="Selección de archivos de evidencia" />
            </>
          )}
          {files.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label="Archivos seleccionados">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <span className="material-symbols-outlined text-slate-400 text-lg" aria-hidden="true">
                    {f.type.startsWith('image') ? 'image' : 'picture_as_pdf'}
                  </span>
                  <span className="text-xs text-slate-600 font-medium truncate flex-1">{f.name}</span>
                  {step === 'uploading' && uploadProgress[i] === 100
                    ? <span className="material-symbols-outlined text-emerald-500 text-base" aria-label="Subido">check_circle</span>
                    : <button type="button" onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:rounded focus-visible:outline-none"
                        aria-label={`Eliminar ${f.name}`}>
                        <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                      </button>
                  }
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Error */}
        {step === 'error' && errorMsg && (
          <div ref={errorRef} tabIndex={-1} role="alert"
            className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium flex items-start gap-2 focus:outline-none">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5" aria-hidden="true">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={isLoading}
          className={`w-full ${c.btn} disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}>
          {isLoading ? (
            <><span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
              {step === 'uploading' ? 'Subiendo archivos...' : 'Enviando reporte...'}</>
          ) : (
            <><span className="material-symbols-outlined text-base" aria-hidden="true">{c.icon}</span> Enviar reporte {type}</>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 pb-4">
          Plataforma de Seguridad Operacional · BitaFly · RAC 100
        </p>
      </form>
    </div>
  );
}
