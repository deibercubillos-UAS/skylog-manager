'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [libsReady, setLibsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId'), name: params.get('name') });
        
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        getUser();

        // Verificador robusto de funciones globales
        const checkInterval = setInterval(() => {
            if (typeof window.ePayco !== 'undefined' && typeof window.$ === 'function') {
                console.log("Sistemas de pago en línea");
                initEpayco();
                setLibsReady(true);
                clearInterval(checkInterval);
            }
        }, 800);

        return () => clearInterval(checkInterval);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        // Verificación de seguridad antes de procesar
        if (!window.ePayco || typeof window.$ !== 'function') {
            alert("Error de sincronización. Por favor, refresca la página con F5.");
            return;
        }

        setLoading(true);
        initEpayco();

        // Capturamos el formulario usando la función de jQuery validada
        const $form = window.$('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error de validación: " + (error.description || "Datos de tarjeta incorrectos"));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planInfo.id,
                            name: user?.user_metadata?.full_name || "Usuario BitaFly",
                            email: user?.email,
                            userId: user?.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de comunicación con el centro de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            {/* CARGA SECUENCIAL DE LIBRERÍAS */}
            <Script 
                src="https://code.jquery.com/jquery-3.7.1.min.js" 
                strategy="beforeInteractive" 
            />
            <Script 
                src="https://checkout.epayco.co/epayco.min.js"
                strategy="afterInteractive"
                onReady={() => {
                    if (typeof window.$ === 'function') {
                        initEpayco();
                        setLibsReady(true);
                    }
                }}
            />

            <AuthSidePanel title={`Pago de suscripción: ${planInfo.name || ''}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header className="text-left">
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase text-[10px] tracking-widest mt-1">Conexión Segura ePayco</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="NOMBRE COMPLETO" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="**** **** **** ****" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="MM" />
                            <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="YYYY" />
                            <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="CVC" />
                        </div>
                        
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading || !libsReady} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                            >
                                {loading ? "Procesando Seguridad..." : "Activar Pago Mensual"}
                            </button>
                            
                            {!libsReady && (
                                <p className="text-[9px] text-center text-slate-400 mt-6 uppercase font-black animate-pulse tracking-widest">
                                    Iniciando Protocolos de Seguridad...
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}