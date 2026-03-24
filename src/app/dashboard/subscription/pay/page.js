'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId') || '', name: params.get('name') || '' });
        async function load() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        load();

        const loadScripts = () => {
            const jquery = document.createElement('script');
            jquery.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            document.head.appendChild(jquery);
            jquery.onload = () => {
                window.$ = window.jQuery;
                const epayco = document.createElement('script');
                epayco.src = "https://checkout.epayco.co/epayco.min.js";
                document.head.appendChild(epayco);
                epayco.onload = () => {
                    if (window.ePayco) {
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        setIsReady(true);
                    }
                };
            };
        };
        loadScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error || !token || !token.id) {
                console.error("Error ePayco:", error);
                alert("Error: " + (error?.description || "No se pudo tokenizar la tarjeta"));
                setLoading(false);
            } else {
                console.log("Token exitoso:", token.id);
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        planId: planInfo.id,
                        name: user?.user_metadata?.full_name || "User",
                        email: user?.email,
                        userId: user?.id
                    })
                });

                if (response.ok) {
                    alert("🚀 Suscripción Exitosa");
                    window.location.href = '/dashboard/subscription';
                } else {
                    const res = await response.json();
                    alert("Servidor dice: " + res.error);
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Plan: <span className="text-[#ec5b13]">{planInfo.name}</span></p>
            </header>
            <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border rounded-2xl outline-none" placeholder="TITULAR TARJETA" />
                <input type="email" data-epayco="card[email]" defaultValue={user?.email} required className="w-full p-4 bg-white border rounded-2xl outline-none" />
                <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border rounded-2xl font-mono" placeholder="NÚMERO TARJETA" />
                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border rounded-2xl text-center" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border rounded-2xl text-center" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border rounded-2xl text-center" />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase">
                    {loading ? "Procesando..." : "Activar Suscripción"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Pasarela de pago BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}