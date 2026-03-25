'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId') || '', name: params.get('name') || '' });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        const loadScripts = () => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                initEpayco();
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
                        initEpayco();
                        setIsReady(true);
                    }
                };
            };
        };
        loadScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // RE-INICIALIZAR P_KEY JUSTO ANTES DE TOKENIZAR
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // LECTURA DIRECTA DEL DOM PARA EVITAR ERRORES DE RE-RENDER
        const cardData = {
            "card[number]": document.getElementById('card_number').value.replace(/\s/g, ''),
            "card[exp_month]": document.getElementById('exp_month').value,
            "card[exp_year]": document.getElementById('exp_year').value,
            "card[cvc]": document.getElementById('cvc').value,
            "card[name]": document.getElementById('card_name').value,
            "card[email]": user?.email
        };

        window.ePayco.token.create(cardData, async (error, token) => {
            if (error || !token || !token.id) {
                console.error("Detalle error ePayco:", error);
                alert("Error: " + (error?.description || "Datos de tarjeta no válidos. Revisa número y fechas."));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planInfo.id,
                            name: cardData["card[name]"],
                            email: user.email,
                            userId: user.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 Suscripción Activada Correctamente");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activación de Plan: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                    <input id="card_name" type="text" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input id="card_number" type="text" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="4111 1111 1111 1111" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <input id="exp_month" type="text" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input id="exp_year" type="text" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input id="cvc" type="text" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95 transition-all">
                    {loading ? "Validando Seguridad..." : "Autorizar Pago Mensual"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Pasarela Segura BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}