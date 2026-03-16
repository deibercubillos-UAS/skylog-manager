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

  // ESTADO DEL CHECKLIST
  const [checklist, setChecklist] = useState({
    compass: false,
    propellers: false,
    battery: false,
    signal: false,
    area_clear: false,
    notam: false
  });

  // ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    aircraft_id: '',
    mission_type: 'Inspección',
    location: '',
    takeoff_time: '09:00',
    landing_time: '09:45',
    incidents: false,
    notes: ''
  });

  // Validar si el checklist está completo
  const isSafeToFly = Object.values(checklist).every(item => item === true);

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

  const calculateDuration = () => {
    const start = formData.takeoff_time.split(':');
    const end = formData.landing_time.split(':');
    const startDate = new Date(0, 0, 0, start[0], start[1]);
    const endDate = new Date(0, 0, 0, end[0], end[1]);
    let diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSafeToFly) {
      alert("⚠️ ALERTA DE SEGURIDAD: Debe completar todos los puntos del Checklist antes de autorizar el vuelo.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.from('flights').insert([{
      owner_id: userProfile.id,
      pilot_id: userProfile.id,
      aircraft_id: formData.aircraft_id,
      flight_date: new Date().toISOString().split('T')[0],
      takeoff_time: formData.takeoff_time,
      landing_time: formData.landing_time,
      location: formData.location,
      mission_type: formData.mission_type,
      incidents: formData.incidents,
      notes: formData.notes
    }]);

    if (!error) {
      alert("Vuelo AUTORIZADO y registrado exitosamente.");
      router.push('/dashboard/logbook');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-slate-50 animate-in fade-in duration-500">
      
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Autorización de Vuelo</h2>
            <p className="text-slate-500 text-xs font-bold uppercase mt-1">Checklist de Seguridad RAC 100</p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2 border-2 ${
            isSafeToFly ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            <span className="material-symbols-outlined text-sm">{isSafeToFly ? 'verified' : 'gavel'}</span>
            {isSafeToFly ? 'Vuelo Autorizado' : 'Pendiente de Seguridad'}
          </div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          {/* COLUMNA IZQUIERDA: DATOS (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase text-slate-400 border-b border-slate-50 pb-2">Información de Misión</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Aeronave</label>
                  <select required className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold" value={formData.aircraft_id} onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})}>
                    <option value="">Seleccionar Drone...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} - {d.serial_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Ubicación</label>
                  <input required className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold" placeholder="Coordenadas o Ciudad" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" className="rounded-xl border-slate-200 bg-slate-50 p-3 font-mono font-bold" value={formData.takeoff_time} onChange={(e) => setFormData({...formData, takeoff_time: e.target.value})} />
                <input type="time" className="rounded-xl border-slate-200 bg-slate-50 p-3 font-mono font-bold" value={formData.landing_time} onChange={(e) => setFormData({...formData, landing_time: e.target.value})} />
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-400 border-b border-slate-50 pb-2 mb-4">Observaciones Técnicas</h3>
              <textarea rows="4" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none" placeholder="Anomalías, clima o interferencias..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </section>
          </div>

          {/* COLUMNA DERECHA: CHECKLIST (1/3) */}
          <div className="space-y-6">
            <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                <span className="material-symbols-outlined text-[#ec5b13]">fact_check</span>
                <h3 className="text-sm font-black uppercase tracking-widest">Pre-Flight Checklist</h3>
              </div>
              
              <div className="space-y-4">
                <CheckItem id="compass" label="Brújula Calibrada" checked={checklist.compass} onChange={(val) => setChecklist({...checklist, compass: val})} />
                <CheckItem id="propellers" label="Hélices en buen estado" checked={checklist.propellers} onChange={(val) => setChecklist({...checklist, propellers: val})} />
                <CheckItem id="battery" label="Batería > 90% Carga" checked={checklist.battery} onChange={(val) => setChecklist({...checklist, battery: val})} />
                <CheckItem id="signal" label="Enlace RC/GCS Estable" checked={checklist.signal} onChange={(val) => setChecklist({...checklist, signal: val})} />
                <CheckItem id="area" label="Área de Despegue Libre" checked={checklist.area_clear} onChange={(val) => setChecklist({...checklist, area_clear: val})} />
                <CheckItem id="notam" label="Verificación de NoFlyZone" checked={checklist.notam} onChange={(val) => setChecklist({...checklist, notam: val})} />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={!isSafeToFly || loading}
                  className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                    isSafeToFly 
                    ? 'bg-[#ec5b13] hover:bg-orange-600 shadow-lg shadow-orange-500/30' 
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {loading ? 'Procesando...' : 'Finalizar y Autorizar'}
                </button>
                {!isSafeToFly && (
                  <p className="text-[10px] text-red-400 font-bold uppercase mt-3 text-center animate-pulse">Checklist Incompleto</p>
                )}
              </div>
            </section>
          </div>

        </form>
      </div>
    </div>
  );
}

// Componente Interno para los items del Checklist
function CheckItem({ id, label, checked, onChange }) {
  return (
    <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
      checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'
    }`}>
      <span className={`text-xs font-bold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
      <input 
        type="checkbox" 
        className="size-5 rounded border-slate-600 text-[#ec5b13] focus:ring-0" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}