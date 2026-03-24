'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentFormContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    
    const planId = searchParams.get('planId') || '';
    const planName = searchParams.get('name') || 'Suscripción';

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        };
        loadUser();

        // --- CARGA FORZADA DE LIBRERÍAS ---
        const scriptJquery = document.createElement('script');
        scriptJquery.src = "https://code.jquery.com/jquery-3.7.1.min.js";
        scriptJquery.async = true;
        document.head.appendChild(scriptJquery);

        scriptJquery.onload = () => {
            window.$ = window.jQuery;
            const scriptEpayco = document.createElement('script');
            scriptEpayco.src = "https://checkout.epayco.co/epayco.min.js";
            scriptEpayco.async = true;
            document.head.appendChild(scriptEpayco);

            scriptEpayco.onload = () => {
                if (window.ePayco) {
                    window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                    setIsReady(true);
                    console.log("✅ Pasarela BitaFly lista");
                }
            };
        };

        return () => {
            // Limpieza opcional al desmontar
            if (scriptJquery.parentNode) document.head.removeChild(scriptJquery);
        };
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady || loading) return;
        
        setLoading(true);
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // Captura de datos del formulario directamente
        const form = e.target;
        const dataToTokenize = {
            "card[number]": form.querySelector('input[placeholder*="NÚMERO"]').value.replace(/\s/g, ''),
            "card[exp_month]": form.querySelector('input[placeholder="MM"]').value,
            "card[exp_year]": form.querySelector('input[placeholder="YYYY"]').value,
            "card[cvc]": form.querySelector('input[placeholder="CVC"]').value,
            "card[name]": form.querySelector('input[placeholder*="TITULAR"]').value,
            "card[email]": user?.email
        };

        window.ePayco.token.create(dataToTokenize, async (error, token) => {
            if (error || !token || !token.id) {
                alert("Error en tarjeta: " + (error?.description || "Verifique los datos e intente de nuevo."));
                setLoading(false);
            } else {
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: dataToTokenize["card[name]"],
                            email: user.email,
                            userId: user.id,
                        })
                    });

                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const result = await response.json();
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de conexión con el servidor.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Plan: <span className="text-[#ec5b13]">{planName}</span></p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <input required placeholder="TITULAR DE LA TARJETA" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                <input required placeholder="NÚMERO DE LA TARJETA" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono text-sm" />
                
                <div className="grid grid-cols-3 gap-4 text-left">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mes</label>
                        <input required placeholder="MM" maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Año</label>
                        <input required placeholder="YYYY" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CVC</label>
                        <input required placeholder="CVC" maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading || !isReady} 
                        className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 hover:bg-orange-600 transition-all active:scale-95"
                    >
                        {loading ? "PROCESANDO..." : isReady ? "ACTIVAR SUSCRIPCIÓN" : "ESPERANDO SEGURIDAD..."}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela segura BitaFly UAS" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<div className="text-center font-black animate-pulse uppercase text-xs">Cargando Módulo de Pago...</div>}>
                    <PaymentFormContent />
                </Suspense>
            </section>
        </main>
    );
}