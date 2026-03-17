'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Registro simple en Supabase Auth
    // Pasamos el full_name en metadata para que el Trigger de SQL lo reciba
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
      options: { 
        data: { full_name: formData.fullName } 
      }
    });

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      alert("¡Cuenta creada! Redirigiendo al Dashboard...");
      // Esperamos un segundo para que la DB termine de procesar el trigger
      setTimeout(() => {
        window.location.href = '/dashboard/select-plan';
      }, 1500);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Inicia tu bitácora digital ahora." />
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Crear Cuenta Nueva</h2>
          <form onSubmit={handleRegister} className="space-y-5">
            <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" placeholder="Nombre Completo" 
              onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
            <input required type="email" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" placeholder="correo@ejemplo.com" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input required type="password" title="Min. 6 caracteres" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" placeholder="Contraseña" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all">
              {loading ? "Sincronizando..." : "Comenzar ahora"}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-500 text-center">
            ¿Ya tienes cuenta? <Link href="/login" className="text-[#ec5b13] font-bold">Inicia sesión</Link>
          </p>
        </div>
      </section>
    </main>
  );
}