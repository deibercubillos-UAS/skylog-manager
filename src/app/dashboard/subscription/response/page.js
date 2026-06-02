'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PaymentResponsePage() {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let redirectTimer;

    async function verifyAndRedirect() {
      // ePayco agrega ?ref_payco=XXX a la URL de retorno
      const params   = new URLSearchParams(window.location.search);
      const refPayco = params.get('ref_payco') || params.get('x_ref_payco');

      // Red de seguridad: validar el pago y activar sin depender del webhook
      if (refPayco) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch('/api/epayco/verify', {
              method:  'POST',
              headers: {
                'Content-Type':  'application/json',
                Authorization:   `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ ref_payco: refPayco }),
            });
          }
        } catch (e) {
          // Si falla, el webhook sigue siendo el camino principal
          console.error('verify-on-return falló:', e);
        }
      }

      setConfirmed(true);
      redirectTimer = setTimeout(() => {
        sessionStorage.setItem('plan_activated', '1');
        window.location.href = '/dashboard';
      }, 2500);
    }

    verifyAndRedirect();
    return () => clearTimeout(redirectTimer);
  }, []);

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
            ? <>Tu nuevo plan ha sido activado.<br/><strong>Regresando al dashboard...</strong></>
            : <>Estamos confirmando tu pago con el banco.<br/><strong>Tu nuevo plan se activará en unos segundos.</strong></>
          }
        </p>
        <div className="mt-10">
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest animate-pulse">
            {confirmed ? 'Redirigiendo al dashboard...' : 'Iniciando sistemas BitaFly Pro...'}
          </p>
        </div>
      </div>
    </div>
  );
}