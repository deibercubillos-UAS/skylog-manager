'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function InvitePilotPanel({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('piloto');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Obtener datos del administrador para personalizar el correo
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single();

      // 2. Registrar la invitación en la base de datos de Supabase
      const { error: dbError } = await supabase.from('invitations').insert([
        { 
          email: email.toLowerCase().trim(), 
          role: role, 
          organization_id: user.id,
          status: 'pending'
        }
      ]);

      if (dbError) throw dbError;

      // 3. Llamar a nuestra API interna para enviar el correo vía Resend
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          role: role.replace('_', ' '),
          orgName: profile?.company_name || 'SkyLog Fleet',
          inviterName: profile?.full_name || 'Un Administrador'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el correo');
      }

      alert("🚀 ¡Invitación registrada y correo enviado exitosamente!");
      onSuccess(); // Cierra el panel y refresca la lista

    } catch (error) {
      alert("Error en el proceso: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Invitar al Equipo</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-400 hover:text-red-500 transition-colors">close</button>
      </div>

      <form onSubmit={handleInvite} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo del Invitado</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
            <input 
              required type="email" 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20 dark:text-white"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Rol Operativo</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
            <select 
              className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none appearance-none dark:text-white focus:ring-2 focus:ring-[#ec5b13]/20"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="piloto">Piloto Estándar</option>
              <option value="jefe_pilotos">Jefe de Pilotos</option>
              <option value="gerente_sms">Gerente de SMS</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-orange-500 text-lg">info</span>
            <p className="text-[10px] text-orange-700 dark:text-orange-400 font-bold uppercase leading-tight">
              El destinatario recibirá un enlace único para registrarse bajo tu organización y plan de suscripción.
            </p>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sincronizando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">send</span>
              Enviar Invitación Oficial
            </>
          )}
        </button>
      </form>
    </aside>
  );
}