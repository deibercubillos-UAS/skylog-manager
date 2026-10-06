'use client';

// Skylog V2.0 — Crear cuenta de explotador (Etapa A de docs/skylog-v2/44-alta-y-socios.md).
// REEMPLAZA a la página de registro de v1 SOLO en la rama develop-v2 (la de `main` sigue intacta): aquella
// escribía en `profiles`/`organization_members`, que V2 no tiene. Cuenta primero con prueba gratuita de 15 días
// (plan Piloto); el plan de pago se elige después en /suscripcion. Unirse a una organización por NIT, invitaciones y
// regalos de socios son las Etapas B, C y E: todavía no están en esta pantalla.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { getAttribution } from '@/lib/attribution';
import { validateRegistration, validateJoinRegistration } from '@skylog/domain';
import JoinByNit from '../(v2)/_components/JoinByNit';
import AuthSidePanel from '@/components/AuthSidePanel';

const inputCls = 'w-full min-h-[48px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base md:text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all';
const labelCls = 'text-xs font-black text-slate-500 uppercase tracking-widest';

const EMPTY = { firstName: '', lastName: '', email: '', password: '', phone: '', companyName: '', nit: '', role: '', acceptedTerms: false, website: '' };

function Row({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function RegistroPage() {
  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState('crear'); // crear (mi empresa) | unirme (a una empresa existente)

  useEffect(() => {
    setMounted(true);
    if (new URLSearchParams(window.location.search).get('modo') === 'unirme') setMode('unirme');
  }, []);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    const joining = mode === 'unirme';
    const check = joining ? validateJoinRegistration(form) : validateRegistration(form); // las mismas reglas que valida el servidor
    if (!check.ok) return setErrors(check.errors);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(joining ? '/api/alta/unirse' : '/api/alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, attribution: getAttribution() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar el registro.');
      // Cuenta creada y confirmada: se inicia sesión de una vez y se entra al panel.
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
      if (error) {
        window.location.href = '/login';
        return;
      }
      window.location.href = '/inicio';
    } catch (err) {
      setErrors([err.message]);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-10">
        <div className={`max-w-lg w-full mx-auto transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <Link href="/" className="inline-flex items-center gap-2 mb-8 lg:hidden">
            <Image src="/logo.png" alt="" width={32} height={28} className="h-7 w-auto" priority />
            <span className="text-xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
          </Link>

          <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Crear cuenta</h1>

          <div role="tablist" aria-label="Tipo de registro" className="grid grid-cols-2 gap-2 mt-4 mb-6">
            {[['crear', 'Registrar mi empresa'], ['unirme', 'Unirme a una empresa']].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => { setMode(key); setErrors([]); }}
                className={`min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wide border transition-colors ${mode === key ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'crear' ? (
              <>Prueba BitaFly <b>15 días gratis</b>, sin tarjeta. Tú y tu empresa quedan registrados como administradores.</>
            ) : (
              <>Para tripulantes de una empresa que ya usa BitaFly: entras con su NIT y tu rol. Es <b>gratis</b>: el plan lo paga la empresa.</>
            )}
          </p>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Row label="Nombres">
                <input className={inputCls} autoComplete="given-name" value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
              </Row>
              <Row label="Apellidos">
                <input className={inputCls} autoComplete="family-name" value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
              </Row>
            </div>
            <Row label="Correo electrónico">
              <input className={inputCls} type="email" autoComplete="email" placeholder="correo@empresa.com" value={form.email} onChange={(e) => set({ email: e.target.value })} required />
            </Row>
            <Row label="Contraseña">
              <div className="relative">
                <input className={`${inputCls} pr-12`} type={showPass ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8, con letras y números" value={form.password} onChange={(e) => set({ password: e.target.value })} required />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 min-h-[44px] px-1" aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </Row>
            <Row label="Teléfono (opcional)">
              <input className={inputCls} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Row>
            {mode === 'crear' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Row label="Empresa u organización">
                  <input className={inputCls} autoComplete="organization" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} required />
                </Row>
                <Row label="NIT o documento">
                  <input className={inputCls} inputMode="text" placeholder="900.123.456-7" value={form.nit} onChange={(e) => set({ nit: e.target.value })} required />
                </Row>
              </div>
            ) : (
              <JoinByNit nit={form.nit} role={form.role} onNit={(nit) => set({ nit })} onRole={(role) => set({ role })} inputClass={inputCls} />
            )}

            {/* Campo trampa: las personas no lo ven; un robot suele llenarlo. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>
                No llenes este campo
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set({ website: e.target.value })} />
              </label>
            </div>

            <label className="flex items-start gap-3 text-xs text-slate-500 py-1">
              <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0 accent-primary" checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} />
              <span>
                Acepto los{' '}
                <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">términos y condiciones</a> y la{' '}
                <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">política de privacidad</a>.
              </span>
            </label>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold space-y-1" role="alert">
                {errors.map((m) => (
                  <p key={m}>{m}</p>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[52px] bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando tu cuenta…
                </>
              ) : mode === 'crear' ? (
                'Crear cuenta gratis'
              ) : (
                'Crear cuenta y unirme'
              )}
            </button>
          </form>

          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>

      <AuthSidePanel mode="register" />
    </div>
  );
}
