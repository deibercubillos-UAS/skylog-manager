'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');

    const [cardData, setCardData] = useState({
        name: '', number: '', exp_month: '', exp_year: '', cvc: '', email: ''
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCardData(prev => ({ ...prev, email: data.user.email }));
            }
        };
        loadUser();

        const check = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                initEpayco();
                setReady(true);
                clearInterval(check);
            }
        }, 500);
        return () => clearInterval(check);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        const tokenParams = {
            "card[number]": cardData.number.replace(/\s/g, ''),
            "card[exp_month]": cardData.exp_month,
            "card[exp_year]": cardData.exp_year,
            "card[cvc]": cardData.cvc,
            "card[name]": cardData.name,
            "card[email]": cardData.email
        };

        window.ePayco.token.create(tokenParams, async (error, token) => {
            if (error) {
                alert("Error: " + (error.description || "Datos de tarjeta inválidos"));
                setLoading(false);
            } else {
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        planId: planId,
                        name: cardData.name,
                        email: cardData.email,
                        userId: user.id
                    })
                });

                if (response.ok) {
                    alert("✅ Suscripción Activada");
                    window.location.href = '/dashboard/subscription';
                } else {
                    const res = await response.json();
                    alert("Error: " + res.error);
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10">
            <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
            <Script src="https://checkout.epayco.co/epayco.min.js" strategy="beforeInteractive" />

            <header className="text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Plan: <span className="text-[#ec5b13]">{planName}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6 text-left">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none" onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none" onChange={e => setCardData({...cardData, number: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCardData({...cardData, exp_month: e.target.value})} />
                    <input required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCardData({...cardData, exp_year: e.target.value})} />
                    <input required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" onChange={e => setCardData({...cardData, cvc: e.target.value})} />
                </div>
                <button type="submit" disabled={loading || !ready} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all">
                    {loading ? "Procesando..." : "Autorizar Pago"}
                </button>
                {!ready && <p className="text-[9px] text-center text-slate-400 uppercase animate-pulse">Sincronizando pasarela segura...</p>}
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Pasarela de pago BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}