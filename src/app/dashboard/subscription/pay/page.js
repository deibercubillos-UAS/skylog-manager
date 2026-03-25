'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentFormContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    
    const planId = searchParams.get('planId') || '';
    const planName = searchParams.get('name') || 'Suscripción';

    useEffect(() => {
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        const checkInterval = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsReady(true);
                clearInterval(checkInterval);
            }
        }, 500);
        return () => clearInterval(checkInterval);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady || loading) return;
        
        setLoading(true);

        // Usamos el selector de jQuery sobre el ID del formulario
        const $form = window.jQuery('#epayco-token-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error: " + (error.description || "Verifique los datos del formulario"));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: user?.user_metadata?.full_name || user?.email,
                            email: user?.email,
                            userId: user?.id,
                        })
                    });

                    if (response.ok) {
                        alert("🚀 Suscripción Activada");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const result = await response.json();
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
            <Script src="https://checkout.epayco.co/epayco.min.js" strategy="afterInteractive" />

            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Plan: <span className="text-[#ec5b13]">{planName}</span></p>
            </header>
            
            {/* FORMULARIO ESTRÍCTO CON ATRIBUTOS DATA-EPAYCO */}
            <form onSubmit={handlePayment} id="epayco-token-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email || ''} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                </div>

                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all active:scale-95">
                    {loading ? "PROCESANDO..." : "ACTIVAR PAGO RECURRENTE"}
                </button>

                {!isReady && <p className="text-[9px] text-center text-slate-400 uppercase animate-pulse">Sincronizando seguridad...</p>}
            </form>
        </div>
    );
}

export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela segura BitaFly" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<p>Cargando...</p>}><PaymentFormContent /></Suspense>
            </section>
        </main>
    );
}