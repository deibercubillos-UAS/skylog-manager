'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from './FileUpload';

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('manual'); // 'manual' o 'invite'
  
  // Estado para Registro Manual
  const [form, setForm] = useState({ 
    name: '', id_number: '', phone: '', email: '',
    license_number: '', medical_expiry: '', pilot_role: 'Piloto'
  });

  // Estado para Invitación
  const [inviteEmail, setInviteEmail] = useState('');

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      const { error } = await supabase.from('pilots').insert([{ 
        ...form, 
        owner_id: user.id,
        organization_id: prof.organization_id
      }]);

      if (error) throw error;
      alert("✅ Tripulante registrado manualmente.");
      onSuccess();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single();
      const { data: org } = await supabase.from('organizations').select('company_name, unique_code').eq('id', prof.organization_id).single();

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: form.pilot_role,
          orgName: org.company_name,
          inviterName: prof.full_name,
          orgCode: org.unique_code
        })
      });

      if (res.ok) {
        await supabase.from('invitations').insert([{
          email: inviteEmail,
          role: form.pilot_role,
          organization_id: prof.organization_id,
          invited_by: user.id
        }]);
        alert("🚀 Invitación enviada exitosamente a " + inviteEmail);
        onSuccess();
      }
    } catch (e) { alert("Falla al enviar invitación"); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-[150] p-10 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Nuevo Tripulante</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
      </div>

      {/* SELECTOR DE MODO */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10 shadow-inner">
          <button 
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'manual' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          > Registro Manual </button>
          <button 
            onClick={() => setMode('invite')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'invite' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          > Invitar por Correo </button>
      </div>

      {mode === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in duration-300">
           <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Datos de Identidad</p>
              <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Nombre Completo" onChange={e => setForm({...form, name: e.target.value})} />
              <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="ID / Cédula" onChange={e => setForm({...form, id_number: e.target.value})} />
              <input required type="email" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Correo Personal" onChange={e => setForm({...form, email: e.target.value})} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Asignar Cargo</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.pilot_role} onChange={e => setForm({...form, pilot_role: e.target.value})}>
                    <option value="Piloto">Piloto Estándar</option>
                    <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                    <option value="Gerente SMS">Gerente SMS</option>
                </select>
              </div>
           </div>
           <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
             {loading ? 'Sincronizando...' : 'Finalizar Registro Manual'}
           </button>
        </form>
      ) : (
        <form onSubmit={handleSendInvite} className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-center space-y-6">
                <div className="size-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm text-orange-500">
                    <span className="material-symbols-outlined text-4xl">mail</span>
                </div>
                <div className="space-y-2">
                    <h4 className="font-black text-slate-900 uppercase text-sm">Enviar Invitación Oficial</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">El tripulante recibirá un enlace de registro vinculado automáticamente a su empresa.</p>
                </div>
                <div className="space-y-4 text-left">
                    <input 
                        required 
                        type="email" 
                        placeholder="correo@tripulante.com" 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-orange-500 transition-all"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cargo a ocupar</label>
                        <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm" value={form.pilot_role} onChange={e => setForm({...form, pilot_role: e.target.value})}>
                            <option value="Piloto">Piloto Estándar</option>
                            <option value="Jefe de Pilotos">Jefe de Pilotos</option>
                            <option value="Gerente SMS">Gerente SMS</option>
                        </select>
                    </div>
                </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
                {loading ? 'Enviando...' : 'Enviar Invitación Digital'}
            </button>
        </form>
      )}
    </aside>
  );
}