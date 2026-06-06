'use client';
// Ruta consolidada: /dashboard/subscription/manage ahora vive en /dashboard/subscription.
// Mantenemos esta redirección para no romper enlaces antiguos o guardados.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/subscription');
  }, [router]);
  return (
    <div className="p-20 text-center text-slate-400 text-sm font-medium">
      Redirigiendo a tu suscripción…
    </div>
  );
}
