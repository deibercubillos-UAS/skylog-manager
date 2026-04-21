'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // IMPORTANTE
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
// ESTA ES LA LÍNEA QUE FALTABA Y CAUSÓ EL ERROR DE VERCEL:
import AuthSidePanel from '@/components/AuthSidePanel'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); // DEFINICIÓN DEL ROUTER
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Ingresa tus credenciales");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        // Sincronización de sesión aeronáutica
        router.refresh(); 
        window.location.href = '/dashboard'; 
      }
    } catch (err) {
      alert("Error de acceso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* PANEL IZQUIERDO (TU FRONTEND ORIGINAL) */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-20 lg:px-32 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Bitafly</h1>
            <p className="text-slate-500 font-medium">Ingresa a tu centro de control</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-100 font-bold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-100 font-bold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <div className="flex justify-end">
               <Link href="/forgot-password" title="recuperar" className="text-xs font-bold text-slate-400 hover:text-primary uppercase">¿Olvidaste tu contraseña?</Link>
            </div>

            <button
              disabled={loading}
              className="w-full bg-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-navy transition-all active:scale-95"
            >
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-300 text-[10px] font-bold uppercase">O continuar con</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full border-2 border-slate-100 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
          >
            <img src="/google-icon.svg" className="w-5 h-5" alt="Google" />
            <span className="font-bold text-sm text-slate-600">Google Cloud</span>
          </button>

          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            ¿No tienes cuenta? <Link href="/register" className="text-primary hover:underline">Regístrate</Link>
          </p>
        </div>
      </div>

      {/* PANEL DERECHO (ESTE ES EL QUE CAUSABA EL ERROR) */}
      <AuthSidePanel />
    </div>
  );
}