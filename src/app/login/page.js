'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client'; // PASO 6: Cliente de cliente
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        console.log("Sesión iniciada, sincronizando...");
        
        // 1. Forzar la escritura de cookies en el navegador
        await supabase.auth.setSession(data.session);

        // 2. Refrescar para que el Middleware vea la cookie
        router.refresh(); 
        
        // 3. Redirección limpia
        window.location.href = '/dashboard'; 
      }

    } catch (error) {
      alert("Credenciales incorrectas o error de conexión.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleLogin} className="max-w-sm w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <h1 className="text-2xl font-black text-navy uppercase mb-6 text-center">Ingreso Bitafly</h1>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email Aeronáutico"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-200 font-bold"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-200 font-bold"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Entrar a Cabina'}
          </button>
        </div>
      </form>
    </main>
  );
}