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

        const setupScripts = () => {
            if (window.ePayco && window.jQuery) {
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsReady(true);
                return;
            }

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
                        console.log("✅ ePayco SDK Conectado");
                    }
                };
            };
        };
        setupScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady || loading) return;
        
        setLoading(true);

        // Volvemos a setear la llave para asegurar que el contexto sea correcto
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        const $form = window.jQuery('#epayco-token-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                console.error("Detalle error ePayco:", error);
                alert(`Error: ${error.description || "Datos de tarjeta inválidos"}. Verifique Mes(MM) y Año(YYYY)`);
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
                        alert("🚀 ¡Bienvenido a BitaFly Pro! Suscripción activada.");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de comunicación con el servidor.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none text-left">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 text-left">
                    Plan Seleccionado: <span className="text-[#ec5b13]">{planName}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} id="epayco-token-form" className="space-y-6">
                <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la cuenta</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email || ''} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono text-sm" placeholder="4111 1111 1111 1111" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-left">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mes (MM)</label>
                        <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="12" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Año (YYYY)</label>
                        <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="2030" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CVC</label>
                        <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="123" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading || !isReady} 
                        className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                    >
                        {loading ? "PROCESANDO PAGO..." : "ACTIVAR SUSCRIPCIÓN"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela de pago segura BitaFly" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<p className="text-center font-black animate-pulse">Iniciando...</p>}>
                    <PaymentFormContent />
                </Suspense>
            </section>
        </main>
    );
}