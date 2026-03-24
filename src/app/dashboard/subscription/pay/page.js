'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';
import Link from 'next/link';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [scriptsLoaded, setScriptsLoaded] = useState({ jquery: false, epayco: false });
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');
    const [card, setCard] = useState({ name: '', email: '', number: '', mm: '', yy: '', cvc: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCard(prev => ({ ...prev, email: data.user.email, name: data.user.user_metadata?.full_name || '' }));
            }
        }
        loadUser();
    }, []);

    const isReady = scriptsLoaded.jquery && scriptsLoaded.epayco;

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco || !window.jQuery) {
            alert("Sincronizando seguridad. Por favor espera un momento...");
            return;
        }

        setLoading(true);
        // Aseguramos que la llave pública esté seteada justo antes de tokenizar
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

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
                alert("Error de validación: " + (error?.description || "Verifique los datos de la tarjeta"));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: card.name,
                            email: card.email,
                            userId: user.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 Suscripción Activada Correctamente");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red. Intente de nuevo.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            {/* CARGA CONTROLADA DE SCRIPTS */}
            <Script 
                src="https://code.jquery.com/jquery-3.7.1.min.js" 
                strategy="afterInteractive"
                onLoad={() => setScriptsLoaded(prev => ({ ...prev, jquery: true }))}
            />
            <Script 
                src="https://checkout.epayco.co/epayco.min.js" 
                strategy="afterInteractive"
                onLoad={() => setScriptsLoaded(prev => ({ ...prev, epayco: true }))}
            />

            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Plan: <span className="text-[#ec5b13]">{planName}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={card.name} onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email de Facturación</label>
                    <input required type="email" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={card.email} onChange={e => setCard({...card, email: e.target.value})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" onChange={e => setCard({...card, number: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" onChange={e => setCard({...card, mm: e.target.value})} />
                    <input required placeholder="YYYY" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" onChange={e => setCard({...card, yy: e.target.value})} />
                    <input required placeholder="CVC" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !isReady} 
                    className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all active:scale-95"
                >
                    {loading ? "Procesando..." : "Activar Suscripción Mensual"}
                </button>

                {!isReady && (
                    <p className="text-[9px] text-center text-slate-400 uppercase animate-pulse font-bold">
                        Estableciendo conexión segura con la pasarela...
                    </p>
                )}
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
      <AuthSidePanel title="Seguridad Bancaria BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p className="text-center font-black animate-pulse">CARGANDO...</p>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}