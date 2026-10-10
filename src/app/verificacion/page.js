'use client';

// Skylog V2.0 — verificación en dos pasos (TOTP) para el superadmin de la plataforma. Dos casos en la misma pantalla:
// ya tiene un autenticador → pide el código de 6 dígitos; es la primera vez → muestra el QR para configurarlo y
// confirma con el primer código. El servidor (`requireSuperadmin` y el layout de /admin) exige que la sesión sea aal2.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const safeNext = () => {
  const n = new URLSearchParams(window.location.search).get('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/admin/plataforma';
};

export default function VerificacionPage() {
  const [mode, setMode] = useState('loading'); // loading | challenge | enroll
  const [factorId, setFactorId] = useState(null);
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?next=' + encodeURIComponent('/verificacion?next=' + safeNext());
        return;
      }
      const { data, error: e } = await supabase.auth.mfa.listFactors();
      if (e) { setError(e.message); setMode('challenge'); return; }
      const verified = (data?.totp || []).find((f) => f.status === 'verified');
      if (verified) { setFactorId(verified.id); setMode('challenge'); return; }
      // Un alta a medias (factor sin verificar) estorba al crear el nuevo: se descarta.
      for (const f of data?.all || []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Skylog superadmin' });
      if (enrolled.error) { setError(enrolled.error.message); setMode('enroll'); return; }
      setFactorId(enrolled.data.id);
      setQr(enrolled.data.totp.qr_code);
      setSecret(enrolled.data.totp.secret);
      setMode('enroll');
    })();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    if (err) {
      setError(err.message.toLowerCase().includes('invalid') ? 'Código incorrecto o vencido. Intenta con el siguiente.' : err.message);
      setBusy(false);
      return;
    }
    window.location.href = safeNext();
  }

  return (
    <main className="min-h-screen bg-[#f8f6f6] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">Verificación en dos pasos</h1>
        {mode === 'loading' && <p className="mt-4 text-sm text-slate-500">Cargando…</p>}
        {mode === 'enroll' && (
          <p className="mt-2 text-sm text-slate-600">
            Para entrar al panel de la plataforma, configura una app autenticadora (Google Authenticator, Authy, 1Password…): escanea el código y escribe el que te muestre.
          </p>
        )}
        {mode === 'challenge' && <p className="mt-2 text-sm text-slate-600">Escribe el código de 6 dígitos de tu app autenticadora.</p>}
        {mode === 'enroll' && qr && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR para tu app autenticadora" className="w-44 h-44" />
            <p className="text-xs text-slate-500 text-center">¿No puedes escanear? Escribe esta clave en la app:</p>
            <code className="text-xs bg-slate-100 rounded px-2 py-1 break-all select-all">{secret}</code>
          </div>
        )}
        {mode !== 'loading' && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.4em] rounded-xl border border-slate-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Código de verificación"
            />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button disabled={busy || code.replace(/\s/g, '').length < 6 || !factorId} className="w-full rounded-xl bg-orange-600 text-white font-semibold py-3 disabled:opacity-50">
              {busy ? 'Verificando…' : mode === 'enroll' ? 'Activar y entrar' : 'Verificar'}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-slate-400">Si pierdes tu autenticador, un administrador de Supabase puede quitar el factor desde el panel de Auth.</p>
      </div>
    </main>
  );
}
