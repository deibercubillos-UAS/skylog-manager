'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [jqueryLoaded, setJqueryLoaded] = useState(false);
    const [epaycoLoaded, setEpaycoLoaded] = useState(false);
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
            alert("Sincronizando seguridad... Por favor espera un segundo.");
            return;
        }

        setLoading(true);
        initEpayco(); // Setea la Public Key

        // El SDK requiere el elemento del formulario directamente vía jQuery
        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                // ePayco devuelve el error detallado aquí
                console.error("Error Token:", error);
                alert("Error en validación: " + (error.description || "Verifica los datos de la tarjeta e email"));
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
                        alert("Error en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red en el proceso de alta.");
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
                strategy="afterInteractive"
                onLoad={() => setJqueryLoaded(true)}
            />

            {jqueryLoaded && (
                <Script 
                    src="https://checkout.epayco.co/epayco.min.js"
                    strategy="afterInteractive"
                    onLoad={() => {
                        initEpayco();
                        setEpaycoLoaded(true);
                    }}
                />
            )}

            <AuthSidePanel title={`Activación de ${planInfo.name || 'Plan'}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase text-[10px] tracking-widest mt-1">Conexión Segura ePayco</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="NOMBRE COMPLETO" />
                        </div>

                        {/* --- CAMBIO CRÍTICO: CAMPO DE EMAIL PARA EL TOKEN --- */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email del Titular</label>
                            <input 
                                type="email" 
                                data-epayco="card[email]" 
                                defaultValue={user?.email || ""} 
                                required 
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" 
                                placeholder="tu@email.com" 
                            />
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
                                disabled={loading || !epaycoLoaded} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                            >
                                {loading ? "Procesando Seguridad..." : "Activar Pago Mensual"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}