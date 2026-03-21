'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [jqueryLoaded, setJqueryLoaded] = useState(false);
    const [epaycoLoaded, setEpaycoLoaded] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('planId');
        const name = params.get('name');
        if (id) setPlanId(id);
        if (name) setPlanName(name);
        
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
        initEpayco(); 

        // CAPTURA DIRECTA DEL FORMULARIO
        const formElement = document.getElementById('payment-form');
        const $form = window.jQuery(formElement);

        // Intentar crear el token
        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                console.error("Error ePayco SDK:", error);
                alert("Error en tarjeta: " + (error.description || "Datos incorrectos"));
                setLoading(false);
            } else {
                // LOG DE DEPURACIÓN EN CONSOLA (F12)
                console.log("Token generado con éxito:", token.id);

                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id, // Enviamos el ID del token generado
                            planId: planId,
                            name: user.user_metadata?.full_name || user.email,
                            email: user.email,
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
                    alert("Error de conexión con el servidor.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10">
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

            <header className="text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-slate-500 text-sm mt-1 font-bold uppercase text-[10px] tracking-widest">
                    Plan: <span className="text-[#ec5b13]">{planName || 'Cargando...'}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email del Titular</label>
                    <input 
                        type="email" 
                        data-epayco="card[email]" 
                        defaultValue={user?.email || ""} 
                        key={user?.email} // Fuerza actualización cuando carga el usuario
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
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Mes</label>
                        <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="MM" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Año</label>
                        <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="YYYY" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CVC</label>
                        <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="CVC" />
                    </div>
                </div>
                
                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading || !epaycoLoaded} 
                        className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                    >
                        {loading ? "Sincronizando..." : "Activar Pago Recurrente"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
      <AuthSidePanel title="Protege tu flota con BitaFly Pro" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<div className="text-center font-black animate-pulse">CARGANDO...</div>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}