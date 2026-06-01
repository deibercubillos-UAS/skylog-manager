'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { EPAYCO_PLANS } from '@/lib/planLimits';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

export default function EpaycoCheckout({ planKey, billing = 'monthly', label = 'Activar plan', className = '', user }) {
  const [ready, setReady] = useState(false);
  const handlerRef = useRef(null);

  const initHandler = () => {
    if (typeof window === 'undefined' || !window.ePayco) return;
    handlerRef.current = window.ePayco.checkout.configure({
      key:  process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: process.env.NEXT_PUBLIC_EPAYCO_TEST === 'true',
    });
    setReady(true);
  };

  // Por si el script cargó antes del componente montarse
  useEffect(() => {
    if (window.ePayco) initHandler();
  }, []);

  const handleClick = () => {
    if (!handlerRef.current || !user) return;

    const cfg = EPAYCO_PLANS[planKey]?.[billing];
    if (!cfg) return;

    const reference = `bitafly_${planKey}_${billing}_${user.id}_${Date.now()}`;

    handlerRef.current.open({
      // Datos del producto
      name:        cfg.name,
      description: cfg.description,
      invoice:     reference,
      currency:    'cop',
      amount:      String(cfg.amount),
      tax_base:    String(cfg.taxBase),
      tax:         String(cfg.tax),
      country:     'co',
      lang:        'es',

      // Plan de suscripción (debe existir en ePayco — crea con /api/epayco/plans)
      id_plan:      cfg.epaycoId,
      subscription: true,

      // Checkout embebido (no redirige a otra pestaña)
      external: 'false',

      // URLs
      confirmation: `${SITE_URL}/api/epayco/webhook`,
      response:     `${SITE_URL}/dashboard/subscription/response`,

      // Datos del cliente (pre-rellena el form de ePayco)
      email_billing: user.email || '',
      name_billing:  user.fullName || user.email?.split('@')[0] || '',

      // Extra: planKey, billing, userId → webhook los usa para activar el plan
      extra1: planKey,
      extra2: billing,
      extra3: user.id,
    });
  };

  return (
    <>
      <Script
        src="https://checkout.epayco.co/checkout.js"
        strategy="lazyOnload"
        onLoad={initHandler}
      />
      <button
        onClick={handleClick}
        disabled={!ready}
        className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs py-3.5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        {!ready ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        )}
        {ready ? label : 'Cargando...'}
      </button>
    </>
  );
}
