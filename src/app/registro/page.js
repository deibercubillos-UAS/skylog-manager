'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';
import { trackEvent } from '@/lib/analytics';
import { attributionParams, getAttribution } from '@/lib/attribution';

// ── Planes (solo para el flujo "crear") ───────────────────────────────────────
const PLANS = [
  { key: 'piloto',      name: 'Piloto',      price: 'Gratis 1 mes', sub: 'luego $20.000/mes',           limits: '1 dron · 1 usuario',   icon: 'person',                rawPrice: 0 },
  { key: 'escuadrilla', name: 'Escuadrilla', price: '$59.000/mes',   sub: 'o $590.000/año (−20%)',       limits: '3 drones · 4 usuarios', icon: 'group',                popular: true, paid: true, rawPrice: 59000 },
  { key: 'flota',       name: 'Flota',       price: '$159.000/mes',  sub: 'o $1.590.000/año (−20%)',     limits: '15 drones · 15 usuarios', icon: 'precision_manufacturing', paid: true,  rawPrice: 159000 },
  { key: 'enterprise',  name: 'Enterprise',  price: 'A consultar',   sub: 'contactar ventas',            limits: 'Ilimitado',             icon: 'rocket_launch',        contact: true, rawPrice: 0 },
];

const ROLES_JOIN = [
  { key: 'piloto',       label: 'Piloto',         icon: 'flight_takeoff',   sub: 'Opero los drones' },
  { key: 'jefe_pilotos', label: 'Jefe de Pilotos', icon: 'supervisor_account', sub: 'Supervisión de vuelos' },
  { key: 'gerente_sms',  label: 'Gerente SMS',    icon: 'health_and_safety', sub: 'Seguridad operacional' },
];

const EMPTY_CREATE = {
  selectedPlan: 'piloto', billing: 'monthly',
  firstName: '', lastName: '', email: '', password: '',
  phone: '', city: '',
  type: 'solo', role: 'admin', companyName: '', nit: '',
};

const EMPTY_JOIN = {
  firstName: '', lastName: '', email: '', password: '',
  phone: '', city: '',
};

