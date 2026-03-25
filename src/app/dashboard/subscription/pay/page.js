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
    
    // Captura de datos en tiempo real
    const [card, setCard] = useState({
        name: '', email: '', number: '', mm: '', yy: '', cvc: ''
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId') || '', name: params.get('name') || '' });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCard(prev => ({ ...prev, email: data.user.email, name: data.user.user_metadata?.full_name || '' }));
            }
        }
        loadUser();

        const timer = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                initEpayco();
                setIsReady(true);
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Aseguramos la llave pública
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // --- CONSTRUCCIÓN DEL OBJETO DE DATOS (MÉTODO MÁS ESTABLE) ---
        // Pasamos los nombres de las llaves EXACTOS que espera el SDK de ePayco
        const dataToTokenize = {
            "card[number]": card.number.replace(/\s/g, ''),
            "card[exp_month]": card.mm,
            "card[exp_year]": card.yy,
            "card[cvc]": card.cvc,
            "card[name]": card.name,
            "card[email]": card.email
        };

        window.ePayco.token.create(dataToTokenize, async (error, token) => {
            if (error || !token || !token.id) {
                console.error("Detalle Error ePayco:", error);
                alert("Error: " + (error?.description || "Los datos de la tarjeta son inválidos o falta información."));
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
                            email: card.email,
                            userId: user.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla en Servidor: " + result.error);
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
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in">
            <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
            <Script src="https://checkout.epayco.co/epayco.min.js" strategy="beforeInteractive" />

            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activando: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                    <input required value={card.name} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" 
                    onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input required type="email" value={card.email} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" 
                    onChange={e => setCard({...card, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="4111 1111 1111 1111"
                    onChange={e => {
                        let val = e.target.value.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || '';
                        setCard({...card, number: val.substring(0, 19)});
                    }} value={card.number} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" onChange={e => setCard({...card, mm: e.target.value})} />
                    <input required placeholder="YYYY" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" onChange={e => setCard({...card, yy: e.target.value})} />
                    <input required placeholder="CVC" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>
                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95 transition-all">
                    {loading ? "Procesando seguridad..." : "Activar Pago Mensual"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Seguridad Bancaria BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}