'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

export default function PaymentResponsePage() {
  // 'verifying' | 'confirmed' | 'no_session' | 'error'
  const [status, setStatus]     = useState('verifying');
  const [planName, setPlanName] = useState('');
  const [refPayco, setRefPayco] = useState('');

  useEffect(() => {
    let redirectTimer;

    async function verifyAndRedirect() {
      const params = new URLSearchParams(window.location.search);
      const ref    = params.get('ref_payco') || params.get('x_ref_payco');
      if (ref) {
        setRefPayco(ref);
        // Guardamos la referencia para que manage/page.js la pueda usar si la
        // sesión no está disponible aquí.
        try { sessionStorage.setItem('epayco_pending_ref', ref); } catch {}
      }

      // ── Intentar obtener sesión — con refresh si es necesario ──────────────
      let session = null;
      try {
        const { data: s1 } = await supabase.auth.getSession();
        session = s1.session;
        if (!session) {
          const { data: s2 } = await supabase.auth.refreshSession();
          session = s2.session;
        }
      } catch {}

      if (!session) {
        // Sin sesión: el usuario deberá verificar manualmente desde la página
        // de suscripción después de iniciar sesión.
        setStatus('no_session');
        return;
      }

      // ── Verificar con ePayco y activar plan ────────────────────────────────
      let activatedPlan = null;
      if (ref) {
        try {
          const res  = await fetch('/api/epayco/verify', {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization:  `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ref_payco: ref }),
          });
          const json = await res.json().catch(() => ({}));
          if (json.activated) {
            activatedPlan = json;
            setPlanName(json.planName || '');
            try { sessionStorage.removeItem('epayco_pending_ref'); } catch {}
          }
        } catch (e) {
          console.error('verify-on-return falló:', e);
        }
      }

      try {
        trackEvent('purchase', {
          currency: 'COP',
          transaction_id: ref || 'unknown',
          items: [{ item_id: 'plan_upgrade', item_name: 'BitaFly plan upgrade' }],
        });
      } catch {}

      setStatus('confirmed');

      // ── Si la página está en una pestaña nueva abierta desde manage ────────
      const isPopup = !!window.opener && !window.opener.closed;
      if (isPopup && activatedPlan) {
        try {
          window.opener.postMessage({
            type:     'BITAFLY_PLAN_ACTIVATED',
            planKey:  activatedPlan.planSlug  || '',
            planName: activatedPlan.planName  || '',
            expiresAt: activatedPlan.expiresAt || null,
          }, window.location.origin);
        } catch {}
        // Cerrar esta pestaña luego de mostrar brevemente el mensaje de éxito
        redirectTimer = setTimeout(() => window.close(), 2000);
      } else {
        // Flujo normal: redirigir al dashboard
        redirectTimer = setTimeout(() => {
          sessionStorage.setItem('plan_activated', '1');
          window.location.href = '/dashboard';
        }, 2500);
      }
    }

    verifyAndRedirect();
    return () => clearTimeout(redirectTimer);
  }, []);

  // ── Pantalla: sin sesión ──────────────────────────────────────────────────
  if (status === 'no_session') {
    return (
      <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
          <div className="size-20 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">lock_open</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¡Pago recibido!</h2>
            <p className="text-slate-500 mt-3 text-sm leading-relaxed">
              ePayco procesó tu pago correctamente. Para activar tu plan solo necesitamos
              verificar tu identidad — inicia sesión y lo activamos de inmediato.
            </p>
          </div>
          <a
            href={`/login?next=${encodeURIComponent('/dashboard/subscription')}`}
            className="block w-full py-3.5 bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all">
            Iniciar sesión para activar
          </a>
          {refPayco && (
            <p className="text-xs text-slate-400">Referencia: <strong className="font-mono">{refPayco}</strong></p>
          )}
        </div>
      </div>
    );
  }

  // ── Pantalla: verificando / confirmado ────────────────────────────────────
  const confirmed = status === 'confirmed';
  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-center p-6 text-center font-display">
      <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
        <div className={`size-20 rounded-full flex items-center justify-center mx-auto mb-8 transition-all duration-500 ${confirmed ? 'bg-emerald-100 text-emerald-500' : 'bg-orange-100 text-[#ec5b13]'}`}>
          <span className={`material-symbols-outlined text-4xl ${confirmed ? '' : 'animate-spin'}`}>
            {confirmed ? 'check_circle' : 'sync'}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
          {confirmed ? '¡Pago Confirmado!' : 'Validando Transacción'}
        </h2>
        <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed">
          {confirmed
            ? <>{planName ? <>Plan <strong>{planName}</strong> activado.</> : 'Tu nuevo plan ha sido activado.'}<br/><strong>Cerrando esta ventana...</strong></>
            : <>Estamos confirmando tu pago con el banco.<br/><strong>Tu nuevo plan se activará en unos segundos.</strong></>
          }
        </p>
        <div className="mt-10">
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest animate-pulse">
            {confirmed ? 'Volviendo a BitaFly...' : 'Iniciando sistemas BitaFly Pro...'}
          </p>
        </div>
      </div>
    </div>
  );
}