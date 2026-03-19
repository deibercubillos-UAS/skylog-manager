'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SMSReportPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [flights, setFlights] = useState([]);
  
  const [formData, setFormData] = useState({
    flight_id: '',
    severity: 'incidente',
    occurrence_date: new Date().toISOString().slice(0, 16),
    location: '',
    narrative: '',
    immediate_actions: ''
  });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profRes, flightsRes] = await Promise.all([
        fetch(`/api/user/profile?userId=${session.user.id}`),
        fetch(`/api/logbook?userId=${session.user.id}`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);

      const profData = await profRes.json();
      const flightsData = await flightsRes.json();

      setUserProfile(profData);
      setFlights(Array.isArray(flightsData) ? flightsData : []);
      setLoading(false);
    }
    init();
  }, []);

  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'gerente_sms';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return alert("Permisos insuficientes.");
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/sms', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ userId: session.user.id, reportData: formData })
    });

    if (response.ok) {
      alert("🚀 Reporte SMS registrado y enviado a auditoría.");
      setFormData({ flight_id: '', severity: 'incidente', occurrence_date: '', location: '', narrative: '', immediate_actions: '' });
    } else {
      const err = await response.json();
      alert("Error: " + err.error);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">Estableciendo conexión SMS segura...</div>;

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500 pb-20">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-40 flex justify-between items-center text-left">
        <div>
          <h2 className="text-2xl font-black text-[#1A202C] tracking-tight uppercase">Seguridad Operacional (SMS)</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Notificación de Incidentes y Accidentes</p>
        </div>
        {!canEdit && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm font-black">lock</span>
            <span className="text-[10px] font-black uppercase">Solo lectura: Perfil Gerencial requerido</span>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto w-full p-8 space-y-8">
        {/* NIVEL DE GRAVEDAD */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">01. Clasificación de Severidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SeverityBtn active={formData.severity === 'incidente'} color="blue" icon="info" label="Incidente" onClick={() => canEdit && setFormData({...formData, severity: 'incidente'})} />
            <SeverityBtn active={formData.severity === 'incidente_grave'} color="amber" icon="warning" label="Incidente Grave" onClick={() => canEdit && setFormData({...formData, severity: 'incidente_grave'})} />
            <SeverityBtn active={formData.severity === 'accidente'} color="red" icon="error" label="Accidente" onClick={() => canEdit && setFormData({...formData, severity: 'accidente'})} />
          </div>
        </section>

        {/* DETALLES */}
        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vuelo Asociado</label>
                <select disabled={!canEdit} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={formData.flight_id} onChange={e => setFormData({...formData, flight_id: e.target.value})}>
                  <option value="">Seleccionar Misión...</option>
                  {flights.map(f => <option key={f.id} value={f.id}>{f.flight_number} - {f.location}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fecha y Hora del Suceso</label>
                <input disabled={!canEdit} type="datetime-local" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={formData.occurrence_date} onChange={e => setFormData({...formData, occurrence_date: e.target.value})} />
             </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-[#1A202C] uppercase border-b border-slate-50 pb-4">Narrativa de los Hechos</h3>
            <textarea disabled={!canEdit} rows="5" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium" placeholder="Describa detalladamente el suceso..." value={formData.narrative} onChange={e => setFormData({...formData, narrative: e.target.value})} />
            <h3 className="text-sm font-black text-[#1A202C] uppercase border-b border-slate-50 pb-4">Acciones Inmediatas</h3>
            <textarea disabled={!canEdit} rows="3" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium" placeholder="¿Qué medidas se tomaron para mitigar el riesgo?" value={formData.immediate_actions} onChange={e => setFormData({...formData, immediate_actions: e.target.value})} />
          </div>

          {canEdit && (
            <button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all">
              {submitting ? 'Procesando Envío...' : 'Emitir Reporte Oficial SMS'}
            </button>
          )}
        </form>
      </main>
    </div>
  );
}

function SeverityBtn({ active, color, icon, label, onClick }) {
  const styles = {
    blue: active ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100',
    amber: active ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-100',
    red: active ? 'bg-red-600 text-white shadow-red-500/20' : 'bg-red-50 text-red-600 border-red-100'
  };

  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center justify-center p-8 border-2 rounded-[2rem] transition-all ${styles[color]} ${active ? 'scale-105 shadow-2xl border-transparent' : 'opacity-60 grayscale-[0.5]'}`}>
      <span className="material-symbols-outlined text-4xl mb-2">{icon}</span>
      <span className="font-black text-xs uppercase tracking-tighter">{label}</span>
    </button>
  );
}