'use client';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bitafly_subscription_expiry_banner_dismissed';

const PLAN_LABELS = { piloto: 'Piloto', escuadrilla: 'Escuadrilla', flota: 'Flota', enterprise: 'Enterprise' };

// Banner de vigencia de la suscripción de PAGO (piloto/escuadrilla/flota) para
// quien puede gestionarla (Gerente General / Piloto Independiente / superadmin
// — ver PERMISSIONS.canManageSubscription). Distinto de GrantExpiringBanner
// (ese es para regalos gratuitos vía free_grants).
//
// Dos estados:
//  - "Vence en N días" (<=7 días, ámbar) — solo se puede descartar por sesión,
//    reaparece al día siguiente mientras siga dentro del umbral.
//  - "Cuenta vencida — se requiere pago" (ya pasó la fecha, rojo) — sin botón
//    de descartar: es un aviso de estado real, no un recordatorio dismisseable.
export default function SubscriptionExpiryBanner() {
  const [status, setStatus] = useState(null); // { daysLeft, expiresAt, planKey }
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/subscription-expiry')
      .then(r => r.json())
      .then(d => { if (d?.show) setStatus(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!status || status.daysLeft <= 0) return;
    const key = `${DISMISS_KEY}:${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) setDismissed(true);
  }, [status]);

  if (!status || status.daysLeft > 7 || dismissed) return null;

  const expired = status.daysLeft <= 0;
  const planLabel = PLAN_LABELS[status.planKey] || status.planKey;
  const expiresLabel = new Date(status.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  const dismiss = () => {
    const key = `${DISMISS_KEY}:${new Date().toDateString()}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  };

  if (expired) {
    return (
      <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <span className="material-symbols-outlined text-red-500 text-xl shrink-0 mt-0.5">error</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-red-800">Cuenta vencida — se requiere pago</p>
          <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
            Tu plan {planLabel} venció el {expiresLabel}. Paga para seguir usando la bitácora digital,
            el control de tu flota y el cumplimiento RAC 100 sin interrupciones.
          </p>
        </div>
        <a href="/dashboard/subscription"
           className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-black uppercase tracking-wide rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap">
          Pagar ahora
        </a>
      </div>
    );
  }

  const daysLabel = `en ${status.daysLeft} día${status.daysLeft !== 1 ? 's' : ''}`;

  return (
    <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
      <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">schedule</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-amber-800">
          Tu plan {planLabel} vence {daysLabel} — {expiresLabel}
        </p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          {status.recurring
            ? 'Tu renovación automática está programada. Si prefieres pagar ahora, puedes hacerlo desde Suscripción.'
            : 'Paga para renovar antes del vencimiento y no perder acceso a tu operación.'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href="/dashboard/subscription"
           className="px-3 py-1.5 bg-amber-500 text-white text-xs font-black uppercase tracking-wide rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap">
          Pagar ahora
        </a>
        <button onClick={dismiss} aria-label="Cerrar"
          className="size-7 flex items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 transition-colors">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
