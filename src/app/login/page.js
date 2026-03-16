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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Esto te dirá exactamente qué pasó
        alert("Error de acceso: " + error.message);
      } else if (data.user) {
        console.log("Login exitoso, redirigiendo...");
        // Forzamos la redirección al dashboard
        router.push('/dashboard');
        router.refresh(); // Asegura que los datos se recarguen
      }
    } catch (err) {
      alert("Ocurrió un error inesperado al intentar ingresar.");
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingreso a SkyLog</h2>
            <p className="text-slate-500">Accede a tu bitácora digital.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <input 
                type="email" required 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20 text-slate-900" 
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <input 
                type="password" required 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20 text-slate-900" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Verificando...
                </>
              ) : "Entrar a mi cuenta"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}