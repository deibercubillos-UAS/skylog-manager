'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function InvitePilotPanel({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('piloto');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single();

      const { error: dbError } = await supabase.from('invitations').insert([{
        email: email.toLowerCase().trim(),
        role: role,
        organization_id: user.id,
        status: 'pending'
      }]);

      if (dbError) throw dbError;

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

      toast.success("Invitación registrada y correo enviado exitosamente.");
      onSuccess();
    } catch (error) {
      toast.error("Error en el proceso: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[150] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Invitar al Equipo</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleInvite} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Correo del Invitado</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
              <input
                required type="email"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Rol Operativo</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">badge</span>
              <select
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-500/20"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="piloto">Piloto Estándar</option>
                <option value="jefe_pilotos">Jefe de Pilotos</option>
                <option value="gerente_sms">Gerente de SMS</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xl">expand_more</span>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-orange-500 text-lg shrink-0">info</span>
              <p className="text-xs text-orange-700 font-bold uppercase leading-tight">
                El destinatario recibirá un enlace único para registrarse bajo tu organización y plan de suscripción.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2"
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
      </div>
    </aside>
  );
}
