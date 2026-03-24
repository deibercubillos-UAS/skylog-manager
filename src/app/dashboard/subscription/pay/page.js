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
        setPlanInfo({ id: params.get('planId'), name: params.get('name') });
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        loadUser();

        // --- CARGA Y VALIDACIÓN DE LIBRERÍAS ---
        const loadScripts = () => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
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
                    }
                };
            };
        };
        loadScripts();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // --- SOLUCIÓN AL ERROR 101 ---
        // ePayco EXIGE el objeto de formulario de jQuery que contenga los data-epayco
        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error: " + (error.description || "Verifique los datos de la tarjeta"));
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
                        const err = await response.json();
                        alert("Error en Servidor: " + err.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de comunicación.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Plan Seleccionado: <span className="text-[#ec5b13]">{planInfo.name}</span>
                </p>
            </header>
            
            {/* El ID y los data-epayco son OBLIGATORIOS para evitar el error 101 */}
            <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Titular</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE EN TARJETA" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mes</label>
                        <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" placeholder="MM" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Año</label>
                        <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" placeholder="YYYY" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CVC</label>
                        <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-black" placeholder="***" />
                    </div>
                </div>

                <button type="submit" disabled={loading || !isReady} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 transition-all active:scale-95">
                    {loading ? "Procesando Token..." : "Activar Suscripción Mensual"}
                </button>
                
                {!isReady && (
                    <p className="text-[9px] text-center text-slate-400 uppercase animate-pulse font-bold">
                        Sincronizando protocolos de seguridad...
                    </p>
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
        <Suspense fallback={<p className="text-center font-black animate-pulse uppercase text-xs">Cargando pasarela...</p>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}