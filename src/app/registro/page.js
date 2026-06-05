'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

const PLANS = [
  {
    key: 'piloto',
    name: 'Piloto',
    price: 'Gratis 1 mes',
    sub: 'luego $20.000/mes',
    limits: '1 dron · 1 usuario',
    icon: 'person',
  },
  {
    key: 'escuadrilla',
    name: 'Escuadrilla',
    price: '$59.000/mes',
    sub: 'o $590.000/año (−20%)',
    limits: '3 drones · 4 usuarios',
    icon: 'group',
    popular: true,
    paid: true,
  },
  {
    key: 'flota',
    name: 'Flota',
    price: '$159.000/mes',
    sub: 'o $1.590.000/año (−20%)',
    limits: '15 drones · 15 usuarios',
    icon: 'precision_manufacturing',
    paid: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'A consultar',
    sub: 'contactar ventas',
    limits: 'Ilimitado',
    icon: 'rocket_launch',
    contact: true,
  },
];

// Pasos: para plan gratuito son 3, para planes de pago se agrega el paso 4 (pago)
const STEPS_FREE = ['Plan', 'Datos', 'Cuenta'];
const STEPS_PAID = ['Plan', 'Datos', 'Cuenta', 'Pago'];

const EMPTY = {
  selectedPlan: 'piloto',
  billing: 'monthly',
  firstName: '', lastName: '', email: '', password: '',
  phone: '', city: '',
  type: 'solo',
  role: 'admin',
  companyName: '',
  nit: '',
  orgCode: '',
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para el flujo de pago
  const [pendingRef, setPendingRef] = useState(null);   // reference del pending_registration
  const [epaycoTab, setEpaycoTab] = useState(null);     // referencia a la pestaña abierta
  const [payStatus, setPayStatus] = useState('pending'); // 'pending' | 'completed' | 'expired'
  const pollRef = useRef(null);

  const isPaidPlan = PLANS.find(p => p.key === form.selectedPlan)?.paid ?? false;
  const STEPS = isPaidPlan ? STEPS_PAID : STEPS_FREE;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setVal = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const goNext = (e) => {
    e?.preventDefault();
    setError('');
    setStep((s) => s + 1);
  };

  // Limpieza del polling al desmontar
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = (ref) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/register-status?ref=${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setPayStatus('completed');
        } else if (data.status === 'expired' || data.status === 'not_found') {
          clearInterval(pollRef.current);
          setPayStatus('expired');
        }
      } catch {/* silencioso */}
    }, 5000);
  };

  // Para plan gratuito (piloto): crear cuenta directamente
  const handleRegisterFree = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error al registrar');
      window.location.href = '/login?registered=1';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Para planes de pago: guardar pending + abrir ePayco en nueva pestaña
  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el pago');

      // Avanzar al paso 4 (pantalla de espera)
      setPendingRef(data.reference);
      setStep(4);

      // Abrir ePayco en nueva pestaña
      const tab = window.open(data.epaycoUrl, '_blank', 'noopener');
      setEpaycoTab(tab);

      // Iniciar polling de estado
      startPolling(data.reference);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reopenPaymentTab = async () => {
    if (!pendingRef) return;
    const res = await fetch(`/api/auth/register-status?ref=${encodeURIComponent(pendingRef)}`);
    const data = await res.json();
    // Recalcular URL por el plan/billing del form
    const planCfg = {
      escuadrilla: { monthly: 'a1dea39b3836c9ee300a1b4', annual: 'a1dea83a021a7cbb106d996' },
      flota:       { monthly: 'a1deab1b8bef2c21807e912', annual: 'a1deaea5d185a11c30a7419' },
    };
    const uid = planCfg[form.selectedPlan]?.[form.billing];
    if (uid) window.open(`https://subscription-landing.epayco.co/plan/${uid}`, '_blank', 'noopener');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Formulario */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 overflow-y-auto">
        <div className="max-w-lg w-full mx-auto">

          {/* Logo móvil */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
          </Link>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0
                    ${done ? 'bg-primary text-white' : active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {done
                      ? <span className="material-symbols-outlined text-sm">check</span>
                      : n}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest hidden sm:block ${active ? 'text-navy' : 'text-slate-400'}`}>
                    {label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px ${step > n ? 'bg-primary' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold mb-5">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* ── PASO 1: Plan ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Elige tu plan</h1>
                <p className="text-slate-500 text-sm mt-1">Puedes cambiar de plan en cualquier momento.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => {
                      if (plan.contact) { window.location.href = '/#contacto'; return; }
                      setVal('selectedPlan', plan.key);
                    }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                      form.selectedPlan === plan.key
                        ? 'border-primary bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-4 bg-primary text-white text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`material-symbols-outlined text-lg ${form.selectedPlan === plan.key ? 'text-primary' : 'text-slate-400'}`}>
                        {plan.icon}
                      </span>
                      <span className={`text-xs font-black uppercase tracking-widest ${form.selectedPlan === plan.key ? 'text-primary' : 'text-navy'}`}>
                        {plan.name}
                      </span>
                    </div>
                    <p className={`text-sm font-black ${form.selectedPlan === plan.key ? 'text-navy' : 'text-slate-700'}`}>
                      {plan.price}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">{plan.sub}</p>
                    <p className={`text-xs font-black uppercase mt-1 ${form.selectedPlan === plan.key ? 'text-primary' : 'text-slate-400'}`}>
                      {plan.limits}
                    </p>
                    {plan.contact && (
                      <p className="text-xs text-primary font-bold mt-1">Contactar →</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Selector mensual / anual para planes de pago */}
              {isPaidPlan && (
                <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                  {[
                    { key: 'monthly', label: 'Mensual' },
                    { key: 'annual',  label: 'Anual (−20%)' },
                  ].map(b => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setVal('billing', b.key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                        form.billing === b.key
                          ? 'bg-white text-navy shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={goNext}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
              >
                Continuar
              </button>

              <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-primary hover:underline">Ingresar</Link>
              </p>
            </div>
          )}

          {/* ── PASO 2: Datos personales ── */}
          {step === 2 && (
            <form onSubmit={goNext} className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tus datos</h1>
                <p className="text-slate-500 text-sm mt-1">Información de tu cuenta Bitafly.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required>
                  <input required placeholder="Carlos" value={form.firstName} onChange={set('firstName')} className={INPUT} />
                </Field>
                <Field label="Apellido" required>
                  <input required placeholder="Rodríguez" value={form.lastName} onChange={set('lastName')} className={INPUT} />
                </Field>
              </div>

              <Field label="Correo electrónico" required>
                <input required type="email" placeholder="correo@empresa.com" value={form.email} onChange={set('email')} className={INPUT} />
              </Field>

              {/* Para planes de pago, recordar usar el mismo email en ePayco */}
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
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    value={form.password}
                    onChange={set('password')}
                    className={`${INPUT} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Mostrar/ocultar contraseña"
                  >
                    <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <input placeholder="+57 300 000 0000" value={form.phone} onChange={set('phone')} className={INPUT} />
                </Field>
                <Field label="Ciudad">
                  <input placeholder="Bogotá" value={form.city} onChange={set('city')} className={INPUT} />
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">
                  Atrás
                </button>
                <button type="submit"
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                  Continuar
                </button>
              </div>
            </form>
          )}

          {/* ── PASO 3: Organización ── */}
          {step === 3 && (
            <form onSubmit={isPaidPlan ? handleInitiatePayment : handleRegisterFree} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">Tu cuenta</h1>
                <p className="text-slate-500 text-sm mt-1">¿Cómo vas a usar Bitafly?</p>
              </div>

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'solo', label: 'Piloto Independiente', sub: 'Opero por mi cuenta', icon: 'person' },
                  { key: 'company', label: 'Empresa / Organización', sub: 'Formo parte de un equipo', icon: 'business' },
                ].map((t) => (
                  <button key={t.key} type="button" onClick={() => setVal('type', t.key)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      form.type === t.key ? 'border-primary bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl mb-1 block ${form.type === t.key ? 'text-primary' : 'text-slate-400'}`}>
                      {t.icon}
                    </span>
                    <p className={`text-xs font-black uppercase ${form.type === t.key ? 'text-primary' : 'text-navy'}`}>{t.label}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{t.sub}</p>
                  </button>
                ))}
              </div>

              {form.type === 'solo' && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed">
                  <p className="font-black text-navy text-xs uppercase tracking-widest mb-1">
                    Plan {PLANS.find(p => p.key === form.selectedPlan)?.name}
                  </p>
                  Se creará tu perfil como Piloto Independiente. Podrás unirte a una organización con el código de tu empresa.
                </div>
              )}

              {form.type === 'company' && (
                <div className="space-y-4">
                  <Field label="Tu rol en la empresa">
                    <select value={form.role} onChange={set('role')} className={INPUT}>
                      <option value="admin">Gerente General (crea la empresa)</option>
                      <option value="jefe_pilotos">Jefe de Pilotos</option>
                      <option value="gerente_sms">Gerente SMS</option>
                      <option value="piloto">Piloto</option>
                    </select>
                  </Field>

                  {form.role === 'admin' ? (
                    <div className="space-y-4">
                      <Field label="Nombre de la empresa" required>
                        <input required placeholder="Ej: Aerial Colombia S.A.S." value={form.companyName} onChange={set('companyName')} className={INPUT} />
                      </Field>
                      <Field label="NIT de la empresa" required>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
                          <input
                            required
                            placeholder="Ej: 900123456-7"
                            value={form.nit}
                            onChange={(e) => setVal('nit', e.target.value.replace(/\s/g, ''))}
                            className={`${INPUT} pl-12 font-mono font-black tracking-widest`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1.5 px-1">
                          El NIT será el código de acceso que comparte con su tripulación.
                        </p>
                      </Field>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Field label="NIT de la organización (código de acceso)">
                        <input
                          placeholder="Ej: 900123456-7"
                          value={form.orgCode}
                          onChange={set('orgCode')}
                          className={`${INPUT} font-mono font-black text-center tracking-widest text-primary placeholder:text-slate-300 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal`}
                        />
                      </Field>
                      <p className="text-xs text-slate-400 font-medium px-1">
                        Opcional — si no tienes el NIT ahora, tu administrador puede invitarte después.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)}
                  className="px-6 py-4 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 hover:border-slate-400 transition-all">
                  Atrás
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isPaidPlan ? 'Preparando pago...' : 'Creando cuenta...'}
                    </>
                  ) : isPaidPlan ? (
                    <>
                      <span className="material-symbols-outlined text-lg">payment</span>
                      Ir a pagar
                    </>
                  ) : 'Crear cuenta'}
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

          {/* ── PASO 4: Esperando pago (solo planes de pago) ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {payStatus === 'pending' && (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                      <span className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin block" />
                    </div>
                    <h1 className="font-lexend text-2xl font-black text-navy uppercase tracking-tighter">Esperando pago</h1>
                    <p className="text-slate-500 text-sm">
                      Completa el pago en la pestaña que se abrió. <br />
                      Tu cuenta se creará automáticamente al confirmar el pago.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">info</span>
                      Importante
                    </p>
                    <p className="text-xs font-bold text-amber-700">
                      En ePayco, usa el correo <span className="font-mono bg-amber-100 px-1 rounded">{form.email}</span> para que tu cuenta se active correctamente.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={reopenPaymentTab}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                      Abrir ventana de pago
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      Esta página se actualizará automáticamente cuando el pago sea confirmado.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <button
                      onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep(3); setPendingRef(null); }}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      ← Volver a revisar mis datos
                    </button>
                  </div>
                </>
              )}

              {payStatus === 'completed' && (
                <div className="text-center space-y-5 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-4xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                  <div>
                    <h1 className="font-lexend text-3xl font-black text-navy uppercase tracking-tighter">¡Bienvenido a Bitafly!</h1>
                    <p className="text-slate-500 text-sm mt-2">
                      Tu cuenta está activa con el plan <strong>{PLANS.find(p => p.key === form.selectedPlan)?.name}</strong>.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="block w-full bg-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all text-center"
                  >
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
                  <button
                    onClick={() => { setStep(1); setForm(EMPTY); setPendingRef(null); setPayStatus('pending'); }}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
                  >
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
