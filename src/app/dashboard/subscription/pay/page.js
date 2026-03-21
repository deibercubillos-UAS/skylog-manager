'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script'; // Importante para cargar la librería

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
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

        // Intentar inicializar si la librería ya existe
        if (window.ePayco) {
            initEpayco();
            setScriptLoaded(true);
        }
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco) {
            alert("El motor de pagos aún se está iniciando. Por favor, espera 3 segundos y vuelve a intentar.");
            return;
        }

        setLoading(true);
        initEpayco(); // Aseguramos que la llave pública esté seteada

        // Lógica de Tokenización oficial de ePayco
        window.ePayco.token.create(e.target, async (error, token) => {
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
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla: " + (result.error || "Error en el servidor"));
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red al procesar el pago.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            {/* CARGA FORZADA DE LA LIBRERÍA EPAYCO */}
            <Script 
                src="https://js.epayco.co/epayco.min.js"
                onLoad={() => {
                    console.log("ePayco SDK Cargado");
                    initEpayco();
                    setScriptLoaded(true);
                }}
            />

            <AuthSidePanel title={`Pago de suscripción ${planInfo.name || ''}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm mt-1">Configuración de cobro recurrente para BitaFly.</p>
                    </header>
                    
                    <form onSubmit={handlePayment} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="NOMBRE COMPLETO" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="**** **** **** ****" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mes (MM)</label>
                                <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="01" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Año (YYYY)</label>
                                <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="2026" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CVC</label>
                                <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="***" />
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading || !scriptLoaded} 
                                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-30"
                            >
                                {loading ? "Procesando Alta..." : "Activar Suscripción"}
                            </button>
                            {!scriptLoaded && (
                                <p className="text-[9px] text-center text-slate-400 mt-4 uppercase font-bold animate-pulse">
                                    Iniciando conexión segura con ePayco...
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}