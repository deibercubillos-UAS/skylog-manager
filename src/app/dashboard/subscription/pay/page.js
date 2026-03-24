'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import AuthSidePanel from '@/components/AuthSidePanel';
import Link from 'next/link';

// Sub-componente que maneja la lógica del formulario
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

        // Verificador de carga de las librerías externas (jQuery y ePayco)
        const checkLibs = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsReady(true);
                clearInterval(checkLibs);
            }
        }, 1000);

        return () => clearInterval(checkLibs);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady || loading) return;
        
        setLoading(true);

        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error || !token || !token.id) {
                alert("Error en validación: " + (error?.description || "Datos de tarjeta incompletos"));
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
                        alert("🚀 Suscripción Activada con éxito");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const result = await response.json();
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red con el servidor de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Plan: <span className="text-[#ec5b13]">{planName}</span></p>
            </header>
            
            <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border rounded-2xl outline-none" placeholder="TITULAR TARJETA" />
                <input type="email" data-epayco="card[email]" defaultValue={user?.email || ''} required className="w-full p-4 bg-white border rounded-2xl outline-none" placeholder="EMAIL" />
                <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border rounded-2xl font-mono" placeholder="NÚMERO DE TARJETA" />
                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border rounded-2xl text-center" placeholder="MM" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" placeholder="YYYY" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" placeholder="CVC" />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-30">
                    {loading ? "PROCESANDO..." : "ACTIVAR SUSCRIPCIÓN"}
                </button>
            </form>
        </div>
    );
}

// Componente Principal de la página
export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela de pago BitaFly" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<div className="text-center font-black animate-pulse">SINCROZINANDO...</div>}>
                    <PaymentFormContent />
                </Suspense>
            </section>
        </main>
    );
}