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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId') || '', name: params.get('name') || '' });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        // Cargador manual de scripts para asegurar que no fallen las dependencias
        const loadScripts = () => {
            if (window.ePayco && window.jQuery) {
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
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
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        setIsReady(true);
                        console.log("✅ ePayco SDK listo para BitaFly");
                    }
                };
            };
        };
        loadScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Captura manual de los valores del DOM (Evita fallos de sincronización de estado)
        const form = e.target;
        const cardData = {
            "card[number]": form.querySelector('[data-epayco="card[number]"]').value.replace(/\s/g, ''),
            "card[exp_month]": form.querySelector('[data-epayco="card[exp_month]"]').value,
            "card[exp_year]": form.querySelector('[data-epayco="card[exp_year]"]').value,
            "card[cvc]": form.querySelector('[data-epayco="card[cvc]"]').value,
            "card[name]": form.querySelector('[data-epayco="card[name]"]').value,
            "card[email]": user?.email
        };

        console.log("Iniciando tokenización para:", user?.email);

        window.ePayco.token.create(cardData, async (error, token) => {
            if (error || !token || !token.id) {
                console.error("Fallo ePayco:", error);
                alert("Error técnico de pasarela: " + (error?.description || "Datos de tarjeta no aceptados"));
                setLoading(false);
            } else {
                console.log("✅ Token recibido:", token.id);
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
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error en Servidor: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red con el centro de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activación del Plan: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la tarjeta</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" />
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !isReady} 
                    className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all active:scale-95"
                >
                    {loading ? "Validando Seguridad..." : "Autorizar Suscripción"}
                </button>

                {!isReady && (
                    <div className="flex items-center justify-center gap-2 mt-4 animate-pulse">
                        <span className="material-symbols-outlined text-slate-400 text-sm">sync</span>
                        <p className="text-[9px] text-center text-slate-400 uppercase font-black">Conectando con ePayco Secure Gateway...</p>
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