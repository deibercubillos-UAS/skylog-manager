'use client';

// Redirección de arranque SOLO para la app de Google Play (WebView, UA BitaFlyPlay).
// Al abrir la app en la raíz (bitafly.com/) no debe verse el home de marketing:
//   · con sesión  → /inicio (dashboard)
//   · sin sesión  → /bienvenida (pantalla de bienvenida de la app)
// En un navegador normal no hace nada: isPlayApp() es false y se ve el home como siempre.
// Se despliega por web, así que aplica a las apps ya instaladas. El splash nativo
// (próximo build) cubre el breve instante de la decisión para que no haya parpadeo.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPlayApp } from '@/lib/v2/playApp';
import { supabase } from '@/lib/supabase';

export default function AppLaunchRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isPlayApp()) return;
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        router.replace(data?.session ? '/inicio' : '/bienvenida');
      })
      .catch(() => {
        if (!cancelled) router.replace('/bienvenida');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
