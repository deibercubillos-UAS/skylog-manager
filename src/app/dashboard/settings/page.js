'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// IMPORTACIÓN DE MÓDULOS (Asegúrate de que existan en components/settings)
import ProfileSettings from '@/components/settings/ProfileSettings';
import CertificationsSettings from '@/components/settings/CertificationsSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // ESTADOS DE DATOS
  const [profile, setProfile] = useState({
    full_name: '',
    company_name: '',
    role: '',
    operator_id: '',
    flight_prefix: 'SKL'
  });
  const [missions, setMissions] = useState([]);
  const [newMissionLabel, setNewMissionLabel] = useState('');

  // 1. CARGAR DATOS INICIALES
  const loadSettings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Cargar Perfil
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile(profileData);

    // Cargar Misiones
    const { data: missionData } = await supabase.from('mission_types').select('*').eq('owner_id', user.id).order('created_at', { ascending: true });
    setMissions(missionData || []);
    
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  // 2. GUARDAR PERFIL Y PREFIJO
  const handleSaveProfile = async () => {
    setUpdating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update(profile).eq('id', user.id);
    
    if (error) alert("Error: " + error.message);
    else alert("Configuración de identidad guardada correctamente.");
    setUpdating(false);
  };

  // 3. GESTIÓN DE MISIONES (Añadir/Eliminar)
  const addMission = async (e) => {
    e.preventDefault();
    if (!newMissionLabel) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('mission_types').insert([{ owner_id: user.id, label: newMissionLabel }]);
    
    if (!error) {
      setNewMissionLabel('');
      loadSettings();
    }
  };

  const deleteMission = async (id) => {
    await supabase.from('mission_types').delete().eq('id', id);
    loadSettings();
  };

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400 text-left uppercase tracking-widest">Sincronizando preferencias...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Panel de Configuración</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza tu entorno de operación y estándares de reporte.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* NAVEGACIÓN LATERAL */}
        <div className="space-y-2">
          <SettingsBtn id="profile" icon="person" label="Perfil Personal" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="company" icon="business" label="Organización & Misiones" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="certs" icon="verified" label="Certificaciones UAS" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="notif" icon="notifications" label="Notificaciones" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="security" icon="security" label="Seguridad" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* ÁREA DE CONTENIDO */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            
            {/* VISTA: PERFIL PERSONAL */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <ProfileSettings profile={profile} setProfile={setProfile} />
                <button onClick={handleSaveProfile} disabled={updating} className="w-full bg-[#ec5b13] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                  {updating ? 'Procesando...' : 'Guardar Cambios de Perfil'}
                </button>
              </div>
            )}

            {/* VISTA: ORGANIZACIÓN Y MISIONES */}
            {activeTab === 'company' && (
              <div className="space-y-10">
                <section className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Identidad del Operador</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Razón Social</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={profile.company_name || ''} onChange={e => setProfile({...profile, company_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">ID Operador (DAN)</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono" value={profile.operator_id || ''} onChange={e => setProfile({...profile, operator_id: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Prefijo de Vuelo (Consecutivo)</label>
                      <input type="text" maxLength="4" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono uppercase" placeholder="Ej: SKL" value={profile.flight_prefix || ''} onChange={e => setProfile({...profile, flight_prefix: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={updating} className="w-full bg-[#ec5b13] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95">
                    {updating ? 'Guardando...' : 'Actualizar Identidad'}
                  </button>
                </section>

                <section className="space-y-6 pt-10 border-t border-slate-100">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Gestión de Tipos de Misión</h3>
                  <form onSubmit={addMission} className="flex gap-2">
                    <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Nueva Misión (ej: Aspersión)" value={newMissionLabel} onChange={e => setNewMissionLabel(e.target.value)} />
                    <button type="submit" className="bg-[#1A202C] text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest">Añadir</button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missions.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-xs font-bold text-slate-700">{m.label}</span>
                        <button onClick={() => deleteMission(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'certs' && <CertificationsSettings />}
            {activeTab === 'notif' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}

          </div>
        </div>
      </div>
    </div>
  );
}

// COMPONENTE AUXILIAR BOTÓN NAVEGACIÓN
function SettingsBtn({ id, icon, label, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${
      isActive ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-xl shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
    }`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className={`text-sm ${isActive ? 'font-black' : 'font-bold'}`}>{label}</span>
    </button>
  );
}