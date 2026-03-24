'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });
    const [card, setCard] = useState({ name: '', number: '', month: '', year: '', cvc: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId'), name: params.get('name') });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        // --- CARGA MANUAL Y SECUENCIAL DE SCRIPTS ---
        const loadScripts = async () => {
            if (window.ePayco && window.jQuery) {
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsReady(true);
                return;
            }

            // 1. Cargar jQuery
            const jquery = document.createElement('script');
            jquery.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            jquery.async = true;
            document.head.appendChild(jquery);

            jquery.onload = () => {
                window.$ = window.jQuery;
                // 2. Cargar ePayco solo después de jQuery
                const epayco = document.createElement('script');
                epayco.src = "https://checkout.epayco.co/epayco.min.js";
                epayco.async = true;
                document.head.appendChild(epayco);

                epayco.onload = () => {
                    if (window.ePayco) {
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        setIsReady(true);
                        console.log("ePayco Ready");
                    }
                };
            };
        };

        loadScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Objeto de datos según el PDF de ePayco
        const tokenParams = {
            "card[number]": card.number.replace(/\s/g, ''),
            "card[exp_month]": card.month,
            "card[exp_year]": card.year,
            "card[cvc]": card.cvc,
            "card[name]": card.name,
            "card[email]": user?.email
        };

        window.ePayco.token.create(tokenParams, async (error, token) => {
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
                            name: card.name,
                            email: user.email,
                            userId: user.id
                        })
                    });

                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const err = await response.json();
                        alert("Error: " + err.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Plan: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <input required placeholder="NOMBRE EN TARJETA" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                <input required placeholder="NÚMERO DE TARJETA" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" onChange={e => setCard({...card, number: e.target.value})} />
                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCard({...card, month: e.target.value})} />
                    <input required placeholder="YYYY" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCard({...card, year: e.target.value})} />
                    <input required placeholder="CVC" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all">
                    {loading ? "Procesando..." : "Activar Suscripción"}
                </button>
                {!isReady && <p className="text-[9px] text-center text-slate-400 uppercase animate-pulse">Sincronizando seguridad...</p>}
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Protección Pro BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}