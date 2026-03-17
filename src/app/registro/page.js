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

    try {
      const emailLower = formData.email.toLowerCase().trim();

      // 1. VERIFICAR SI HAY UNA INVITACIÓN PENDIENTE
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', emailLower)
        .eq('status', 'pending')
        .single();

      // 2. CREAR USUARIO EN SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password: formData.password,
        options: { 
          data: { full_name: formData.fullName } 
        }
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // 3. DEFINIR ROL Y ORGANIZACIÓN
      // Si fue invitado: usa los datos de la invitación.
      // Si NO fue invitado: es un usuario nuevo (Admin de su propio Plan Piloto).
      const finalRole = invitation ? invitation.role : 'admin';
      const finalOrg = invitation ? invitation.organization_id : userId;
      const finalPlan = invitation ? 'escuadrilla' : 'piloto'; // Si es invitado, entra al plan de la empresa

      // 4. CREAR/ACTUALIZAR PERFIL
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: formData.fullName,
          role: finalRole,
          organization_id: finalOrg,
          subscription_plan: finalPlan,
          updated_at: new Date()
        });

      if (profileError) throw profileError;

      // 5. SI HUBO INVITACIÓN, MARCARLA COMO ACEPTADA
      if (invitation) {
        await supabase
          .from('invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id);
      }

      alert("¡Cuenta creada exitosamente! Bienvenido a la flota.");
      router.push('/dashboard');

    } catch (error) {
      alert("Error en el registro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Únete a la flota más segura del sector." />
      
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          <div className="hidden lg:flex justify-end mb-8">
            <p className="text-sm text-slate-600">¿Ya tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/login">Log in</Link></p>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Crea tu cuenta</h2>
            <p className="text-slate-500">Si fuiste invitado por tu empresa, usa tu correo corporativo.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nombre Completo</label>
              <input required type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="Juan Pérez" onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Correo Electrónico</label>
              <input required type="email" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="tu@empresa.com" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Contraseña</label>
              <input required type="password" title="Mínimo 6 caracteres" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="••••••••" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl transition-all">
              {loading ? "Validando invitación..." : "Iniciar mi operación"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}