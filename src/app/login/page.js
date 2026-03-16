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

    // ESTA ES LA FUNCIÓN QUE PERMITE EL INGRESO
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Error de acceso: " + error.message);
    } else {
      // Si el login es correcto, te lleva al dashboard
      router.push('/fleet'); 
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Bienvenido de nuevo, Capitán." isRegister={false} />
      
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="hidden lg:flex justify-end mb-8">
            <p className="text-sm text-slate-600">¿No tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/registro">Regístrate</Link></p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingresa a SkyLog</h2>
            <p className="text-slate-500">Accede a tu bitácora digital.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <input 
                type="email" required 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="tu@correo.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <input 
                type="password" required 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
            >
              {loading ? "Verificando..." : "Entrar a mi cuenta"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}