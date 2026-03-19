'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✅ Contraseña actualizada. Ya puedes ingresar.");
      window.location.href = '/login';
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Define tu nueva credencial de seguridad." />
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nueva Contraseña</h2>
          <p className="text-slate-500 mb-8 font-medium">Asegúrate de que sea una clave segura y difícil de adivinar.</p>
          <form onSubmit={handleUpdate} className="space-y-6">
            <input required type="password" minLength="6" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Nueva contraseña de 6+ caracteres" onChange={e => setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all">
              {loading ? "Actualizando..." : "Confirmar nueva contraseña"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}