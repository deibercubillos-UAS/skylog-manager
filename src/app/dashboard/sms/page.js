'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SMSReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [flights, setFlights] = useState([]);
  
  // Estado del Formulario
  const [formData, setFormData] = useState({
    flight_id: '',
    severity: 'incidente',
    occurrence_date: '',
    location: '',
    event_type: '',
    damage_description: '',
    damaged_parts: [],
    third_party_damage: '',
    aircraft_status_post: 'operativa',
    narrative: '',
    immediate_actions: ''
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Verificar Rol
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(profile?.role || 'piloto');

      // 2. Cargar vuelos para vincular
      const { data: flightsData } = await supabase.from('flights').select('id, flight_date, location').eq('owner_id', user.id).limit(10);
      setFlights(flightsData || []);
      
      setLoading(false);
    }
    loadData();
  }, []);

  // Verificar si tiene permiso de edición
  const canEdit = userRole === 'gerente_sms' || userRole === 'admin';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Acceso denegado: Solo el Gerente de SMS puede emitir reportes oficiales.");
      return;
    }
    setLoading(true);
    // Lógica de inserción en Supabase aquí...
    alert("Reporte de seguridad enviado exitosamente.");
    setLoading(false);
  };

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400">CARGANDO PROTOCOLOS SMS...</div>;

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      
      {/* HEADER SMS */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-[#1A202C] tracking-tight uppercase">Reporte de Seguridad Operacional (SMS)</h2>
            <p className="text-slate-500 text-sm">Formulario Oficial de Notificación de Incidentes y Accidentes</p>
          </div>
          {!canEdit && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span className="text-[10px] font-black uppercase">Solo Lectura: Gerente SMS requerido</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 space-y-8 pb-32">
        
        {/* NIVEL DE GRAVEDAD */}
        <section className={`p-8 rounded-3xl border-t-8 border-slate-200 bg-white shadow-sm transition-all ${
          formData.severity === 'accidente' ? 'border-red-500' : formData.severity === 'incidente_grave' ? 'border-amber-500' : 'border-blue-500'
        }`}>
          <h3 className="text-xs font-black text-[#1A202C] uppercase tracking-widest mb-6">Nivel de Gravedad del Suceso</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SeverityBtn 
              active={formData.severity === 'incidente'} 
              color="blue" icon="info" label="Incidente" 
              onClick={() => canEdit && setFormData({...formData, severity: 'incidente'})} 
            />
            <SeverityBtn 
              active={formData.severity === 'incidente_grave'} 
              color="amber" icon="warning" label="Incidente Grave" 
              onClick={() => canEdit && setFormData({...formData, severity: 'incidente_grave'})} 
            />
            <SeverityBtn 
              active={formData.severity === 'accidente'} 
              color="red" icon="error" label="Accidente" 
              onClick={() => canEdit && setFormData({...formData, severity: 'accidente'})} 
            />
          </div>
        </section>

        {/* 1. DETALLES DEL SUCESO */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-[#1A202C] border-b border-slate-50 pb-4 mb-2">1. Detalles del Suceso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Vinculación de Vuelo</label>
              <select disabled={!canEdit} className="w-full p-4 bg-slate-50 rounded-xl border-none font-bold text-sm outline-none appearance-none">
                <option>Seleccionar ID de Vuelo...</option>
                {flights.map(f => <option key={f.id} value={f.id}>{f.flight_date} - {f.location}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Fecha y Hora del Evento</label>
              <input disabled={!canEdit} type="datetime-local" className="w-full p-4 bg-slate-50 rounded-xl border-none font-bold text-sm outline-none" />
            </div>
          </div>
        </section>

        {/* 2. EVALUACIÓN DE DAÑOS */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-[#1A202C] border-b border-slate-50 pb-4 mb-2">2. Evaluación de Daños</h3>
          <div className="space-y-6">
            <textarea disabled={!canEdit} rows="3" className="w-full p-4 bg-slate-50 rounded-xl border-none text-sm font-medium outline-none" placeholder="Describa los daños visibles en la aeronave..." />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Hélices', 'Gimbal/Cámara', 'Estructura', 'Batería'].map(part => (
                <label key={part} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                  <input type="checkbox" disabled={!canEdit} className="rounded text-red-500 focus:ring-0" />
                  <span className="text-xs font-bold text-slate-600 uppercase">{part}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* 3. NARRATIVA */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-[#1A202C] border-b border-slate-50 pb-4 mb-2">3. Relato del Evento</h3>
          <textarea disabled={!canEdit} rows="6" className="w-full p-4 bg-slate-50 rounded-xl border-none text-sm font-medium outline-none" placeholder="Descripción cronológica de los hechos..." />
        </section>

        {/* FOOTER ACCIONES */}
        <footer className="pt-8 flex flex-col md:flex-row gap-4 justify-end">
          <button className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
            Descargar Borrador PDF
          </button>
          <button 
            disabled={!canEdit}
            onClick={handleSave}
            className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all ${
              canEdit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Emitir Reporte Oficial SMS
          </button>
        </footer>

      </main>
    </div>
  );
}

// Componente para los botones de severidad
function SeverityBtn({ active, color, icon, label, onClick }) {
  const colors = {
    blue: 'border-blue-500 text-blue-600 bg-blue-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50',
    red: 'border-red-600 text-red-600 bg-red-50'
  };

  const activeColors = {
    blue: 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20',
    amber: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20',
    red: 'bg-red-600 text-white border-red-600 shadow-red-500/20'
  };

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 border-2 rounded-3xl transition-all shadow-sm ${
        active ? activeColors[color] + ' scale-105 shadow-lg' : colors[color] + ' opacity-60 hover:opacity-100'
      }`}
    >
      <span className="material-symbols-outlined text-4xl mb-2">{icon}</span>
      <span className="font-black text-sm uppercase tracking-tighter">{label}</span>
    </button>
  );
}