'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [operatorType, setOperatorType] = useState('Piloto Independiente');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { full_name: fullName, operator_type: operatorType } 
      }
    });
    if (error) alert(error.message);
    else {
      alert('¡Cuenta creada! Revisa tu correo o inicia sesión.');
      router.push('/login');
    }
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
          <h1 className="text-white text-4xl font-bold leading-tight mb-8">Garantiza tu cumplimiento legal hoy.</h1>
          <ul className="space-y-6">
            <FeatureItem icon="verified" text="14 días de acceso total PRO" />
            <FeatureItem icon="picture_as_pdf" text="Reportes PDF para Aerocivil" />
            <FeatureItem icon="shield_with_heart" text="Análisis de riesgo SORA" />
          </ul>
        </div>
      </section>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center bg-[#f8f6f6]">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600">
              ¿Ya tienes cuenta? <Link href="/login" className="text-[#ec5b13] font-bold ml-1 hover:underline">Inicia Sesión</Link>
            </p>
          </div>

          <div className="mb-8 text-left">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Crea tu cuenta de operador</h2>
            <p className="text-slate-500">Únete a la red de pilotos profesionales.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
              <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Ej. Juan Pérez" onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <input type="email" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="juan@empresa.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg transition-all">
              {loading ? "Procesando..." : "Iniciar prueba gratuita"}
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