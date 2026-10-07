'use client';

// Skylog V2.0 — página PÚBLICA de una invitación (Etapa C de docs/skylog-v2/44-alta-y-socios.md). Tres caminos según
// quién abre el enlace: (1) con sesión y el correo de la invitación → un botón «Aceptar»; (2) sin sesión pero el
// correo ya tiene cuenta → «Inicia sesión» y vuelve aquí; (3) sin cuenta → crea la suya (el correo viene bloqueado).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { validateRegistration } from '@skylog/domain';

const inputCls = 'w-full min-h-[48px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base md:text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100';
const labelCls = 'text-xs font-black text-slate-500 uppercase tracking-widest';

export default function InvitacionPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null); // { state, ... } | { error }
  const [sessionEmail, setSessionEmail] = useState(undefined); // undefined = consultando · null = sin sesión
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', phone: '', acceptedTerms: false });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invitaciones/${token}`);
        setInfo(await res.json());
      } catch {
        setInfo({ error: 'No se pudo consultar la invitación. Revisa tu conexión.' });
      }
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data?.session?.user?.email?.toLowerCase() || null);
    })();
  }, [token]);

  async function accept(e) {
    e?.preventDefault();
    setErrors([]);
    if (sessionEmail === null) {
      // Misma validación que el servidor para los campos de la cuenta nueva (el correo lo fija la invitación).
      const check = validateRegistration({ ...form, email: info.email, companyName: 'x', nit: '00000' });
      const own = check.errors.filter((m) => !/empresa|NIT|correo/i.test(m));
      if (own.length) return setErrors(own);
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/invitaciones/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionEmail === null ? form : {}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo aceptar la invitación.');
      if (sessionEmail === null) {
        const { error } = await supabase.auth.signInWithPassword({ email: info.email, password: form.password });
        if (error) return void (window.location.href = '/login');
      }
      window.location.href = '/inicio';
    } catch (err) {
      setErrors([err.message]);
      setBusy(false);
    }
  }

  const wrong = sessionEmail && info?.email && sessionEmail !== info.email.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-primary text-center">Invitación</p>

        {!info || sessionEmail === undefined ? (
          <p className="text-sm text-slate-400 text-center mt-6">Verificando…</p>
        ) : info.state !== 'usable' ? (
          <div className="text-center mt-4 space-y-4">
            <h1 className="text-xl font-black text-navy">{info.message || info.error || 'No se pudo abrir la invitación'}</h1>
            <Link href="/login" className="inline-block text-sm font-bold text-primary underline min-h-[44px] leading-[44px]">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <div className="mt-2">
            <h1 className="text-2xl font-black text-navy text-center">{info.organizationName}</h1>
            <p className="text-sm text-slate-500 text-center mt-2 mb-6">
              Te invitaron a unirte como <b>{info.roleLabel}</b>. Entrar es <b>gratis</b>: el plan lo paga la organización.
            </p>

            {wrong ? (
              <div className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm space-y-3">
                <p>Esta invitación es para <b>{info.email}</b>, pero tienes la sesión abierta como <b>{sessionEmail}</b>.</p>
                <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="font-bold underline min-h-[44px]">Cerrar sesión y continuar</button>
              </div>
            ) : sessionEmail ? (
              <button type="button" onClick={accept} disabled={busy} className="w-full min-h-[52px] bg-primary text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-60">
                {busy ? 'Aceptando…' : 'Aceptar invitación'}
              </button>
            ) : info.hasAccount ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-600">Ya tienes una cuenta con <b>{info.email}</b>. Inicia sesión para aceptar.</p>
                <Link href={`/login?next=${encodeURIComponent(`/invitacion/${token}`)}`} className="block w-full min-h-[52px] leading-[52px] bg-primary text-white rounded-2xl font-black uppercase tracking-widest">Iniciar sesión</Link>
              </div>
            ) : (
              <form onSubmit={accept} className="space-y-4" noValidate>
                <label className="block space-y-1.5">
                  <span className={labelCls}>Tu correo</span>
                  <input className={`${inputCls} bg-slate-100 text-slate-500`} value={info.email} readOnly />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className={labelCls}>Nombres</span>
                    <input className={inputCls} autoComplete="given-name" value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
                  </label>
                  <label className="block space-y-1.5">
                    <span className={labelCls}>Apellidos</span>
                    <input className={inputCls} autoComplete="family-name" value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className={labelCls}>Contraseña</span>
                  <input className={inputCls} type="password" autoComplete="new-password" placeholder="Mínimo 8, con letras y números" value={form.password} onChange={(e) => set({ password: e.target.value })} required />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelCls}>Teléfono (opcional)</span>
                  <input className={inputCls} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </label>
                <label className="flex items-start gap-3 text-xs text-slate-500 py-1">
                  <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0 accent-primary" checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} />
                  <span>
                    Acepto los <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">términos y condiciones</a> y la{' '}
                    <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">política de privacidad</a>.
                  </span>
                </label>
                <button type="submit" disabled={busy} className="w-full min-h-[52px] bg-primary text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-60">
                  {busy ? 'Creando tu cuenta…' : 'Crear cuenta y unirme'}
                </button>
              </form>
            )}

            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold space-y-1" role="alert">
                {errors.map((m) => (
                  <p key={m}>{m}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
