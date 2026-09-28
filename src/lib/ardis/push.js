import 'server-only';
import webpush from 'web-push';
import { createArdisAdminClient } from './admin.js';

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_ARDIS_VAPID_PUBLIC;
  const privateKey = process.env.ARDIS_VAPID_PRIVATE;
  if (!publicKey || !privateKey) {
    throw new Error('Claves VAPID no configuradas (NEXT_PUBLIC_ARDIS_VAPID_PUBLIC / ARDIS_VAPID_PRIVATE)');
  }
  webpush.setVapidDetails('mailto:deibercubillos@gmail.com', publicKey, privateKey);
}

// Envía a todas las suscripciones guardadas; borra las que ya no son válidas
// (404/410 = el navegador/OS canceló la suscripción del lado del cliente).
export async function sendPushToAll(payload) {
  configureWebPush();
  const supabase = createArdisAdminClient();
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) throw new Error(error.message);
  if (!subs?.length) return { sent: 0, removed: 0 };

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
        sent += 1;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          removed += 1;
        }
      }
    })
  );

  return { sent, removed };
}
