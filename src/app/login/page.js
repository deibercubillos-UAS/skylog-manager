'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (data.user) {
        router.refresh();
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(
        err.message.includes('Invalid login')
          ? 'Correo o contraseña incorrectos.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Formulario */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">

          {/* Logo móvil */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10 lg:hidden">
            <span className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</span>
          </Link>

          <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Iniciar sesión</h1>
          <p className="text-slate-500 text-sm mt-1 mb-8">Ingresa a tu centro de control aeronáutico.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/reset-password"
                className="text-xs font-bold text-slate-400 hover:text-primary uppercase tracking-wide transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Error inline */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-bold">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Validando...
                </>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-slate-100" />
            <span className="mx-4 text-slate-300 text-xs font-bold uppercase">O continuar con</span>
            <div className="flex-grow border-t border-slate-100" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full border border-slate-200 py-3.5 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 text-sm font-bold text-slate-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-primary hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </main>

      <AuthSidePanel mode="login" />
    </div>
  );
}
