'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentFormContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    
    const planId = searchParams.get('planId') || '';
    const planName = searchParams.get('name') || 'Suscripción';

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        };
        loadUser();

        // Cargador manual de scripts para asegurar disponibilidad
        const setup = () => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsReady(true);
                return;
            }
            const jq = document.createElement('script');
            jq.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            document.head.appendChild(jq);
            jq.onload = () => {
                window.$ = window.jQuery;
                const ep = document.createElement('script');
                ep.src = "https://checkout.epayco.co/epayco.min.js";
                document.head.appendChild(ep);
                ep.onload = () => {
                    if (window.ePayco) {
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        setIsReady(true);
                    }
                };
            };
        };
        setup();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady || loading) return;
        setLoading(true);

        // RE-INICIALIZACIÓN DE EMERGENCIA (Soluciona error 'words')
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        const $form = window.jQuery('#epayco-form');

        window.ePayco.token.create($form, async (error, token) => {
            // VALIDACIÓN DEFENSIVA: No leer .id si token es null
            if (error || !token || typeof token !== 'object' || !token.id) {
                console.error("Fallo Tokenización:", error);
                alert("Error de seguridad: " + (error?.description || "Los datos de la tarjeta no pudieron ser procesados. Revisa el número y fechas."));
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
                            email: user.email,
                            userId: user.id,
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla técnica: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de conexión con el centro de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Plan: <span className="text-[#ec5b13]">{planName}</span></p>
            </header>
            
            <form onSubmit={handlePayment} id="epayco-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="NOMBRE COMPLETO" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email || ''} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono text-sm" placeholder="0000 0000 0000 0000" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95 transition-all">
                    {loading ? "PROCESANDO SEGURIDAD..." : "ACTUALIZAR Y SUSCRIBIR"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela de pago segura BitaFly" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<p>Cargando...</p>}><PaymentFormContent /></Suspense>
            </section>
        </main>
    );
}