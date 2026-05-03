'use client';
import { useState, useEffect } from 'react';

const ALLOWED_ROLES = ['superadmin', 'admin', 'jefe_pilotos'];

export default function AerocivilCredentialsSection({ orgId, role }) {
  const [creds, setCreds]         = useState(null);   // null = no configurado
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

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

  useEffect(() => { if (orgId) loadCreds(); }, [orgId]);

  // ── Abrir formulario ─────────────────────────────────────────
  const openForm = () => {
    setForm({
      username:     creds?.username     || '',
      password:     '',                           // nunca pre-llenamos la contraseña
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

        {canManage && (
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

          <div className="md:col-span-2 flex items-center justify-between bg-slate-50 rounded-2xl p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase">
              Última actualización: <span className="text-slate-600">{fmtDate(creds.updated_at)}</span>
              {creds.last_verified_at && (
                <> · Verificado: <span className="text-emerald-600">{fmtDate(creds.last_verified_at)}</span></>
              )}
            </p>
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
              Nombre exacto que aparece en el desplegable "Solicitante" del portal.
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
              Nombre exacto del desplegable "Contacto" del portal.
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
    </>
  );
}