const INPUT = 'w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all';

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  // ── Modo principal ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState(null); // null | 'crear' | 'unirse'

  // ── Flujo CREAR ────────────────────────────────────────────────────────────
  const [createStep, setCreateStep]   = useState(1);
  const [form,       setForm]         = useState(EMPTY_CREATE);
  const [showPass,   setShowPass]     = useState(false);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState('');
  // Pago
  const [pendingRef, setPendingRef]   = useState(null);
  const [payStatus,  setPayStatus]    = useState('pending');
  const [grantToken, setGrantToken]   = useState(null); // regalo de perfil gratis (socio)
  const [partnerCode, setPartnerCode] = useState('');   // código de escuela/asesor (opcional)
  const [socioInvite, setSocioInvite] = useState(null); // { token, partner_name, partner_type, role }
  const pollRef = useRef(null);

  // ── Flujo UNIRSE ───────────────────────────────────────────────────────────
  const [joinStep,       setJoinStep]       = useState(1);
  const [joinForm,       setJoinForm]       = useState(EMPTY_JOIN);
  const [joinNit,        setJoinNit]        = useState('');
  const [joinRole,       setJoinRole]       = useState('piloto');
  const [joinOrg,        setJoinOrg]        = useState(null);  // validated org
  const [joinValidating, setJoinValidating] = useState(false);
  const [joinError,      setJoinError]      = useState('');
  const [joinLoading,    setJoinLoading]    = useState(false);
  const [joinShowPass,   setJoinShowPass]   = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set    = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const setVal = (f, v)     => setForm(p => ({ ...p, [f]: v }));
  const setJ   = (f) => (e) => setJoinForm(p => ({ ...p, [f]: e.target.value }));

  const emailLocked  = !!socioInvite || !!grantToken; // correo fijo por invitación/regalo
  const isPaidPlan   = PLANS.find(p => p.key === form.selectedPlan)?.paid ?? false;
  const CREATE_STEPS = isPaidPlan ? ['Plan', 'Datos', 'Cuenta', 'Pago'] : ['Plan', 'Datos', 'Cuenta'];
  const JOIN_STEPS   = ['Organización', 'Tus datos'];

  // Limpieza del polling
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Prerellenar desde el enlace de invitación: ?email= + ?join=1&nit=. Client-only.
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const email = qs.get('email');
      if (email) {
        const clean = email.trim();
        setForm(p => ({ ...p, email: clean }));
        setJoinForm(p => ({ ...p, email: clean }));
      }
      // Invitación de tripulante → abrir directo en modo "unirse" con el NIT cargado
      const nit = qs.get('nit');
      if (qs.get('join') === '1' || nit) {
        setMode('unirse');
        if (nit) setJoinNit(nit.trim());
      }
      // Regalo de perfil gratis (socio) → registro de piloto independiente
      // con correo pre-llenado y bloqueado, saltando la selección de plan.
      const grant = qs.get('grant');
      if (grant) {
        setGrantToken(grant);
        setMode('crear');
        setCreateStep(2);
        setForm(p => ({ ...p, selectedPlan: 'piloto', type: 'solo', email: (email || p.email) }));
      }
      // Código de socio/asesor en el enlace (opcional)
      const code = qs.get('code') || qs.get('ref');
      if (code) setPartnerCode(code.trim().toUpperCase());

      // Invitación de socio → pre-llenar email, saltar al paso de datos
      const socioToken = qs.get('socio_invite');
      if (socioToken) {
        fetch(`/api/socio/invite-info?token=${encodeURIComponent(socioToken)}`)
          .then(r => r.ok ? r.json() : null)
          .then(info => {
            if (info) {
              setSocioInvite({ token: socioToken, ...info });
              setMode('crear');
              setCreateStep(2);
              setForm(p => ({ ...p, email: info.email ?? p.email, selectedPlan: 'piloto', type: 'solo' }));
            }
          })
          .catch(() => {});
      }
    } catch { /* no-op */ }
  }, []);

  // Planes de pago → siempre tipo "empresa"; plan piloto → tipo "solo"
  useEffect(() => {
    setVal('type', isPaidPlan ? 'company' : 'solo');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaidPlan]);

  // ── Verificación de estado (polling) ───────────────────────────────────────
  // ⚠️ Definir ANTES del efecto que lo referencia en sus deps (evita TDZ → crash).
  const checkStatus = useCallback(async (ref) => {
    try {
      const res  = await fetch(`/api/auth/register-status?ref=${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (data.status === 'completed') {
        if (pollRef.current) clearInterval(pollRef.current);
        trackEvent('sign_up', { method: 'email', plan: form.selectedPlan, ...attributionParams() });
        trackEvent('purchase', {
          currency: 'COP',
          value: PLANS.find(p => p.key === form.selectedPlan)?.rawPrice ?? 0,
          items: [{ item_id: form.selectedPlan, item_name: `BitaFly ${form.selectedPlan}` }],
          ...attributionParams(),
        });
        setPayStatus('completed');
      } else if (data.status === 'expired' || data.status === 'not_found') {
        if (pollRef.current) clearInterval(pollRef.current);
        setPayStatus('expired');
      }
    } catch { /* silencioso */ }
  }, [form.selectedPlan]);

  const startPolling = useCallback((ref) => {
    if (pollRef.current) clearInterval(pollRef.current);
    checkStatus(ref); // verificar inmediatamente
    pollRef.current = setInterval(() => checkStatus(ref), 5000);
  }, [checkStatus]);

  // Visibilidad: cuando el usuario vuelve al tab desde ePayco → verificar
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && pendingRef && payStatus === 'pending') checkStatus(pendingRef);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pendingRef, payStatus, checkStatus]);

  // ── Activar pago manualmente (botón "Ya pagué") ────────────────────────────
  const activatePending = async () => {
    if (!pendingRef) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/activate-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: pendingRef }),
      });
      const data = await res.json();
      if (data.status === 'completed') setPayStatus('completed');
      else if (data.status === 'expired') setPayStatus('expired');
      else {
        // Aún pendiente
        setError('El pago aún no se ha confirmado. Si ya pagaste, espera unos minutos e intenta de nuevo.');
      }
    } catch { setError('Error al verificar. Intenta de nuevo.'); }
    finally { setLoading(false); }
  };

  // ── Flujo CREAR — handlers ─────────────────────────────────────────────────
  const goNext = (e) => { e?.preventDefault(); setError(''); setCreateStep(s => s + 1); };

  const handleRegisterFree = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, grant: grantToken, socio_invite: socioInvite?.token || null, partnerCode: partnerCode || null, attribution: getAttribution() };
      if (socioInvite?.email) payload.email = socioInvite.email; // garantía: email del token, no del form
      const res    = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error al registrar');
      // Auto-login: ingresar directamente al dashboard sin pasar por login
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (signInErr) { window.location.href = '/login?registered=1'; return; }
      trackEvent('sign_up', { method: 'email', plan: form.selectedPlan || 'piloto', ...attributionParams() });
      window.location.href = socioInvite ? '/socio' : '/dashboard';
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/register-pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, partnerCode, attribution: getAttribution() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el pago');
      setPendingRef(data.reference);
      setCreateStep(4);
      window.open(data.epaycoUrl, '_blank', 'noopener');
      startPolling(data.reference);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Flujo UNIRSE — validación ──────────────────────────────────────────────
  const validateJoin = async () => {
    const nit = joinNit.replace(/[\s\-.]/g, '').toUpperCase();
    if (!nit) { setJoinError('Ingresa el NIT de la organización.'); return; }
    setJoinValidating(true); setJoinError(''); setJoinOrg(null);
    try {
      const res  = await fetch(`/api/auth/validate-join?nit=${encodeURIComponent(nit)}&role=${joinRole}`);
      const data = await res.json();
      if (!data.valid) { setJoinError(data.error || 'Organización no encontrada.'); return; }
      setJoinOrg(data);
    } catch { setJoinError('Error al verificar. Intenta de nuevo.'); }
    finally { setJoinValidating(false); }
  };

  // Re-validar rol cuando cambia (si ya se validó la org)
  const handleJoinRoleChange = async (newRole) => {
    setJoinRole(newRole);
    if (!joinOrg?.valid) return;
    setJoinValidating(true); setJoinError('');
    try {
      const nit  = joinNit.replace(/[\s\-.]/g, '').toUpperCase();
      const res  = await fetch(`/api/auth/validate-join?nit=${encodeURIComponent(nit)}&role=${newRole}`);
      const data = await res.json();
      if (data.valid) setJoinOrg(data);
    } catch { /* silencioso */ }
    finally { setJoinValidating(false); }
  };

  const handleRegisterJoin = async (e) => {
    e.preventDefault();
    if (!joinOrg?.valid)             { setJoinError('Verifica el NIT de la organización.'); return; }
    if (joinOrg.roleAvailable === false) { setJoinError(joinOrg.reason); return; }
    setJoinLoading(true); setJoinError('');
    try {
      const res    = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...joinForm,
          type:     'join',
          role:     joinRole,
          orgCode:  joinNit,
          joinMode: true,
          attribution: getAttribution(),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error al crear la cuenta');
      trackEvent('sign_up', { method: 'join_org', plan: 'free', role: joinRole, ...attributionParams() });
      // Auto-login: ingresar directo y llevar al expediente para cargar documentos
      // de piloto (cédula, diploma, CIPU, médico…) — completar el perfil en la org.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: joinForm.email, password: joinForm.password });
      if (signInErr) { window.location.href = '/login?registered=1'; return; }
      window.location.href = '/dashboard/settings/profile?welcome=1';
    } catch (err) { setJoinError(err.message); }
    finally { setJoinLoading(false); }
  };

  // ── MODO SELECTION ─────────────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="flex min-h-screen bg-white">
        <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 overflow-y-auto">
          <div className="max-w-lg w-full mx-auto space-y-8 animate-in fade-in duration-300">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
              <span className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
            </Link>

            {/* Banner invitación de socio */}
            {socioInvite && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
                <span className="material-symbols-outlined text-orange-500 text-xl mt-0.5">handshake</span>
                <div>
                  <p className="text-sm font-black text-orange-800">
                    Invitación de {socioInvite.partner_type === 'escuela' ? 'escuela' : 'socio'}: <span className="text-orange-600">{socioInvite.partner_name}</span>
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Te han invitado como {socioInvite.role === 'owner' ? 'representante/dueño' : 'asesor de ventas'}. Al crear tu cuenta quedarás vinculado automáticamente.
                  </p>
                </div>
              </div>
            )}

            <div>
              <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Crear cuenta</h1>
              <p className="text-slate-500 text-sm mt-1">¿Cómo vas a usar Bitafly?</p>
            </div>

            <div className="space-y-4">
              {/* Opción 1: Nueva org / piloto independiente */}
              <button
                type="button"
                onClick={() => { trackEvent('begin_registration', { flow: 'crear' }); setMode('crear'); setCreateStep(1); setError(''); }}
                className="w-full p-6 rounded-3xl border-2 border-slate-200 hover:border-primary bg-white text-left transition-all group hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                    <span className="material-symbols-outlined text-2xl text-primary group-hover:text-white transition-colors">add_business</span>
                  </div>
                  <div>
                    <p className="font-black text-navy text-sm uppercase tracking-widest">Registrar mi cuenta</p>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Para <strong>pilotos independientes</strong> o <strong>gerentes generales</strong> que crean una organización nueva en Bitafly.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción 2: Unirse a org existente */}
              <button
                type="button"
                onClick={() => { trackEvent('begin_registration', { flow: 'unirse' }); setMode('unirse'); setJoinStep(1); setJoinError(''); }}
                className="w-full p-6 rounded-3xl border-2 border-slate-200 hover:border-blue-500 bg-white text-left transition-all group hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-blue-500 group-hover:text-white transition-colors">group_add</span>
                  </div>
                  <div>
                    <p className="font-black text-navy text-sm uppercase tracking-widest">Unirme a organización</p>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Para <strong>pilotos, jefes de pilotos o gerentes SMS</strong> que se unen a una empresa ya registrada. Ingresa el NIT de tu organización.
                    </p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Gratis — el gerente gestiona la suscripción
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline">Ingresar</Link>
            </p>
          </div>
        </main>
        <AuthSidePanel mode="register" />
      </div>
    );
  }

  // ── FLUJO UNIRSE ───────────────────────────────────────────────────────────
  if (mode === 'unirse') {
    return (
      <div className="flex min-h-screen bg-white">
        <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 overflow-y-auto">
          <div className="max-w-lg w-full mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 mb-8 lg:hidden">
              <span className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
            </Link>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {JOIN_STEPS.map((label, i) => {
                const n = i + 1;
                const done = joinStep > n;
                const active = joinStep === n;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0 ${done ? 'bg-blue-500 text-white' : active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? <span className="material-symbols-outlined text-sm">check</span> : n}
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest hidden sm:block ${active ? 'text-navy' : 'text-slate-400'}`}>{label}</span>
                    {i < JOIN_STEPS.length - 1 && <div className={`flex-1 h-px ${joinStep > n ? 'bg-blue-500' : 'bg-slate-200'}`} />}
                  </div>
                );
              })}
            </div>

            {/* Error */}
            {joinError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold mb-5">
                <span className="material-symbols-outlined text-base">error</span>
                {joinError}
              </div>
            )}

            {/* ── JOIN PASO 1: NIT + Rol ── */}
            {joinStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tu organización</h1>
                  <p className="text-slate-500 text-sm mt-1">Ingresa el NIT de la empresa y el rol que desempeñas.</p>
                </div>

                <Field label="NIT de la organización" required>
                  <div className="flex gap-2">
                    <input
                      placeholder="Ej: 900123456-7"
                      value={joinNit}
                      onChange={e => { setJoinNit(e.target.value); setJoinOrg(null); setJoinError(''); }}
                      className={`${INPUT} flex-1 font-mono font-black tracking-widest`}
                    />
                    <button
                      type="button"
                      onClick={validateJoin}
                      disabled={joinValidating || !joinNit}
                      className="px-4 py-2 rounded-2xl bg-navy text-white text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 shrink-0"
                    >
                      {joinValidating
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                        : 'Buscar'}
                    </button>
                  </div>
                  {joinOrg?.valid && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <div>
                        <p className="text-xs font-black text-emerald-700">{joinOrg.orgName}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Plan {joinOrg.plan} · NIT {joinOrg.orgCode}</p>
                      </div>
                    </div>
                  )}
                </Field>

                <Field label="Tu rol en la organización" required>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES_JOIN.map(r => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleJoinRoleChange(r.key)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                          joinRole === r.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-xl ${joinRole === r.key ? 'text-blue-500' : 'text-slate-400'}`}>
                          {r.icon}
                        </span>
                        <div>
                          <p className={`text-xs font-black uppercase ${joinRole === r.key ? 'text-blue-600' : 'text-navy'}`}>{r.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{r.sub}</p>
                        </div>
                        {joinOrg?.valid && joinRole === r.key && (
                          joinOrg.roleAvailable === false
                            ? <span className="ml-auto text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg">Ocupado</span>
                            : joinOrg.roleAvailable === true
                              ? <span className="ml-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                  {r.key === 'piloto' && joinOrg.slotsLeft ? `${joinOrg.slotsLeft} cupos` : 'Disponible'}
                                </span>
                              : null
                        )}
                      </button>
                    ))}
                  </div>
                  {joinOrg?.valid && joinOrg.roleAvailable === false && (
                    <p className="text-xs font-bold text-red-500 mt-1 px-1">{joinOrg.reason}</p>
                  )}
                </Field>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setMode(null)} className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => { setJoinError(''); setJoinStep(2); }}
                    disabled={!joinOrg?.valid || joinOrg?.roleAvailable === false}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ── JOIN PASO 2: Datos personales ── */}
            {joinStep === 2 && (
              <form onSubmit={handleRegisterJoin} className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tus datos</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    Créa tu acceso a <strong>{joinOrg?.orgName}</strong> como <strong>{ROLES_JOIN.find(r => r.key === joinRole)?.label}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nombre" required>
                    <input required placeholder="Carlos" value={joinForm.firstName} onChange={setJ('firstName')} className={INPUT} />
                  </Field>
                  <Field label="Apellido" required>
                    <input required placeholder="Rodríguez" value={joinForm.lastName} onChange={setJ('lastName')} className={INPUT} />
                  </Field>
                </div>

                <Field label="Correo electrónico" required>
                  <input required type="email" placeholder="correo@empresa.com" value={joinForm.email} onChange={setJ('email')} className={INPUT} />
                </Field>

                <Field label="Contraseña" required>
                  <div className="relative">
                    <input
                      required type={joinShowPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres" minLength={8}
                      value={joinForm.password} onChange={setJ('password')}
                      className={`${INPUT} pr-12`}
                    />
                    <button type="button" onClick={() => setJoinShowPass(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-xl">{joinShowPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Teléfono">
                    <input placeholder="+57 300 000 0000" value={joinForm.phone} onChange={setJ('phone')} className={INPUT} />
                  </Field>
                  <Field label="Ciudad">
                    <input placeholder="Bogotá" value={joinForm.city} onChange={setJ('city')} className={INPUT} />
                  </Field>
                </div>

                <p className="text-center text-xs text-slate-400 leading-relaxed">
                  Al registrarte aceptas nuestros{' '}
                  <a href="#" className="text-primary hover:underline">Términos de servicio</a>
                  {' '}y{' '}
                  <a href="#" className="text-primary hover:underline">Política de privacidad</a>.
                </p>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setJoinStep(1)} className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">
                    Atrás
                  </button>
                  <button type="submit" disabled={joinLoading} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {joinLoading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando cuenta...</>
                      : 'Crear cuenta'
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
        <AuthSidePanel mode="register" />
      </div>
    );
  }

  // ── FLUJO CREAR ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 overflow-y-auto">
        <div className="max-w-lg w-full mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
          </Link>

          {/* Progress — crear (oculto en flujo de invitación socio) */}
          {!socioInvite && <div className="flex items-center gap-2 mb-8">
            {CREATE_STEPS.map((label, i) => {
              const n = i + 1;
              const done   = createStep > n;
              const active = createStep === n;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0 ${done ? 'bg-primary text-white' : active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <span className="material-symbols-outlined text-sm">check</span> : n}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest hidden sm:block ${active ? 'text-navy' : 'text-slate-400'}`}>{label}</span>
                  {i < CREATE_STEPS.length - 1 && <div className={`flex-1 h-px ${createStep > n ? 'bg-primary' : 'bg-slate-200'}`} />}
                </div>
              );
            })}
          </div>}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold mb-5">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* ── CREAR PASO 1: Plan ── */}
          {createStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Elige tu plan</h1>
                <p className="text-slate-500 text-sm mt-1">Puedes cambiar de plan en cualquier momento.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PLANS.map(plan => (
                  <button key={plan.key} type="button"
                    onClick={() => { if (plan.contact) { window.location.href = '/#contacto'; return; } setVal('selectedPlan', plan.key); }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all ${form.selectedPlan === plan.key ? 'border-primary bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    {plan.popular && <span className="absolute -top-2.5 left-4 bg-primary text-white text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Popular</span>}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`material-symbols-outlined text-lg ${form.selectedPlan === plan.key ? 'text-primary' : 'text-slate-400'}`}>{plan.icon}</span>
                      <span className={`text-xs font-black uppercase tracking-widest ${form.selectedPlan === plan.key ? 'text-primary' : 'text-navy'}`}>{plan.name}</span>
                    </div>
                    <p className={`text-sm font-black ${form.selectedPlan === plan.key ? 'text-navy' : 'text-slate-700'}`}>{plan.price}</p>
                    <p className="text-xs text-slate-400 font-medium">{plan.sub}</p>
                    <p className={`text-xs font-black uppercase mt-1 ${form.selectedPlan === plan.key ? 'text-primary' : 'text-slate-400'}`}>{plan.limits}</p>
                    {plan.contact && <p className="text-xs text-primary font-bold mt-1">Contactar →</p>}
                  </button>
                ))}
              </div>

              {isPaidPlan && (
                <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                  {[{ key: 'monthly', label: 'Mensual' }, { key: 'annual', label: 'Anual (−20%)' }].map(b => (
                    <button key={b.key} type="button" onClick={() => setVal('billing', b.key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${form.billing === b.key ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={goNext} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                Continuar
              </button>

              <button type="button" onClick={() => setMode(null)} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                ← Volver
              </button>

              <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-primary hover:underline">Ingresar</Link>
              </p>
            </div>
          )}

          {/* ── CREAR PASO 2: Datos personales ── */}
          {createStep === 2 && (
            <form onSubmit={socioInvite ? handleRegisterFree : goNext} className="space-y-5 animate-in fade-in duration-300">

              {/* Banner invitación socio */}
              {socioInvite && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
                  <span className="material-symbols-outlined text-orange-500 text-xl mt-0.5">handshake</span>
                  <div>
                    <p className="text-sm font-black text-orange-800">
                      Invitación de {socioInvite.partner_type === 'escuela' ? 'escuela' : 'socio'}: <span className="text-orange-600">{socioInvite.partner_name}</span>
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Rol: <strong>{socioInvite.role === 'owner' ? 'Representante / Dueño' : 'Asesor de ventas'}</strong>. Al crear tu cuenta quedarás vinculado automáticamente.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tus datos</h1>
                <p className="text-slate-500 text-sm mt-1">Información de tu cuenta Bitafly.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required><input required placeholder="Carlos" value={form.firstName} onChange={set('firstName')} className={INPUT} /></Field>
                <Field label="Apellido" required><input required placeholder="Rodríguez" value={form.lastName} onChange={set('lastName')} className={INPUT} /></Field>
              </div>

              <Field label="Correo electrónico" required>
                <div className="relative">
                  <input required type="email" placeholder="correo@empresa.com"
                    value={socioInvite?.email ?? form.email} onChange={set('email')}
                    readOnly={emailLocked}
                    className={`${INPUT} ${emailLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
                  {emailLocked && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">lock</span>
                  )}
                </div>
                {emailLocked && <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">Correo fijo por la invitación — no se puede cambiar.</p>}
              </Field>

              {isPaidPlan && form.email && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">info</span>
                  <p className="text-xs font-bold text-amber-800">
                    Al pagar en ePayco, <strong>usa el mismo correo</strong>: <span className="font-mono">{form.email}</span>
                  </p>
                </div>
              )}

              <Field label="Contraseña" required>
                <div className="relative">
                  <input required type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" minLength={8} value={form.password} onChange={set('password')} className={`${INPUT} pr-12`} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono"><input placeholder="+57 300 000 0000" value={form.phone} onChange={set('phone')} className={INPUT} /></Field>
                <Field label="Ciudad"><input placeholder="Bogotá" value={form.city} onChange={set('city')} className={INPUT} /></Field>
              </div>

              {!emailLocked && (
                <Field label="Código de escuela / asesor (opcional)">
                  <input placeholder="Ej: EAC-XB12" value={partnerCode}
                    onChange={e => setPartnerCode(e.target.value.toUpperCase())} className={`${INPUT} font-mono`} />
                  <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">Si una escuela o asesor te recomendó BitaFly, ingresa su código.</p>
                </Field>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => socioInvite ? setMode(null) : setCreateStep(1)}
                  className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">Atrás</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando cuenta...</>
                    : socioInvite ? 'Crear cuenta y unirme' : 'Continuar'
                  }
                </button>
              </div>
            </form>
          )}

          {/* ── CREAR PASO 3: Información de la cuenta ── */}
          {createStep === 3 && (
            <form onSubmit={isPaidPlan ? handleInitiatePayment : handleRegisterFree} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tu cuenta</h1>
                <p className="text-slate-500 text-sm mt-1">
                  {isPaidPlan ? 'Datos de tu organización.' : '¿Cómo vas a operar?'}
                </p>
              </div>

              {!isPaidPlan && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'solo',    label: 'Piloto Independiente', sub: 'Opero por mi cuenta', icon: 'person' },
                    { key: 'company', label: 'Empresa / Organización', sub: 'Soy el gerente general', icon: 'business' },
                  ].map(t => (
                    <button key={t.key} type="button" onClick={() => setVal('type', t.key)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${form.type === t.key ? 'border-primary bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <span className={`material-symbols-outlined text-xl mb-1 block ${form.type === t.key ? 'text-primary' : 'text-slate-400'}`}>{t.icon}</span>
                      <p className={`text-xs font-black uppercase ${form.type === t.key ? 'text-primary' : 'text-navy'}`}>{t.label}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{t.sub}</p>
                    </button>
                  ))}
                </div>
              )}

              {(isPaidPlan || form.type === 'company') && (
                <div className="space-y-4">
                  <Field label="Nombre de la empresa" required>
                    <input required placeholder="Ej: Aerial Colombia S.A.S." value={form.companyName} onChange={set('companyName')} className={INPUT} />
                  </Field>
                  <Field label="NIT de la empresa" required>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
                      <input required placeholder="Ej: 900123456-7" value={form.nit} onChange={e => setVal('nit', e.target.value.replace(/\s/g, ''))} className={`${INPUT} pl-12 font-mono font-black tracking-widest`} />
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 px-1">El NIT será el código que comparte con su tripulación para que se unan.</p>
                  </Field>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateStep(2)} className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">Atrás</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isPaidPlan ? 'Preparando pago...' : 'Creando cuenta...'}</>
                    : isPaidPlan
                      ? <><span className="material-symbols-outlined text-lg">payment</span>Ir a pagar</>
                      : 'Crear cuenta'
                  }
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 leading-relaxed">
                Al registrarte aceptas nuestros{' '}
                <a href="#" className="text-primary hover:underline">Términos de servicio</a>
                {' '}y{' '}
                <a href="#" className="text-primary hover:underline">Política de privacidad</a>.
              </p>
            </form>
          )}

          {/* ── CREAR PASO 4: Esperando pago ── */}
          {createStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {payStatus === 'pending' && (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                      <span className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin block" />
                    </div>
                    <h1 className="font-lexend text-2xl font-black text-navy uppercase tracking-tighter">Esperando pago</h1>
                    <p className="text-slate-500 text-sm">
                      Completa el pago en la pestaña que se abrió.<br />
                      Tu cuenta se creará automáticamente al confirmar el pago.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">info</span>Importante
                    </p>
                    <p className="text-xs font-bold text-amber-700">
                      En ePayco usa el correo <span className="font-mono bg-amber-100 px-1 rounded">{form.email}</span> para que la activación sea automática.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={activatePending}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-60"
                    >
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...</>
                        : <><span className="material-symbols-outlined text-lg">verified</span>Ya pagué — verificar ahora</>
                      }
                    </button>
                    <button
                      onClick={() => { const planCfg = { escuadrilla: { monthly: 'a1dea39b3836c9ee300a1b4', annual: 'a1dea83a021a7cbb106d996' }, flota: { monthly: 'a1deab1b8bef2c21807e912', annual: 'a1deaea5d185a11c30a7419' } }; const uid = planCfg[form.selectedPlan]?.[form.billing]; if (uid) window.open(`https://subscription-landing.epayco.co/plan/${uid}`, '_blank', 'noopener'); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Abrir ventana de pago
                    </button>
                    <p className="text-center text-xs text-slate-400">Esta página también se actualiza automáticamente al confirmar el pago.</p>
                  </div>

                  <div className="border-t pt-4">
                    <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setCreateStep(3); setPendingRef(null); setError(''); }}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                      ← Volver a revisar mis datos
                    </button>
                  </div>
                </>
              )}

              {payStatus === 'completed' && (
                <div className="text-center space-y-5 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-4xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">¡Bienvenido a Bitafly!</h1>
                    <p className="text-slate-500 text-sm mt-2">
                      Tu cuenta está activa con el plan <strong>{PLANS.find(p => p.key === form.selectedPlan)?.name}</strong>.
                    </p>
                  </div>
                  <Link href="/login" className="block w-full bg-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all text-center">
                    Iniciar sesión
                  </Link>
                </div>
              )}

              {payStatus === 'expired' && (
                <div className="text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl text-red-400">timer_off</span>
                  </div>
                  <div>
                    <h1 className="font-lexend text-2xl font-black text-navy uppercase tracking-tighter">Sesión expirada</h1>
                    <p className="text-slate-500 text-sm mt-2">El tiempo de espera venció. Vuelve al inicio para intentar de nuevo.</p>
                  </div>
                  <button onClick={() => { setCreateStep(1); setForm(EMPTY_CREATE); setPendingRef(null); setPayStatus('pending'); }}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                    Comenzar de nuevo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <AuthSidePanel mode="register" />
    </div>
  );
}
