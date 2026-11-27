'use client';

// Skylog V2.0 — registro de notificaciones push nativas (solo en la app móvil).
// En web no hace nada (el WebView remoto sí es «native platform»). Pide permiso, crea el
// canal de alta prioridad (para que la notificación salte como ventana flotante / heads-up),
// se registra en FCM y envía el token al servidor (/api/push/register). Todo best-effort:
// cualquier fallo se registra y no afecta a la app.
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function PushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listeners = [];
    let cancelled = false;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Canal de alta importancia: sin él, Android 8+ no muestra la notificación flotante.
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'bitafly_default',
            name: 'Avisos BitaFly',
            description: 'Misiones programadas, recordatorios de vuelo y avisos de seguridad operacional.',
            importance: 5,
            visibility: 1,
          }).catch(() => {});
        }

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted' || cancelled) return;

        const reg = await PushNotifications.addListener('registration', async (token) => {
          try {
            await fetch('/api/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
            });
          } catch { /* best-effort */ }
        });
        const errReg = await PushNotifications.addListener('registrationError', (e) => {
          console.error('[push] error de registro:', e?.error);
        });
        // Al tocar la notificación, llevar a la ruta interna indicada en data.link.
        const tapReg = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const link = action?.notification?.data?.link;
          if (typeof link === 'string' && link.startsWith('/')) window.location.assign(link);
        });
        listeners = [reg, errReg, tapReg];

        await PushNotifications.register();
      } catch (e) {
        console.error('[push] no se pudo inicializar:', e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
      for (const l of listeners) l?.remove?.();
    };
  }, []);

  return null;
}
