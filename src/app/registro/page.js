'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', operatorType: 'Piloto Independiente' });
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullName, operator_type: formData.operatorType } }
    });
    if (error) alert(error.message);
    else { alert('Revisa tu correo para confirmar la cuenta'); router.push('/login'); }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Estás a un paso de volar con total tranquilidad legal." />
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="hidden lg:flex justify-end mb-8">
            <p className="text-sm text-slate-600">¿Ya tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/login">Log in</Link></p>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Crea tu cuenta de operador</h2>
            <p className="text-slate-500">Gestiona tus operaciones hoy mismo.</p>
          </div>
          
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 mb-6 transition-all">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" /> Continue with Google
          </button>

          <form onSubmit={handleRegister} className="space-y-5">
            <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg" placeholder="Nombre Completo" onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
            <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg" placeholder="Correo" type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg" placeholder="Contraseña" type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg appearance-none" onChange={(e) => setFormData({...formData, operatorType: e.target.value})}>
              <option>Piloto Independiente</option>
              <option>Empresa de Drones</option>
            </select>
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-bold rounded-lg shadow-lg">
              {loading ? "Cargando..." : "Iniciar prueba gratuita"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}