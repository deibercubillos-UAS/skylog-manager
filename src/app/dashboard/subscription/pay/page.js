'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';

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

        // --- CARGA SECUENCIAL FORZADA ---
        const loadScripts = () => {
            // 1. Cargar jQuery
            const jqueryScript = document.createElement('script');
            jqueryScript.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            jqueryScript.async = false; // Carga síncrona para asegurar orden
            document.head.appendChild(jqueryScript);

            jqueryScript.onload = () => {
                // Sincronizar variables globales
                window.$ = window.jQuery;
                console.log("✅ jQuery listo");

                // 2. Cargar ePayco solo después de jQuery
                const epaycoScript = document.createElement('script');
                epaycoScript.src = "https://checkout.epayco.co/epayco.min.js";
                epaycoScript.async = false;
                document.head.appendChild(epaycoScript);

                epaycoScript.onload = () => {
                    console.log("✅ ePayco SDK listo");
                    // 3. Inicializar llave pública
                    if (window.ePayco) {
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        setIsReady(true);
                    }
                };
            };
        };

        loadScripts();

        // Limpieza al salir de la página
        return () => {
            const scripts = document.querySelectorAll('script[src*="epayco"], script[src*="jquery"]');
            scripts.forEach(s => s.remove());
        };
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady) return;

        setLoading(true);
        
        // Re-confirmar llave pública antes de procesar
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // Referencia al formulario vía jQuery (como exige el SDK para el error 101)
        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                console.error("Error SDK:", error);
                alert("Error: " + (error.description || "Datos de tarjeta inválidos"));
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

                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const result = await response.json();
                        alert("Error: " + result.error);
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
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activación del Plan: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email de facturación</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !isReady} 
                    className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all active:scale-95"
                >
                    {loading ? "Verificando..." : "Autorizar Suscripción"}
                </button>

                {!isReady && (
                    <div className="flex items-center justify-center gap-2 mt-4 animate-pulse">
                        <span className="material-symbols-outlined text-slate-400 text-sm">sync</span>
                        <p className="text-[9px] text-center text-slate-400 uppercase font-black">
                            Estableciendo conexión segura con ePayco...
                        </p>
                    </div>
                )}
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Seguridad Bancaria BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p className="text-center font-black animate-pulse uppercase text-xs">Preparando entorno...</p>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}