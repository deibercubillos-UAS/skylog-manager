'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [scriptReady, setScriptReady] = useState(false);
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

        // Verificador constante: Si el script ya bajó, activa el botón
        const checkInterval = setInterval(() => {
            if (window.ePayco) {
                initEpayco();
                setScriptReady(true);
                clearInterval(checkInterval);
            }
        }, 500);

        return () => clearInterval(checkInterval);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!window.ePayco) return;

        setLoading(true);
        initEpayco();

        // Lógica de Tokenización oficial
        window.ePayco.token.create(e.target, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + (error.description || "Verifica los datos"));
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

                    if (response.ok) {
                        alert("🚀 Suscripción activada correctamente.");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const res = await response.json();
                        alert("Error: " + res.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de conexión.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            {/* URL CORREGIDA SEGÚN DOCUMENTACIÓN OFICIAL */}
            <Script 
                src="https://checkout.epayco.co/epayco.min.js"
                strategy="afterInteractive"
                onReady={() => {
                    initEpayco();
                    setScriptReady(true);
                }}
                onError={() => alert("Error crítico: No se pudo cargar la pasarela de pagos. Revisa tu conexión.")}
            />

            <AuthSidePanel title={`Pago de ${planInfo.name || 'Plan'}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase text-[10px]">Pago seguro procesado por ePayco</p>
                    </header>
                    
                    <form onSubmit={handlePayment} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="NOMBRE EN TARJETA" />
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
                                disabled={loading || !scriptReady} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-30"
                            >
                                {loading ? "Procesando..." : "Activar Suscripción"}
                            </button>
                            
                            {!scriptReady && (
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <div className="animate-spin size-4 border-2 border-[#ec5b13] border-t-transparent rounded-full"></div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black animate-pulse">Sincronizando Pasarela...</p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}