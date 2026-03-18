'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Función para Login con Google (Frontend Directo)
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) alert("Error con Google: " + error.message);
  };

  // Función de Login usando el nuevo BACKEND (API)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Llamamos a nuestra propia API interna
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Error de servidor");

      // Si el backend validó todo, sincronizamos la sesión en el navegador
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (!sessionError) {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert("Falla de acceso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Bienvenido de nuevo a BitaFly." />
      
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ingreso de Tripulación</h2>
            <p className="text-slate-500 font-medium">Accede a tu centro de mando aeronáutico.</p>
          </div>

          <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 mb-6 transition-all shadow-sm">
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" /> Entrar con Google
          </button>

          <form onSubmit={handleLogin} className="space-y-6">
            <input type="email" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@correo.com" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all">
              {loading ? "Validando en Servidor..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500 text-center">
            ¿No tienes cuenta? <Link href="/registro" className="text-[#ec5b13] font-bold">Regístrate</Link>
          </p>
        </div>
      </section>
    </main>
  );
}