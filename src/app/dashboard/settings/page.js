'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    company_name: '',
    role: '',
    operator_id: '' // Este campo es vital para los reportes RAC
  });

  // 1. Cargar datos del perfil actual
  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) setProfile(data);
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  // 2. Función para actualizar
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id);

    if (error) alert("Error al actualizar: " + error.message);
    else alert("Configuración guardada con éxito");
    setUpdating(false);
  };

  if (loading) return <div className="p-8 animate-pulse text-slate-400 font-bold">Cargando configuración...</div>;

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 text-left">
      <header className="mb-10">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Configuración</h2>
        <p className="text-slate-500 mt-1">Gestiona tu identidad aeronáutica y preferencias del sistema.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Columna Izquierda: Navegación de Ajustes */}
        <div className="space-y-2">
          <SettingsTab icon="person" label="Perfil Personal" active={true} />
          <SettingsTab icon="business" label="Organización & Empresa" active={false} />
          <SettingsTab icon="verified" label="Certificaciones UAS" active={false} />
          <SettingsTab icon="notifications" label="Notificaciones" active={false} />
          <SettingsTab icon="security" label="Seguridad" active={false} />
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdate} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
            
            {/* Sección: Información Básica */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Información General</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#ec5b13]/20 outline-none"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Cargo / Rol</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#ec5b13]/20 outline-none"
                    value={profile.role || ''}
                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                    placeholder="Ej: Director de Operaciones"
                  />
                </div>
              </div>
            </section>

            {/* Sección: Datos Aeronáuticos */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Identidad Aeronáutica</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nombre de la Compañía (Operador)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={profile.company_name || ''}
                    onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">ID de Operador (DAN / Registro)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">shield</span>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm outline-none font-mono"
                      value={profile.operator_id || ''}
                      onChange={(e) => setProfile({...profile, operator_id: e.target.value})}
                      placeholder="CO-OP-XXXXX"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 italic">Este ID aparecerá automáticamente en el encabezado de todos tus reportes PDF generados.</p>
                </div>
              </div>
            </section>

            {/* Botón Guardar */}
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={updating}
                className="w-full bg-[#ec5b13] hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                {updating ? 'Guardando cambios...' : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Actualizar Configuración
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Zona de Peligro / Otros */}
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center justify-between">
            <div className="text-left">
              <p className="text-red-700 font-bold text-sm">Cerrar sesión en todos los dispositivos</p>
              <p className="text-red-500 text-[10px] uppercase font-bold tracking-tighter">Acción de seguridad recomendada cada 30 días</p>
            </div>
            <button className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all">
              Cerrar Sesión
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Componente auxiliar para las pestañas
function SettingsTab({ icon, label, active }) {
  return (
    <button className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
      active 
      ? 'bg-[#ec5b13] text-white shadow-lg shadow-orange-500/20 font-bold' 
      : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'
    }`}>
      <span className="material-symbols-outlined">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}