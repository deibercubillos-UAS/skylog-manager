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

    // Estado para los campos de la tarjeta
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
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!window.ePayco) {
            alert("El sistema de pagos se está sincronizando. Espera 2 segundos.");
            return;
        }

        setLoading(true);
        initEpayco(); 

        // --- CONSTRUCCIÓN DEL OBJETO DE TOKENIZACIÓN ---
        // Este método es mucho más seguro en Next.js que usar jQuery
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
                console.error("Error ePayco SDK:", error);
                alert("Error en tarjeta: " + (error.description || "Datos inválidos"));
                setLoading(false);
            } else {
                // Verificamos que el token exista antes de enviarlo al backend
                if (!token || !token.id) {
                    alert("Falla técnica: No se pudo generar el identificador de seguridad. Reintenta.");
                    setLoading(false);
                    return;
                }

                console.log("✅ Token generado:", token.id);

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
                        alert("🚀 ¡BitaFly Pro Activado! Bienvenido a bordo.");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Error: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de comunicación con el servidor.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in duration-500">
            <Script 
                src="https://checkout.epayco.co/epayco.min.js"
                strategy="afterInteractive"
                onReady={() => {
                    initEpayco();
                    setLibsReady(true);
                }}
            />

            <header className="text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                <p className="text-slate-500 text-sm mt-1 font-bold uppercase text-[10px] tracking-widest leading-tight">
                    Activación inmediata del plan: <span className="text-[#ec5b13]">{planName || '...'}</span>
                </p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-6 text-left">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="EJ: CARLOS RUIZ" 
                    onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" 
                    onChange={e => setCardData({...cardData, number: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mes</label>
                        <input required maxLength="2" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="MM" 
                        onChange={e => setCardData({...cardData, exp_month: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Año</label>
                        <input required maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="YYYY" 
                        onChange={e => setCardData({...cardData, exp_year: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CVC</label>
                        <input required maxLength="4" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" placeholder="***" 
                        onChange={e => setCardData({...cardData, cvc: e.target.value})} />
                    </div>
                </div>
                
                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading || !libsReady} 
                        className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-20"
                    >
                        {loading ? "Verificando Seguridad..." : "Autorizar Suscripción"}
                    </button>
                    {!libsReady && (
                        <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase animate-pulse">Conectando con ePayco Secure Cloud...</p>
                    )}
                </div>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
      <AuthSidePanel title="Pasarela de pago segura" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<div className="text-center font-black animate-pulse">CARGANDO...</div>}>
          <PaymentForm />
        </Suspense>
      </section>
    </main>
  );
}