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
    const [cardNumber, setCardNumber] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
            }
        }
        loadUser();

        // Verificador de carga de las librerías jQuery y ePayco
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

    // Formateador visual de tarjeta: 0000 0000 0000 0000
    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); 
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        setCardNumber(formattedValue.substring(0, 19));
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // Referencia directa al formulario para ePayco
        const $form = window.jQuery('#epayco-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                console.error("Error SDK:", error);
                alert("Error: " + (error.description || "Datos de tarjeta no legibles"));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: user?.user_metadata?.full_name || "Usuario BitaFly",
                            email: user?.email,
                            userId: user?.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red con el servidor.");
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
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activación de Plan: <span className="text-[#ec5b13]">{planName}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} id="epayco-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email de facturación</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email || ""} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input 
                        type="text" 
                        data-epayco="card[number]" 
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        required 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono text-lg font-black" 
                        placeholder="0000 0000 0000 0000" 
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !ready} 
                    className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 disabled:opacity-20 transition-all"
                >
                    {loading ? "Procesando..." : "Activar Pago Mensual"}
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
        <Suspense fallback={<p className="text-center font-black animate-pulse uppercase text-xs">Cargando...</p>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}