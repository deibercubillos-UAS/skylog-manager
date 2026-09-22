'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function ArdisAjustesPage() {
  const router = useRouter();
  const [status, setStatus] = useState('idle'); // idle | pidiendo | activo | denegado | error
  const [supported, setSupported] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
    }
  }, []);

  async function activarAvisos() {
    setStatus('pidiendo');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denegado');
        return;
      }

      const registration = await navigator.serviceWorker.register('/ardis/sw.js', { scope: '/ardis/' });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_ARDIS_VAPID_PUBLIC || ''),
      });

      const json = subscription.toJSON();
      const res = await fetch('/api/ardis/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          device: navigator.userAgent.slice(0, 80),
        }),
      });

      setStatus(res.ok ? 'activo' : 'error');
    } catch {
      setStatus('error');
    }
  }

  async function cerrarSesion() {
    setLoggingOut(true);
    await fetch('/api/ardis/logout', { method: 'POST' });
    router.push('/ardis/entrar');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-8">
      <h1 className="text-2xl font-semibold text-white">Ajustes</h1>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-white">Avisos</h2>
        <p className="mt-1 text-xs text-white/50">
          Resumen del día, vencimientos y cierre — directo a tu teléfono.
        </p>

        {!supported && <p className="mt-3 text-sm text-red-400">Este navegador no soporta avisos push.</p>}

        {supported && (
          <div className="mt-3">
            <button
              onClick={activarAvisos}
              disabled={status === 'pidiendo' || status === 'activo'}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === 'activo' ? 'Avisos activados ✓' : 'Activar avisos'}
            </button>
            {status === 'denegado' && (
              <p className="mt-2 text-xs text-red-400">Permiso de notificaciones denegado.</p>
            )}
            {status === 'error' && <p className="mt-2 text-xs text-red-400">Hubo un error activando los avisos.</p>}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-white">Sesión</h2>
        <button
          onClick={cerrarSesion}
          disabled={loggingOut}
          className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 disabled:opacity-60"
        >
          {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  );
}
