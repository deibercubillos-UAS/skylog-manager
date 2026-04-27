'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

const PLANS = [
  {
    key: 'piloto',
    name: 'Piloto',
    price: 'Gratis 6 meses',
    sub: 'luego $5 USD/mes',
    limits: '1 dron · 1 usuario',
    icon: 'person',
  },
  {
    key: 'escuadrilla',
    name: 'Escuadrilla',
    price: '$12 USD/mes',
    sub: 'facturado anualmente',
    limits: '3 drones · 4 usuarios',
    icon: 'group',
    popular: true,
  },
  {
    key: 'flota',
    name: 'Flota',
    price: '$29 USD/mes',
    sub: 'facturado anualmente',
    limits: '15 drones · 15 usuarios',
    icon: 'precision_manufacturing',
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

const STEPS = ['Plan', 'Datos', 'Cuenta'];

const EMPTY = {
  selectedPlan: 'piloto',
  firstName: '', lastName: '', email: '', password: '',
  phone: '', city: '',
  type: 'solo',
  role: 'admin',
  companyName: '',
  orgCode: '',
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setVal = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const goNext = (e) => {
    e?.preventDefault();
    setError('');
    setStep((s) => s + 1);
  };

  const handleRegister = async (e) => {
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
                <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Elige tu plan</h1>
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
                      <span className="absolute -top-2.5 left-4 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
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
                    <p className="text-[11px] text-slate-400 font-medium">{plan.sub}</p>
                    <p className={`text-[11px] font-black uppercase mt-1 ${form.selectedPlan === plan.key ? 'text-primary' : 'text-slate-400'}`}>
                      {plan.limits}
                    </p>
                    {plan.contact && (
                      <p className="text-[11px] text-primary font-bold mt-1">Contactar →</p>
                    )}
                  </button>
                ))}
              </div>

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
                <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Tus datos</h1>
                <p className="text-slate-500 text-sm mt-1">Información de tu cuenta Bitafly.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required>
                  <input required placeholder="Carlos" value={form.firstName} onChange={set('firstName')}
                    className={INPUT} />
                </Field>
                <Field label="Apellido" required>
                  <input required placeholder="Rodríguez" value={form.lastName} onChange={set('lastName')}
                    className={INPUT} />
                </Field>
              </div>

              <Field label="Correo electrónico" required>
                <input required type="email" placeholder="correo@empresa.com" value={form.email} onChange={set('email')}
                  className={INPUT} />
              </Field>

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
                    <span className="material-symbols-outlined text-xl">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <input placeholder="+57 300 000 0000" value={form.phone} onChange={set('phone')}
                    className={INPUT} />
                </Field>
                <Field label="Ciudad">
                  <input placeholder="Bogotá" value={form.city} onChange={set('city')}
                    className={INPUT} />
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
            <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Tu cuenta</h1>
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
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t.sub}</p>
                  </button>
                ))}
              </div>

              {/* Solo */}
              {form.type === 'solo' && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed">
                  <p className="font-black text-navy text-xs uppercase tracking-widest mb-1">
                    Plan {PLANS.find(p => p.key === form.selectedPlan)?.name}
                  </p>
                  Se creará tu perfil como Piloto Independiente. Podrás unirte a una organización en cualquier momento con el código de tu empresa.
                </div>
              )}

              {/* Empresa */}
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
                    <Field label="Nombre de la empresa" required>
                      <input required placeholder="Ej: Aerial Colombia S.A.S." value={form.companyName} onChange={set('companyName')}
                        className={INPUT} />
                    </Field>
                  ) : (
                    <div className="space-y-2">
                      <Field label="Código de organización (opcional)">
                        <input
                          placeholder="Ej: ORG-XXXX"
                          value={form.orgCode}
                          onChange={set('orgCode')}
                          className={`${INPUT} uppercase font-black text-center tracking-widest text-primary placeholder:text-slate-300 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal`}
                        />
                      </Field>
                      <p className="text-[11px] text-slate-400 font-medium px-1">
                        Opcional — si no tienes el código ahora, tu administrador puede invitarte después desde el panel.
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
                      Creando cuenta...
                    </>
                  ) : 'Crear cuenta'}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                Al registrarte aceptas nuestros{' '}
                <a href="#" className="text-primary hover:underline">Términos de servicio</a>
                {' '}y{' '}
                <a href="#" className="text-primary hover:underline">Política de privacidad</a>.
              </p>
            </form>
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
