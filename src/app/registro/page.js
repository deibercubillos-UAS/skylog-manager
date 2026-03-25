'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });

  // Función para Registro con Google
  const handleGoogleRegister = async () => {
    // Detectamos si hay una intención de compra previa en la URL para mantenerla tras el login de Google
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    const price = params.get('price');
    
    let redirectPath = '/dashboard/select-plan';
    if (intent && price) {
      redirectPath = `/dashboard/subscription?pay=${intent}&price=${price}`;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`
      }
    });
    if (error) alert("Error con Google: " + error.message);
  };

  // Función de Registro Manual vía BACKEND API
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Llamamos a nuestra API de registro para manejar invitaciones y perfiles
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Error al crear cuenta");

      // 2. Sincronizar la sesión en el navegador (Cookies)
      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }

      if (intent && price) {
        // CAMBIO: Enviamos a /manage en lugar de /pay
        alert(`✅ Cuenta BitaFly creada. Redirigiendo para activar tu ${intent.toUpperCase()}...`);
        window.location.href = `/dashboard/subscription/manage?pay=${intent}&price=${price}`;
      } else {
        window.location.href = '/dashboard/select-plan';
      }

      // 3. LÓGICA DE REDIRECCIÓN INTELIGENTE
      const params = new URLSearchParams(window.location.search);
      const intent = params.get('intent');
      const price = params.get('price');

      if (intent && price) {
        // Si eligió un plan de pago, va directo a pagar al Dashboard
        alert(`✅ Cuenta BitaFly creada. Redirigiendo para activar tu ${intent.toUpperCase()}...`);
        window.location.href = `/dashboard/subscription?pay=${intent}&price=${price}`;
      } else if (result.isInvited) {
        // Si fue invitado por una empresa, entra directo al dashboard de ellos
        window.location.href = '/dashboard';
      } else {
        // Si es un usuario nuevo orgánico, va a seleccionar su plan inicial
        window.location.href = '/dashboard/select-plan';
      }

    } catch (error) {
      alert("Falla de registro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Comienza tu bitácora profesional en BitaFly." />
      
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600 font-medium">
              ¿Ya eres miembro? <Link href="/login" className="text-[#ec5b13] font-black hover:underline">Inicia sesión</Link>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter leading-none">Crear Cuenta</h2>
            <p className="text-slate-500 font-medium mt-2">Únete a la red más segura de operadores UAS.</p>
          </div>

          {/* BOTÓN GOOGLE */}
          <button 
            onClick={handleGoogleRegister} 
            type="button" 
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold hover:bg-slate-50 mb-6 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" /> 
            Continuar con Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">
              <span className="bg-[#f8f6f6] px-4">O registro manual</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</label>
              <input 
                required 
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold text-sm" 
                placeholder="Ej: Carlos Ruiz" 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</label>
              <input 
                required 
                type="email" 
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold text-sm" 
                placeholder="tu@empresa.com" 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contraseña</label>
              <input 
                required 
                type="password" 
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold text-sm" 
                placeholder="Mínimo 6 caracteres" 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95"
            >
              {loading ? "Sincronizando..." : "Iniciar mi Operación"}
            </button>
          </form>

          <p className="mt-8 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
            Protección de datos bajo estándares BitaFly UAS.
          </p>
        </div>
      </section>
    </main>
  );
}