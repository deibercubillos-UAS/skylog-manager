'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';
import { toast } from '@/lib/toast';
import { passwordProblem } from '@skylog/domain';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // El enlace del correo trae la sesión de recuperación en la URL: como tokens en el `#` (flujo implícito, el que
  // genera /api/auth/reset-request) o como `?code=` (PKCE). El cliente del navegador usa PKCE y NO lee los tokens
  // del `#` por su cuenta, así que se establecen aquí de forma explícita; si no, "Auth session missing".
  useEffect(() => {
    (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = new URLSearchParams(window.location.search).get('code');
        if (hash.get('access_token') && hash.get('refresh_token')) {
          await supabase.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
        if (hash.get('access_token') || code) window.history.replaceState(null, '', window.location.pathname); // no dejar tokens en la barra
      } catch {
        // sin enlace válido: al enviar se mostrará el aviso de enlace expirado
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return toast.error(problem);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      // "Auth session missing" es el mensaje crudo de Supabase cuando se
      // entra a esta página sin el enlace de recuperación válido (sesión de
      // auth no establecida) — traducirlo en vez de mostrar el string en
      // inglés tal cual.
      toast.error(
        error.message === 'Auth session missing!'
          ? 'El enlace de recuperación expiró o no es válido. Solicita uno nuevo.'
          : 'Error: ' + error.message
      );
    } else {
      toast.success("Contraseña actualizada. Ya puedes ingresar.");
      window.location.href = '/login';
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Define tu nueva credencial de seguridad." />
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nueva Contraseña</h2>
          <p className="text-slate-500 mb-8 font-medium">Asegúrate de que sea una clave segura y difícil de adivinar.</p>
          <form onSubmit={handleUpdate} className="space-y-6">
            <input required type="password" minLength="8" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Mínimo 8, con letras y números" onChange={e => setPassword(e.target.value)} />
            <button type="submit" disabled={loading || checking} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all">
              {loading ? "Actualizando..." : "Confirmar nueva contraseña"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}