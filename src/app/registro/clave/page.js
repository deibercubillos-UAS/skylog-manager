'use client';

// Skylog V2.0 — define la contraseña tras confirmar el correo del registro (`/auth/confirmar` ya dejó la sesión).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';
import { toast } from '@/lib/toast';
import { passwordProblem } from '@skylog/domain';

export default function DefinirClavePage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data?.user);
      setChecking(false);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return toast.error(problem);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message === 'Auth session missing!' ? 'El enlace expiró o no es válido. Pide uno nuevo desde el registro.' : 'Error: ' + error.message);
      setLoading(false);
      return;
    }
    window.location.href = '/inicio'; // el panel envía a /solicitud-pendiente a quien aún no tiene organización
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Tu correo quedó confirmado." />
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Define tu contraseña</h2>
          {!checking && !hasSession ? (
            <p className="text-slate-500 mb-8 font-medium">El enlace expiró o no es válido. <a href="/registro" className="text-[#ec5b13] font-bold underline">Pide uno nuevo desde el registro</a>.</p>
          ) : (
            <>
              <p className="text-slate-500 mb-8 font-medium">Con ella ingresarás a BitaFly. Mínimo 8 caracteres, con letras y números.</p>
              <form onSubmit={submit} className="space-y-6">
                <input required type="password" minLength="8" autoComplete="new-password" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Tu contraseña" onChange={(e) => setPassword(e.target.value)} />
                <button type="submit" disabled={loading || checking} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all disabled:opacity-60">
                  {loading ? 'Guardando…' : 'Guardar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
