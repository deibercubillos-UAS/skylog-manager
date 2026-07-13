'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';

const CONSENT_KEY = 'bitafly_cookie_consent';

// Gatea la carga real de GTM/GA/Clarity detrás del consentimiento del usuario
// (SIC Resolución 32.126 de 2022: el consentimiento para cookies analíticas/de
// terceros debe ser previo, expreso e informado — no basta con avisar después
// de haberlas activado). Las cookies esenciales (sesión de Supabase Auth) no
// pasan por aquí: son necesarias para el servicio y no requieren este banner.
export default function CookieConsentManager() {
  const [consent, setConsent] = useState(null); // null = aún no se leyó localStorage

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) || 'pending');
    } catch {
      setConsent('pending');
    }
  }, []);

  function choose(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage bloqueado */ }
    setConsent(value);
  }

  return (
    <>
      {consent === 'accepted' && (
        <>
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-TTT98NMJ"
              height="0" width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          <Script id="gtm" strategy="lazyOnload">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-TTT98NMJ');
          `}</Script>
          {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
          {process.env.NEXT_PUBLIC_CLARITY_ID && (
            <Script id="ms-clarity" strategy="lazyOnload">{`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
            `}</Script>
          )}
        </>
      )}

      {consent === 'pending' && (
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[999] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="max-w-3xl mx-auto bg-[#1A202C] text-slate-200 rounded-2xl shadow-2xl border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-[13px] leading-relaxed flex-1">
              Usamos cookies propias esenciales y, con su autorización, cookies analíticas y de
              terceros para mejorar el sitio. Puede leer el detalle en nuestra{' '}
              <Link href="/politica-cookies" className="text-primary underline underline-offset-2">
                Política de Cookies
              </Link>.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => choose('rejected')}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-[12px] font-bold text-slate-300 hover:border-white/30 transition-colors"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => choose('accepted')}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:brightness-110 transition-all"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
