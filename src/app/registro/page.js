'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });

  // Registro con Google (Mantenemos lógica de cliente por redirección)
  const handleGoogleRegister = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard/select-plan` }
    });
    if (error) alert(error.message);
  };

  // Registro Manual vía BACKEND API
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Error al crear cuenta");

      // Sincronizar sesión en el navegador
      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }

      alert("✅ Cuenta creada en BitaFly.");
      
      // Si fue invitado entra directo, si no, va a elegir plan
      window.location.href = result.isInvited ? '/dashboard' : '/dashboard/select-plan';

    } catch (error) {
      alert("Falla de registro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Comienza tu bitácora profesional." />
      
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Crear Cuenta</h2>
            <p className="text-slate-500 font-medium">Únete a la red BitaFly de operadores UAS.</p>
          </div>

          <button onClick={handleGoogleRegister} type="button" className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 mb-6 transition-all shadow-sm">
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" /> Registrarme con Google
          </button>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Juan Pérez" onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</label>
              <input required type="email" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@empresa.com" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contraseña</label>
              <input required type="password" title="Min. 6 caracteres" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="••••••••" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all hover:bg-orange-600">
              {loading ? "Procesando Registro..." : "Crear mi Cuenta"}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500 text-center">
            ¿Ya eres miembro? <Link href="/login" className="text-[#ec5b13] font-bold">Inicia sesión</Link>
          </p>
        </div>
      </section>
    </main>
  );
}