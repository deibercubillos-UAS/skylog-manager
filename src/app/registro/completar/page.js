'use client';

// Skylog V2.0 — completar el registro tras entrar con Google por primera vez (Etapa D). Ya hay sesión y correo
// verificado; falta saber a qué empresa pertenece: registrar la suya o unirse a una por NIT.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getAttribution } from '@/lib/attribution';
import { validateRegistration, validateJoinRegistration } from '@skylog/domain';
import JoinByNit from '../../(v2)/_components/JoinByNit';

const inputCls = 'w-full min-h-[48px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base md:text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all';
const labelCls = 'text-xs font-black text-slate-500 uppercase tracking-widest';
const PLACEHOLDER = 'Aa1' + 'x'.repeat(12); // solo satisface la validación compartida; el servidor ignora la contraseña

function Row({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function CompletarRegistroPage() {
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', companyName: '', nit: '', role: '', acceptedTerms: false });
  const [mode, setMode] = useState('crear');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setEmail(user.email || '');
      const full = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
      const [first, ...rest] = full.split(/\s+/);
      setForm((f) => ({ ...f, firstName: first || '', lastName: rest.join(' ') }));
      setReady(true);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    const input = { ...form, email, password: PLACEHOLDER };
    const check = mode === 'unirme' ? validateJoinRegistration(input) : validateRegistration(input);
    if (!check.ok) return setErrors(check.errors);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch('/api/alta/completar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, mode, attribution: getAttribution() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar el registro.');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/inicio';
    } catch (err) {
      setErrors([err.message]);
      setBusy(false);
    }
  }

  if (!ready) return <main className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando…</main>;

  return (
    <main className="min-h-screen bg-white flex flex-col justify-center px-6 py-10">
      <div className="max-w-lg w-full mx-auto">
        <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Completa tu registro</h1>
        <p className="text-slate-500 text-sm mt-1 mb-6">Entraste con Google como <b>{email}</b>. Falta saber a qué empresa perteneces.</p>

        <div role="tablist" aria-label="Tipo de registro" className="grid grid-cols-2 gap-2 mb-6">
          {[['crear', 'Registrar mi empresa'], ['unirme', 'Unirme a una empresa']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => { setMode(key); setErrors([]); }}
              className={`min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wide border transition-colors ${mode === key ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Row label="Nombres"><input className={inputCls} autoComplete="given-name" value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} required /></Row>
            <Row label="Apellidos"><input className={inputCls} autoComplete="family-name" value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} required /></Row>
          </div>
          <Row label="Teléfono (opcional)"><input className={inputCls} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Row>
          {mode === 'crear' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Row label="Empresa u organización"><input className={inputCls} autoComplete="organization" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} required /></Row>
              <Row label="NIT o documento"><input className={inputCls} placeholder="900.123.456-7" value={form.nit} onChange={(e) => set({ nit: e.target.value })} required /></Row>
            </div>
          ) : (
            <JoinByNit nit={form.nit} role={form.role} onNit={(nit) => set({ nit })} onRole={(role) => set({ role })} inputClass={inputCls} />
          )}
          <label className="flex items-start gap-3 text-xs text-slate-500 py-1">
            <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0 accent-primary" checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} />
            <span>
              Acepto los <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">términos y condiciones</a> y la{' '}
              <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">política de privacidad</a>.
            </span>
          </label>
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold space-y-1" role="alert">
              {errors.map((m) => <p key={m}>{m}</p>)}
            </div>
          )}
          <button type="submit" disabled={busy} className="w-full min-h-[52px] bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? 'Guardando…' : mode === 'crear' ? 'Crear mi empresa (15 días gratis)' : 'Unirme'}
          </button>
        </form>
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">
          <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="text-primary hover:underline min-h-[44px]">Usar otra cuenta</button>
          {' · '}<Link href="/" className="hover:underline">Inicio</Link>
        </p>
      </div>
    </main>
  );
}
