'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ProgramacionActivaClient from '../programacion-activa/ProgramacionActivaClient';

export const dynamic = 'force-dynamic';

export default function MisVuelosPage() {
  const [email, setEmail] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || null);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest text-xs">Cargando vuelos...</div>;
  }

  return (
    <ProgramacionActivaClient
      pilotEmail={email}
      readOnly
      title="Mis Vuelos Programados"
    />
  );
}
