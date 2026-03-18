'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState('piloto');
  const [userPlan, setUserPlan] = useState('piloto');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Llamamos a la API pasando el userId
        const res = await fetch(`/api/user/profile?userId=${user.id}`);
        const data = await res.json();
        if (!data.error) {
          setProfile(data);
          setUserRole(data.role || 'piloto');
          setUserPlan(data.subscription_plan || 'piloto');
        }
      }
    }
    loadData();
  }, []);

  // ... (El resto del código del menú se mantiene igual)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6]">
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full shrink-0">
        <div className="p-6 border-b border-white/5 mb-4 flex items-center gap-3">
          <img src="/logo.png" className="size-10 object-contain" alt="Logo" />
          <div className="text-left">
            <h1 className="text-white text-xl font-black">BitaFly</h1>
            <p className="text-[#ec5b13] text-[8px] font-black uppercase">Plan {userPlan.toUpperCase()}</p>
          </div>
        </div>
        
        {/* Navegación y Perfil (Ahora mostrarán los datos reales) */}
        <nav className="flex-1 px-3 space-y-1">
           {/* ... items ... */}
        </nav>

        <div className="p-4 border-t border-slate-800 text-left">
          <p className="text-white text-xs font-bold">{profile?.full_name || 'Cargando...'}</p>
          <p className="text-slate-500 text-[9px] uppercase font-black">{userRole.replace('_', ' ')}</p>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}