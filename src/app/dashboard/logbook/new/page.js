'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewFlightPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    aircraft_id: '',
    mission_type: 'Inspección',
    location: '',
    takeoff_time: '09:00',
    landing_time: '09:45',
    max_altitude: 120,
    max_distance: 850,
    incidents: false,
    notes: ''
  });

  // 1. Cargar datos iniciales (Drones y Usuario)
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
        const { data: aircraftData } = await supabase.from('aircraft').select('id, model, serial_number').eq('owner_id', user.id);
        setDrones(aircraftData || []);
      }
    }
    loadData();
  }, []);

  // 2. Cálculo de Duración
  const calculateDuration = () => {
    const start = formData.takeoff_time.split(':');
    const end = formData.landing_time.split(':');
    const startDate = new Date(0, 0, 0, start[0], start[1]);
    const endDate = new Date(0, 0, 0, end[0], end[1]);
    let diff = endDate.getTime() - startDate.getTime();
    
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // Manejo de vuelos medianoche

    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  // 3. Envío a Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('flights').insert([{
      owner_id: userProfile.id,
      pilot_id: userProfile.id, // Por defecto el usuario logueado
      aircraft_id: formData.aircraft_id,
      flight_date: new Date().toISOString().split('T')[0],
      takeoff_time: formData.takeoff_time,
      landing_time: formData.landing_time,
      location: formData.location,
      mission_type: formData.mission_type,
      incidents: formData.incidents,
      notes: formData.notes
    }]);

    if (error) {
      alert("Error al registrar: " + error.message);
    } else {
      alert("Vuelo registrado exitosamente en la bitácora oficial.");
      router.push('/dashboard/logbook');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-slate-50 dark:bg-background-dark/95 animate-in fade-in duration-500">
      
      {/* HEADER DINÁMICO */}
      <header className="bg-white dark:bg-[#1A202C] border-b border-slate-200 px-8 py-6 sticky top-0 z-10 text-left">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
              <Link href="/dashboard/logbook" className="hover:text-[#ec5b13]">Registros</Link>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span>Nuevo Registro</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nuevo Registro de Vuelo</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-slate-400 font-mono text-xs uppercase font-bold tracking-tighter">Borrador Autoguardado</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded uppercase tracking-wider">En Progreso</span>
            </div>
          </div>
          <Link href="/dashboard/logbook" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm border border-slate-200 transition-all">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Volver
          </Link>
        </div>
      </header>

      {/* FORMULARIO GRID */}
      <div className="p-8 max-w-7xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="material-symbols-outlined text-[#ec5b13]">badge</span>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">1. Identificación</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Aeronave (Nombre + S/N)</label>
                <select 
                  required
                  className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#ec5b13]/20 outline-none"
                  value={formData.aircraft_id}
                  onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})}
                >
                  <option value="">Seleccionar Drone...</option>
                  {drones.map(d => (
                    <option key={d.id} value={d.id}>{d.model} - SN: {d.serial_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Piloto al Mando</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="size-8 rounded-full bg-[#1A202C] flex items-center justify-center text-white font-black text-xs">
                    {userProfile?.email?.slice(0,2).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{userProfile?.email} (Yo)</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: TIEMPO Y UBICACIÓN */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="material-symbols-outlined text-[#ec5b13]">schedule</span>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">2. Tiempo y Ubicación</h3>
            </div>
            <div className="space-y-4">
              <input 
                required
                className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold outline-none" 
                placeholder="Ubicación del Despegue (Coordenadas o Ciudad)"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="time" 
                  className="rounded-xl border-slate-200 bg-slate-50 p-3 font-mono font-bold" 
                  value={formData.takeoff_time}
                  onChange={(e) => setFormData({...formData, takeoff_time: e.target.value})}
                />
                <input 
                  type="time" 
                  className="rounded-xl border-slate-200 bg-slate-50 p-3 font-mono font-bold" 
                  value={formData.landing_time}
                  onChange={(e) => setFormData({...formData, landing_time: e.target.value})}
                />
              </div>
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-black text-[#ec5b13] uppercase">Duración de Vuelo</span>
                <span className="text-2xl font-black text-[#ec5b13] font-mono">{calculateDuration()}</span>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: SEGURIDAD Y NOTAS (Full Width) */}
          <section className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#ec5b13]">security</span>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">3. Seguridad y Observaciones</h3>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100">
                <span className="text-xs font-black text-slate-500 uppercase">¿Hubo Incidentes?</span>
                <input 
                  type="checkbox" 
                  className="size-5 text-[#ec5b13] rounded border-slate-300 focus:ring-[#ec5b13]"
                  checked={formData.incidents}
                  onChange={(e) => setFormData({...formData, incidents: e.target.checked})}
                />
              </div>
            </div>
            <textarea 
              rows="4"
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#ec5b13]/10"
              placeholder="Describa el desarrollo de la misión, interferencias o anomalías..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </section>

          {/* BOTÓN FINAL */}
          <div className="lg:col-span-2 flex justify-end gap-4 pb-12">
            <button 
              type="submit" 
              disabled={loading}
              className="px-10 py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-3 active:scale-95"
            >
              <span className="material-symbols-outlined">send</span>
              {loading ? 'Procesando...' : 'Finalizar y Registrar Vuelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}