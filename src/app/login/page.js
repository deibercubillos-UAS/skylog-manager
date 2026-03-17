'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // Función para Login con Google
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) alert("Error con Google: " + error.message);
  };

  // Función para Login con Correo
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        alert("Error de acceso: " + error.message);
      } else if (data.user) {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Bienvenido de nuevo, Capitán." isRegister={false} />
      
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600">
              ¿No tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/registro">Regístrate</Link>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ingreso a Bitafly</h2>
            <p className="text-slate-500 font-medium">Gestiona tu operación profesional UAS.</p>
          </div>

          {/* BOTÓN GOOGLE FUNCIONAL */}
          <button 
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 mb-6 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            Entrar con Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400">
              <span className="bg-[#f8f6f6] px-4">O usa tu correo corporativo</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <input type="email" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@correo.com" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all hover:bg-orange-600">
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}