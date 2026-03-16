'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push('/dashboard');
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      {/* SECCIÓN IZQUIERDA: PROPUESTA DE VALOR */}
      <section className="hidden lg:flex lg:w-5/12 bg-[#1A202C] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(236, 91, 19, 0.2) 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <span className="material-symbols-outlined text-[#ec5b13] text-3xl">flight_takeoff</span>
            <span className="text-white text-2xl font-bold tracking-tight">SkyLog</span>
          </Link>
          <h1 className="text-white text-4xl font-bold leading-tight mb-8">Bienvenido de nuevo, Capitán.</h1>
          <ul className="space-y-6">
            <FeatureItem icon="history" text="Accede a tu historial de vuelos completo" />
            <FeatureItem icon="analytics" text="Revisa tus estadísticas de operación" />
            <FeatureItem icon="task_alt" text="Gestiona tus próximas inspecciones" />
          </ul>
        </div>
        <div className="relative z-10 bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
          <p className="text-white/90 italic text-sm italic">"Tu bitácora digital, lista para el siguiente despegue."</p>
        </div>
      </section>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center bg-[#f8f6f6]">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600">
              ¿No tienes cuenta? <Link href="/registro" className="text-[#ec5b13] font-bold ml-1 hover:underline">Regístrate gratis</Link>
            </p>
          </div>

          <div className="mb-8 text-left">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingresa a tu cuenta</h2>
            <p className="text-slate-500">Continúa gestionando tus operaciones UAS.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input type="email" required className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@correo.com" onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                <Link href="#" className="text-xs text-[#ec5b13] font-bold">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                <input type="password" required className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all">
              {loading ? "Cargando..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <li className="flex items-center gap-4 text-white/90">
      <span className="material-symbols-outlined text-[#ec5b13] bg-[#ec5b13]/10 p-2 rounded-lg">{icon}</span>
      <span className="text-lg">{text}</span>
    </li>
  );
}