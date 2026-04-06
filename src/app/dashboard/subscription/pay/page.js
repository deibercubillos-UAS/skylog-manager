'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId') || '', name: params.get('name') || '' });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        const check = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                initEpayco();
                setIsReady(true);
                clearInterval(check);
            }
        }, 1000);
        return () => clearInterval(check);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        const $form = window.jQuery('#customer-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error: " + error.description);
                setLoading(false);
            } else {
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        planId: planInfo.id,
                        name: user?.user_metadata?.full_name || "Usuario",
                        email: user?.email,
                        userId: user?.id
                    })
                });

                if (response.ok) {
                    alert("🚀 Suscripción Exitosa");
                    window.location.href = '/dashboard/subscription';
                } else {
                    const res = await response.json();
                    alert("Error: " + res.error);
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-8 text-left">
            <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
            <Script src="https://checkout.epayco.co/epayco.min.js" strategy="beforeInteractive" />
            <h2 className="text-3xl font-black uppercase">Pago Seguro</h2>
            <form onSubmit={handlePayment} id="customer-form" className="space-y-4">
                <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border rounded-2xl" placeholder="TITULAR TARJETA" />
                <input type="email" data-epayco="card[email]" defaultValue={user?.email} required className="w-full p-4 bg-white border rounded-2xl" />
                <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border rounded-2xl font-mono" placeholder="NÚMERO TARJETA" />
                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border rounded-2xl text-center" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border rounded-2xl text-center" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase">
                    {loading ? "Procesando..." : "Activar Pago"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Pasarela segura BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center text-left">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}