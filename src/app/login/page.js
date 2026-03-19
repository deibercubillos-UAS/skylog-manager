'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) alert("Error con Google: " + error.message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Usamos el cliente directamente para que Supabase gestione las COOKIES
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        console.log("Login exitoso, redirigiendo...");
        // Usamos window.location para asegurar que el Middleware refresque
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert("Error de acceso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Bienvenido de nuevo a BitaFly." />
      
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600">
              ¿No tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/registro">Regístrate</Link>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ingreso de Tripulación</h2>
            <p className="text-slate-500 font-medium">Accede a tu centro de mando aeronáutico.</p>
          </div>

          <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 mb-6 transition-all shadow-sm">
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" /> Entrar con Google
          </button>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Corporativo</label>
              <input required type="email" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@correo.com" onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Contraseña</label>
                {/* --- ESTE ES EL NUEVO BOTÓN DE RECUPERACIÓN --- */}
                <Link href="/reset-password" title="Recuperar acceso" className="text-[9px] font-black text-[#ec5b13] uppercase tracking-wider hover:underline">
                  ¿Olvidaste tu clave?
                </Link>
              </div>
              <input required type="password" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all hover:bg-orange-600 active:scale-95">
              {loading ? "Validando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-8 text-xs text-slate-400 text-center font-medium">
            Acceso encriptado bajo estándares de seguridad BitaFly UAS.
          </p>
        </div>
      </section>
    </main>
  );
}