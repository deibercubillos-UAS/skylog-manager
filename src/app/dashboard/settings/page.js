'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Componentes independientes que ya creamos
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

  // Cargar datos vía API
  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const res = await fetch(`/api/user/profile?userId=${user.id}`);
        const data = await res.json();
        if (!data.error) setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  // GUARDAR CAMBIOS VÍA API (BACKEND DESACOPLADO)
  const handleSave = async () => {
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          updateData: profile
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);
      
      alert("✅ Configuración de BitaFly actualizada.");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Sincronizando Ajustes...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Configuración</h2>
        <p className="text-slate-500 text-sm mt-2 font-medium">Gestión de identidad corporativa y operativa.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* NAVEGACIÓN IZQUIERDA */}
        <div className="space-y-2">
          <TabBtn id="profile" icon="person" label="Perfil Personal" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabBtn id="company" icon="business" label="Organización & Empresa" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabBtn id="certs" icon="verified" label="Certificaciones UAS" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabBtn id="notif" icon="notifications" label="Notificaciones" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabBtn id="security" icon="security" label="Seguridad" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* CONTENIDO DERECHA */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            {activeTab === 'profile' && <ProfileSettings profile={profile} setProfile={setProfile} />}
            {activeTab === 'company' && <CompanySettings profile={profile} setProfile={setProfile} />}
            {activeTab === 'certs' && <CertificationsSettings />}
            {activeTab === 'notif' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}

            <div className="mt-12 pt-8 border-t border-slate-50">
              <button 
                onClick={handleSave} 
                disabled={updating}
                className="w-full bg-[#ec5b13] text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                {updating ? 'Guardando en Servidor...' : 'Guardar todos los cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ id, icon, label, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${
      isActive ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
    }`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className={`text-sm ${isActive ? 'font-black' : 'font-bold'}`}>{label}</span>
    </button>
  );
}