'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// IMPORTACIÓN DE LOS NUEVOS COMPONENTES
import ProfileSettings from '@/components/settings/ProfileSettings';
import CompanySettings from '@/components/settings/CompanySettings';
import CertificationsSettings from '@/components/settings/CertificationsSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setUpdating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update(profile).eq('id', user.id);
    if (!error) alert("Cambios guardados con éxito");
    setUpdating(false);
  };

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400">SINCRONIZANDO AJUSTES...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h2>
        <p className="text-slate-500 text-sm mt-1">Gestión integral de tu identidad y preferencias.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* NAVEGACIÓN LATERAL DE SETTINGS */}
        <div className="space-y-2">
          <SettingsBtn id="profile" icon="person" label="Perfil Personal" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="company" icon="business" label="Organización & Empresa" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="certs" icon="verified" label="Certificaciones UAS" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="notif" icon="notifications" label="Notificaciones" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SettingsBtn id="security" icon="security" label="Seguridad" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* ÁREA DE CONTENIDO DINÁMICO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            {activeTab === 'profile' && <ProfileSettings profile={profile} setProfile={setProfile} />}
            {activeTab === 'company' && <CompanySettings profile={profile} setProfile={setProfile} />}
            {activeTab === 'certs' && <CertificationsSettings />}
            {activeTab === 'notif' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}

            {/* Solo mostramos botón guardar en pestañas de datos */}
            {(activeTab === 'profile' || activeTab === 'company') && (
              <button onClick={handleSave} disabled={updating} className="mt-10 w-full bg-[#ec5b13] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                {updating ? 'Procesando...' : 'Guardar todos los cambios'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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