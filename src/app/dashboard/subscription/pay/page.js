'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';

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
            if (data?.user) setUser(data.user);
        }
        loadUser();

        // --- CARGA SECUENCIAL MANUAL ---
        const injectScripts = () => {
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                initEpayco();
                setReady(true);
                return;
            }

            const jquery = document.createElement('script');
            jquery.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            jquery.async = true;
            document.head.appendChild(jquery);

            jquery.onload = () => {
                window.jQuery = window.jQuery || window.$;
                window.$ = window.jQuery;
                
                const epayco = document.createElement('script');
                epayco.src = "https://checkout.epayco.co/epayco.min.js";
                epayco.async = true;
                document.head.appendChild(epayco);

                epayco.onload = () => {
                    if (window.ePayco) {
                        initEpayco();
                        setReady(true);
                        console.log("✅ Motor de Pagos BitaFly Activado");
                    }
                };
            };
        };

        injectScripts();
    }, []);

    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); 
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        setCardNumber(formattedValue.substring(0, 19));
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!ready) return;
        setLoading(true);

        // Forzamos la llave pública antes de la acción
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        const $form = window.jQuery('#epayco-form');

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
                            planId: planId,
                            name: user?.user_metadata?.full_name || "Usuario BitaFly",
                            email: user?.email,
                            userId: user?.id
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 Suscripción Exitosa");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de conexión.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Activando: <span className="text-[#ec5b13]">{planName}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} id="epayco-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="NOMBRE COMPLETO" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email || ""} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-500" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input type="text" data-epayco="card[number]" value={cardNumber} onChange={handleCardNumberChange} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono text-lg font-black" placeholder="0000 0000 0000 0000" />
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
                    {loading ? "PROCESANDO..." : ready ? "ACTIVAR PAGO MENSUAL" : "SINCRONIZANDO..."}
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
        <Suspense fallback={<p className="text-center font-black animate-pulse">CARGANDO...</p>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}