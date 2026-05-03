'use client';
import { useState, useEffect } from 'react';

const ALLOWED_ROLES = ['superadmin', 'admin', 'jefe_pilotos'];

// ── InspectModal ─────────────────────────────────────────────────────────────
// Muestra los resultados paso a paso de la inspección del portal.
function InspectModal({ result, onClose }) {
  const [activeStep, setActiveStep] = useState(0);

  if (!result) return null;
  const { steps = [] } = result;
  const step = steps[activeStep];

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">travel_explore</span>
              Diagnóstico del portal AeroCivil
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {steps.length} paso{steps.length !== 1 ? 's' : ''} capturados
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex gap-2 px-8 py-3 border-b overflow-x-auto shrink-0 bg-slate-50">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                i === activeStep
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                  : s.error
                  ? 'bg-red-50 text-red-500 border border-red-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-orange-300'
              }`}
            >
              {i + 1}. {s.label?.replace(/[✅]/g, '').trim().substring(0, 25)}
              {s.error && <span className="ml-1">⚠️</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        {step && (
          <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Screenshot */}
            <div className="p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Captura de pantalla
                </h4>
                <span className="text-[8px] text-slate-300 font-mono truncate max-w-[200px]">{step.url}</span>
              </div>

              {step.screenshot ? (
                <img
                  src={`data:image/png;base64,${step.screenshot}`}
                  alt={step.label}
                  className="w-full rounded-2xl border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-300 font-medium">Sin captura disponible</p>
                </div>
              )}

              {step.error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <span className="material-symbols-outlined text-red-500 text-sm shrink-0">error</span>
                  <p className="text-[10px] text-red-600 font-mono">{step.error}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase">Título de la página</p>
                <p className="text-[10px] text-slate-700 font-medium">{step.title || '—'}</p>
              </div>
            </div>

            {/* Elementos detectados */}
            <div className="p-6 flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">
                Elementos detectados ({step.elements?.length ?? 0})
              </h4>

              {!step.elements?.length ? (
                <div className="flex items-center justify-center h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-300 font-medium">Sin elementos visibles</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                  {/* Inputs */}
                  {step.elements.filter(e => e.tag === 'input').length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-orange-500 uppercase sticky top-0 bg-white py-0.5">
                        Inputs ({step.elements.filter(e => e.tag === 'input').length})
                      </p>
                      {step.elements.filter(e => e.tag === 'input').map((el, idx) => (
                        <div key={idx} className="bg-blue-50 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-600 text-[7px] font-black px-2 py-0.5 rounded-full uppercase">
                              {el.type || 'text'}
                            </span>
                            {el.id && (
                              <span className="font-mono text-[9px] text-slate-700 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                                #{el.id}
                              </span>
                            )}
                            {el.name && (
                              <span className="font-mono text-[9px] text-slate-500">
                                name=&quot;{el.name}&quot;
                              </span>
                            )}
                          </div>
                          {el.placeholder && (
                            <p className="text-[8px] text-slate-400 italic">placeholder: &quot;{el.placeholder}&quot;</p>
                          )}
                          {el.selector && (
                            <p className="font-mono text-[8px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                              → {el.selector}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selects */}
                  {step.elements.filter(e => e.tag === 'select').length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-purple-500 uppercase sticky top-0 bg-white py-0.5">
                        Selects ({step.elements.filter(e => e.tag === 'select').length})
                      </p>
                      {step.elements.filter(e => e.tag === 'select').map((el, idx) => (
                        <div key={idx} className="bg-purple-50 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {el.id && (
                              <span className="font-mono text-[9px] text-slate-700 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                                #{el.id}
                              </span>
                            )}
                            {el.name && (
                              <span className="font-mono text-[9px] text-slate-500">
                                name=&quot;{el.name}&quot;
                              </span>
                            )}
                          </div>
                          {el.options?.length > 0 && (
                            <p className="text-[8px] text-slate-400">
                              Opciones: {el.options.join(', ')}
                              {el.options.length >= 5 && '…'}
                            </p>
                          )}
                          {el.selector && (
                            <p className="font-mono text-[8px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                              → {el.selector}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buttons */}
                  {step.elements.filter(e => e.tag === 'button' || e.tag === 'a').length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase sticky top-0 bg-white py-0.5">
                        Botones / Links ({step.elements.filter(e => e.tag === 'button' || e.tag === 'a').length})
                      </p>
                      {step.elements.filter(e => e.tag === 'button' || e.tag === 'a').slice(0, 15).map((el, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                            el.tag === 'button'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {el.tag}
                          </span>
                          <span className="text-[9px] text-slate-700 font-medium truncate flex-1">
                            {el.text || el.href || '(sin texto)'}
                          </span>
                          {el.id && (
                            <span className="font-mono text-[8px] text-slate-400 shrink-0">#{el.id}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer con instrucción */}
        <div className="px-8 py-4 border-t bg-slate-50 shrink-0">
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
            <strong className="text-slate-600">¿Cómo usar esto?</strong>{' '}
            Revisa cada paso: el screenshot muestra exactamente lo que ve el robot.
            Los <span className="text-emerald-600 font-mono">selectores verdes</span> son los que debes copiar en{' '}
            <span className="font-mono text-orange-600">railway-robot/automator.js</span> para reemplazar las entradas marcadas{' '}
            <span className="font-mono">[VERIFICAR]</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── AerocivilCredentialsSection ───────────────────────────────────────────────
export default function AerocivilCredentialsSection({ orgId, role }) {
  const [creds, setCreds]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  // Inspector state
  const [inspecting, setInspecting]       = useState(false);
  const [inspectResult, setInspectResult] = useState(null);   // datos crudos
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectError, setInspectError]   = useState(null);

  const [form, setForm] = useState({
    username:     '',
    password:     '',
    solicitante:  '',
    contact_name: '',
  });

  const canManage = ALLOWED_ROLES.includes(role);

  // ── Carga del estado actual ──────────────────────────────────
  const loadCreds = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/aerocivil/credentials');
      const data = await res.json();
      setCreds(data);
    } catch {
      setCreds(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      loadCreds();
    } else {
      setLoading(false); // sin org → salir del estado de carga inmediatamente
    }
  }, [orgId]);

  // ── Abrir formulario ─────────────────────────────────────────
  const openForm = () => {
    setForm({
      username:     creds?.username     || '',
      password:     '',
      solicitante:  creds?.solicitante  || '',
      contact_name: creds?.contact_name || '',
    });
    setShowPass(false);
    setShowForm(true);
  };

  // ── Guardar ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim())
      return alert('Usuario y contraseña son obligatorios');

    setSaving(true);
    try {
      const res = await fetch('/api/aerocivil/credentials', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      await loadCreds();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('¿Eliminar las credenciales de AeroCivil? El robot no podrá autenticarse.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/aerocivil/credentials', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setCreds(null);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Probar Portal ────────────────────────────────────────────
  const handleInspect = async () => {
    setInspecting(true);
    setInspectError(null);
    setInspectResult(null);
    setShowInspectModal(false);
    try {
      const res  = await fetch('/api/aerocivil/automate/inspect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setInspectResult(data);
      setShowInspectModal(true);  // abrir modal automáticamente
    } catch (err) {
      setInspectError(err.message);
    } finally {
      setInspecting(false);
    }
  };

  // ── Helpers visuales ─────────────────────────────────────────
  const statusChip = () => {
    if (!creds) return null;
    if (creds.verified)
      return (
        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[9px] font-black uppercase">
          <span className="size-1.5 bg-emerald-500 rounded-full inline-block" />
          Verificado
        </span>
      );
    return (
      <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[9px] font-black uppercase">
        <span className="size-1.5 bg-amber-400 rounded-full inline-block animate-pulse" />
        Pendiente de verificación
      </span>
    );
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
    <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500">gavel</span>
            Cuenta AeroCivil
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1">
            Credenciales del portal de automatización UAS
          </p>
        </div>

        {canManage && orgId && (
          <button
            onClick={openForm}
            className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">{creds ? 'edit_square' : 'add_circle'}</span>
            {creds ? 'Editar' : 'Configurar'}
          </button>
        )}
      </header>

      {/* Estado */}
      {loading ? (
        <div className="py-8 text-center text-slate-300 font-black text-[10px] uppercase animate-pulse">
          Verificando configuración...
        </div>
      ) : !orgId ? (
        /* Sin organización vinculada — caso típico de cuenta superadmin */
        <div className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <span className="material-symbols-outlined text-2xl text-slate-400 shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-xs font-black text-slate-700 uppercase">Cuenta sin organización vinculada</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Las credenciales de AeroCivil se configuran por organización. Para gestionar esta sección,
              inicia sesión con una cuenta <strong>Gerente General</strong> (admin) que tenga una organización asignada,
              o vincula esta cuenta a una organización desde el panel Master.
            </p>
          </div>
        </div>
      ) : !creds ? (
        /* Sin credenciales */
        <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-xs font-black text-amber-800 uppercase">Sin credenciales configuradas</p>
            <p className="text-[10px] text-amber-600 font-medium mt-1">
              Para que Bitafly pueda radicar solicitudes automáticamente en el portal de AeroCivil,
              configura el usuario y contraseña de tu cuenta UAEAC.
              La contraseña se almacena cifrada y nunca se muestra en texto claro.
            </p>
          </div>
        </div>
      ) : (
        /* Credenciales configuradas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario AeroCivil</p>
              {statusChip()}
            </div>
            <p className="font-black text-slate-900 text-sm font-mono">{creds.username}</p>
            <p className="text-[10px] text-slate-400 font-mono">Contraseña: ••••••••••••</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Datos del Solicitante</p>
            <p className="font-black text-slate-900 text-sm">
              {creds.solicitante || <span className="text-slate-300 font-medium italic">No configurado</span>}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Contacto: {creds.contact_name || <span className="text-slate-300 italic">No configurado</span>}
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between bg-slate-50 rounded-2xl p-4 gap-3 flex-wrap">
            <p className="text-[9px] font-black text-slate-400 uppercase">
              Última actualización: <span className="text-slate-600">{fmtDate(creds.updated_at)}</span>
              {creds.last_verified_at && (
                <> · Verificado: <span className="text-emerald-600">{fmtDate(creds.last_verified_at)}</span></>
              )}
            </p>
            <div className="flex items-center gap-3">
              {/* Botón Probar Portal */}
              {canManage && (
                <button
                  onClick={handleInspect}
                  disabled={inspecting}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${inspecting ? 'animate-spin' : ''}`}>
                    {inspecting ? 'progress_activity' : 'travel_explore'}
                  </span>
                  {inspecting ? 'Inspeccionando... (~30s)' : 'Probar portal'}
                </button>
              )}
              {canManage && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error de inspección inline */}
      {inspectError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <span className="material-symbols-outlined text-red-500 text-base shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-[10px] font-black text-red-700 uppercase">Error al inspeccionar el portal</p>
            <p className="text-[9px] text-red-500 font-mono mt-1">{inspectError}</p>
          </div>
          <button
            onClick={() => setInspectError(null)}
            className="text-red-300 hover:text-red-500"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Banner de resultado rápido + botón para re-abrir modal */}
      {inspectResult && !inspecting && !showInspectModal && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl p-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-500">task_alt</span>
            <div>
              <p className="text-[10px] font-black text-indigo-800 uppercase">Inspección completada</p>
              <p className="text-[9px] text-indigo-500 font-medium">
                {inspectResult.totalSteps} paso{inspectResult.totalSteps !== 1 ? 's' : ''} capturados.
                Revisa los selectores para actualizar <span className="font-mono">automator.js</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInspectModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">open_in_full</span>
              Ver resultados
            </button>
            <button
              onClick={() => setInspectResult(null)}
              className="size-7 flex items-center justify-center text-indigo-300 hover:text-indigo-500"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Aviso de seguridad */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <span className="material-symbols-outlined text-slate-400 text-base shrink-0 mt-0.5">lock</span>
        <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
          Las credenciales se cifran con <strong>AES-256-GCM</strong> antes de almacenarse.
          Nunca se transmiten en texto claro. Solo el servicio de automatización en Railway
          las descifra en el momento de ejecutar la solicitud.
        </p>
      </div>
    </section>

    {/* ── Modal de formulario ──────────────────────────────────── */}
    {showForm && (
      <div
        className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={() => setShowForm(false)}
      >
        <form
          onClick={e => e.stopPropagation()}
          onSubmit={handleSave}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200"
        >
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">
              {creds ? 'Actualizar credenciales' : 'Configurar cuenta AeroCivil'}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Usadas exclusivamente para radicar solicitudes de forma automática.
            </p>
          </div>

          {/* Usuario */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
              Usuario AeroCivil <span className="text-orange-500">*</span>
            </label>
            <input
              required
              autoComplete="off"
              placeholder="usuario@aerocivil.gov.co"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
              Contraseña <span className="text-orange-500">*</span>
              {creds && <span className="text-slate-300 ml-1 normal-case">(dejar vacío = mantener la actual)</span>}
            </label>
            <div className="relative">
              <input
                required={!creds}
                autoComplete="new-password"
                type={showPass ? 'text' : 'password'}
                placeholder={creds ? '••••••••• (sin cambios)' : 'Contraseña del portal'}
                className="w-full p-4 pr-12 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-base">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Solicitante */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
              Nombre del Solicitante en AeroCivil
            </label>
            <input
              placeholder="Ej: EMPRESA DRONES SAS"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={form.solicitante}
              onChange={e => setForm(f => ({ ...f, solicitante: e.target.value }))}
            />
            <p className="text-[8px] text-slate-400 ml-1">
              Nombre exacto que aparece en el desplegable &quot;Solicitante&quot; del portal.
            </p>
          </div>

          {/* Contacto */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
              Nombre del Contacto en AeroCivil
            </label>
            <input
              placeholder="Ej: JUAN CARLOS PÉREZ"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            />
            <p className="text-[8px] text-slate-400 ml-1">
              Nombre exacto del desplegable &quot;Contacto&quot; del portal.
            </p>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
            <span className="material-symbols-outlined text-blue-400 text-sm shrink-0 mt-0.5">info</span>
            <p className="text-[8px] text-blue-600 font-medium">
              La contraseña se cifra localmente antes de enviarse. Nadie del equipo Bitafly puede verla.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : creds ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    )}

    {/* ── Modal de inspección ──────────────────────────────────── */}
    {showInspectModal && inspectResult && (
      <InspectModal
        result={inspectResult}
        onClose={() => setShowInspectModal(false)}
      />
    )}
    </>
  );
}
