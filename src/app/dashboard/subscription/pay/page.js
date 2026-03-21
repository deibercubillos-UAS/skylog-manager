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
        setPlanInfo({ 
            id: params.get('planId'), 
            name: params.get('name') 
        });
        
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        getUser();

        // Verificador de seguridad para activar el botón si las librerías ya existen
        const checkLibs = setInterval(() => {
            if (window.ePayco && window.$) {
                initEpayco();
                setLibsReady(true);
                clearInterval(checkLibs);
            }
        }, 1000);

        return () => clearInterval(checkLibs);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco || !window.$) {
            alert("Las libreries de seguridad aún no cargan. Por favor espera un momento.");
            return;
        }

        setLoading(true);
        initEpayco();

        // Convertimos el formulario a un objeto de jQuery como exige el SDK de ePayco
        const $form = window.$('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + (error.description || "Datos inválidos"));
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
                        alert("🚀 ¡Suscripción Activada exitosamente!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla: " + (result.error || "Error en el servidor"));
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de conexión con BitaFly Cloud.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            {/* 1. CARGAMOS JQUERY PRIMERO (Requisito de ePayco SDK) */}
            <Script 
                src="https://code.jquery.com/jquery-3.7.1.min.js" 
                strategy="beforeInteractive"
            />
            
            {/* 2. CARGAMOS EL SDK DE EPAYCO DESPUÉS */}
            <Script 
                src="https://checkout.epayco.co/epayco.min.js"
                strategy="afterInteractive"
                onReady={() => {
                    console.log("Librerías listas");
                    initEpayco();
                    setLibsReady(true);
                }}
            />

            <AuthSidePanel title={`Configurar pago: ${planInfo.name || 'Plan'}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10 text-left">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase text-[10px]">Suscripción recurrente vía ePayco</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en Tarjeta</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="TITULAR" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="**** **** **** ****" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-left">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Mes (MM)</label>
                                <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="01" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Año (YYYY)</label>
                                <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="2026" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CVC</label>
                                <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="***" />
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading || !libsReady} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                            >
                                {loading ? "Verificando..." : "Activar Pago Mensual"}
                            </button>
                            
                            {!libsReady && (
                                <p className="text-[9px] text-center text-slate-400 mt-6 uppercase font-black animate-pulse">
                                    Conectando con servidores de pago...
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}