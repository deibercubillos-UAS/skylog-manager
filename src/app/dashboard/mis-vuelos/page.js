'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ProgramacionActivaClient from '../programacion-activa/ProgramacionActivaClient';

export const dynamic = 'force-dynamic';

export default function MisVuelosPage() {
  const [email, setEmail] = useState(null);
  const [pilotId, setPilotId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setReady(true); return; }
      setEmail(user.email || null);

      // Perfil → organización, luego localizar la fila pilots vinculada al usuario
      const { data: prof } = await supabase
        .from('profiles').select('organization_id').eq('id', user.id).single();
      if (prof?.organization_id) {
        const { data: pilot } = await supabase
          .from('pilots')
          .select('id')
          .eq('organization_id', prof.organization_id)
          .or(`profile_id.eq.${user.id},owner_id.eq.${user.id},email.eq.${user.email}`)
          .limit(1)
          .maybeSingle();
        setPilotId(pilot?.id || null);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest text-xs">Cargando vuelos...</div>;
  }

  return (
    <ProgramacionActivaClient
      pilotEmail={email}
      pilotId={pilotId}
      readOnly
      title="Mis Vuelos Programados"
    />
  );
}
