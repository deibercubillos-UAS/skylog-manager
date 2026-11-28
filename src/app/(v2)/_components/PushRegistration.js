'use client';

// Skylog V2.0 — registro de notificaciones push nativas (solo en la app móvil).
// En web no hace nada (el WebView remoto sí es «native platform»). Unificado sobre
// Firebase Cloud Messaging (@capacitor-firebase/messaging) para iOS y Android, de modo
// que ambos entreguen un token FCM que `lib/v2/push.js` (FCM HTTP v1) pueda usar.
// Pide permiso, en Android crea el canal de alta prioridad (para que la notificación
// salte como ventana flotante / heads-up), obtiene el token FCM y lo envía al servidor
// (/api/push/register). Todo best-effort: cualquier fallo se registra y no afecta a la app.
//
// iOS además requiere, en el proyecto Xcode: GoogleService-Info.plist en el target,
// la capability «Push Notifications» y el modo de fondo «Remote notifications».
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function PushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listeners = [];
    let cancelled = false;

    // Envía el token (FCM) al servidor. Misma forma para ambas plataformas.
    const sendToken = async (value) => {
      if (!value) return;
      try {
        await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }),
        });
      } catch { /* best-effort */ }
    };

    (async () => {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

        // Canal de alta importancia (Android 8+): sin él no hay notificación flotante.
        // El backend envía con channel_id 'bitafly_default'. importance 5 = Max, visibility 1 = Public.
        if (Capacitor.getPlatform() === 'android') {
          await FirebaseMessaging.createChannel({
            id: 'bitafly_default',
            name: 'Avisos BitaFly',
            description: 'Misiones programadas, recordatorios de vuelo y avisos de seguridad operacional.',
            importance: 5,
            visibility: 1,
          }).catch(() => {});
        }

        let perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await FirebaseMessaging.requestPermissions();
        }
        if (perm.receive !== 'granted' || cancelled) return;

        // El token FCM puede renovarse; escuchamos y además lo pedimos una vez al arrancar.
        const tokenReg = await FirebaseMessaging.addListener('tokenReceived', (e) => {
          sendToken(e?.token);
        });
        // Al tocar la notificación, llevar a la ruta interna indicada en data.link.
        const tapReg = await FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
          const link = action?.notification?.data?.link;
          if (typeof link === 'string' && link.startsWith('/')) window.location.assign(link);
        });
        listeners = [tokenReg, tapReg];

        const { token } = await FirebaseMessaging.getToken();
        if (!cancelled) await sendToken(token);
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
