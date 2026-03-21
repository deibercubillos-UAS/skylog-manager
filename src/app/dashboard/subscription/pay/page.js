'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [libsReady, setLibsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');

    const [cardData, setCardData] = useState({
        name: '',
        number: '',
        exp_month: '',
        exp_year: '',
        cvc: '',
        email: ''
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCardData(prev => ({ ...prev, email: data.user.email }));
            }
        }
        getUser();

        // --- VERIFICADOR DE SEGURIDAD PARA LIBRERÍAS ---
        const interval = setInterval(() => {
            if (typeof window.ePayco !== 'undefined' && typeof window.jQuery !== 'undefined') {
                // Sincronizamos $ con jQuery para el SDK de ePayco
                window.$ = window.jQuery; 
                initEpayco();
                setLibsReady(true);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco || !window.$) {
            alert("Los sistemas de seguridad se están sincronizando. Reintenta en 2 segundos.");
            return;
        }

        setLoading(true);
        initEpayco(); 

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
                try {
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

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Plan activado exitosamente!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in duration-500">
            {/* CARGA SECUENCIAL OBLIGATORIA */}
            <Script 
                src="https://code.jquery.com/jquery-3.7.1.min.js"
                strategy="beforeInteractive"
            />
            <Script 
                src="https://checkout.epayco.co/epayco.min.js"
                strategy="afterInteractive"
            />

            <header className="text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-slate-500 text-sm mt-1 font-bold uppercase text-[10px] tracking-widest leading-tight">
                    Activación de suscripción: <span className="text-[#ec5b13]">{planName || '...'}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6 text-left">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="TITULAR" 
                    onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" 
                    onChange={e => setCardData({...cardData, number: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input required maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="MM" onChange={e => setCardData({...cardData, exp_month: e.target.value})} />
                    <input required maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="YYYY" onChange={e => setCardData({...cardData, exp_year: e.target.value})} />
                    <input required maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="CVC" onChange={e => setCardData({...cardData, cvc: e.target.value})} />
                </div>
                
                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading || !libsReady} 
                        className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                    >
                        {loading ? "Sincronizando..." : "Autorizar Suscripción"}
                    </button>
                    {!libsReady && (
                        <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase animate-pulse">Iniciando pasarela segura...</p>
                    )}
                </div>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
      <AuthSidePanel title="Pasarela de pago segura BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<div className="text-center font-black animate-pulse uppercase text-xs">Preparando entorno...</div>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}