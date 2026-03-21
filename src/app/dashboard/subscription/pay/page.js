'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [jqueryLoaded, setJqueryLoaded] = useState(false); // Estado 1
    const [epaycoLoaded, setEpaycoLoaded] = useState(false); // Estado 2
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
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco || !window.jQuery) {
            alert("Los sistemas de seguridad están terminando de cargar. Espera 2 segundos.");
            return;
        }

        setLoading(true);
        initEpayco();

        // Referencia obligatoria por el SDK
        const $form = window.jQuery(e.target);

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + (error.description || "Verifique los datos"));
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
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red en el servidor de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            
            {/* PASO 1: CARGAR JQUERY */}
            <Script 
                src="https://code.jquery.com/jquery-3.7.1.min.js"
                id="jquery-lib"
                strategy="afterInteractive"
                onLoad={() => {
                    console.log("1. jQuery cargado");
                    setJqueryLoaded(true);
                }}
            />

            {/* PASO 2: CARGAR EPAYCO SOLO SI JQUERY YA EXISTE */}
            {jqueryLoaded && (
                <Script 
                    src="https://checkout.epayco.co/epayco.min.js"
                    id="epayco-lib"
                    strategy="afterInteractive"
                    onLoad={() => {
                        console.log("2. ePayco SDK cargado");
                        initEpayco();
                        setEpaycoLoaded(true);
                    }}
                />
            )}

            <AuthSidePanel title={`Finalizar suscripción ${planInfo.name || ''}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase text-[10px] tracking-widest mt-1">Conexión Segura ePayco</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="COMO APARECE EN TARJETA" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="MM" />
                            <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="YYYY" />
                            <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="CVC" />
                        </div>
                        
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading || !epaycoLoaded} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                            >
                                {loading ? "Procesando Seguridad..." : "Activar Pago Mensual"}
                            </button>
                            
                            {!epaycoLoaded && (
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <div className="animate-spin size-4 border-2 border-[#ec5b13] border-t-transparent rounded-full"></div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black animate-pulse">
                                        {!jqueryLoaded ? "Cargando Motor Base..." : "Iniciando Protocolos ePayco..."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}