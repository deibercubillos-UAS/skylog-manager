'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function ArdisAjustesPage() {
  const [status, setStatus] = useState('idle'); // idle | pidiendo | activo | denegado | error
  const [supported, setSupported] = useState(true);

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

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#111318',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ARDIS — Ajustes</h1>

      {!supported && (
        <p style={{ color: '#f87171', marginTop: '1rem' }}>Este navegador no soporta avisos push.</p>
      )}

      {supported && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={activarAvisos}
            disabled={status === 'pidiendo' || status === 'activo'}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '0.4rem',
              border: 'none',
              background: '#ec5b13',
              color: '#fff',
              fontWeight: 600,
              cursor: status === 'activo' ? 'default' : 'pointer',
              opacity: status === 'pidiendo' ? 0.7 : 1,
            }}
          >
            {status === 'activo' ? 'Avisos activados' : 'Activar avisos'}
          </button>
          {status === 'denegado' && (
            <p style={{ color: '#f87171', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              Permiso de notificaciones denegado.
            </p>
          )}
          {status === 'error' && (
            <p style={{ color: '#f87171', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              Hubo un error activando los avisos.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
