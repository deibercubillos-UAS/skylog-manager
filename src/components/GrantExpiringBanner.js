'use client';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bitafly_grant_banner_dismissed';

// Banner "tu acceso gratuito vence en N días" — aparece cuando quedan 5 días
// o menos (mismo umbral que el cron de recordatorio, ver
// /api/cron/grant-expiring-reminder). Solo aplica a accesos con vencimiento
// individual (regalo de socio o de Master sin organización) — no a quien se
// unió a una organización, que no tiene vencimiento propio.
export default function GrantExpiringBanner() {
  const [status, setStatus] = useState(null); // { daysLeft, expiresAt }
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/grant-expiry')
      .then(r => r.json())
      .then(d => { if (d?.hasGrant) setStatus(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!status) return;
    // Se oculta por sesión de navegador para el día actual — reaparece en
    // una sesión nueva (o al día siguiente) mientras sigan quedando <=5 días.
    const key = `${DISMISS_KEY}:${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) setDismissed(true);
  }, [status]);

  if (!status || status.daysLeft > 5 || dismissed) return null;

  const dismiss = () => {
    const key = `${DISMISS_KEY}:${new Date().toDateString()}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  };

  const expiresLabel = new Date(status.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  const daysLabel = status.daysLeft <= 0 ? 'hoy' : `en ${status.daysLeft} día${status.daysLeft !== 1 ? 's' : ''}`;

  return (
    <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
      <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">schedule</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-amber-800">
          Tu acceso gratuito vence {daysLabel} — {expiresLabel}
        </p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          Suscríbete para no perder tu bitácora digital, el control de tu flota y el cumplimiento RAC 100.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href="/dashboard/subscription"
           className="px-3 py-1.5 bg-amber-500 text-white text-xs font-black uppercase tracking-wide rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap">
          Ver planes
        </a>
        <button onClick={dismiss} aria-label="Cerrar"
          className="size-7 flex items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 transition-colors">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
