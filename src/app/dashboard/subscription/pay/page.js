'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentFormContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [isSystemReady, setIsSystemReady] = useState(false); // Control maestro del botón
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');
    const [card, setCard] = useState({ name: '', email: '', number: '', mm: '', yy: '', cvc: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || 'Suscripción');
        
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCard(prev => ({ ...prev, email: data.user.email, name: data.user.user_metadata?.full_name || '' }));
            }
        }
        loadUser();

        // --- CARGA EN CASCADA (MÉTODO INFALIBLE) ---
        const loadLogic = () => {
            // 1. Verificar si ya existen (por navegación previa)
            if (window.ePayco && window.jQuery) {
                window.$ = window.jQuery;
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setIsSystemReady(true);
                return;
            }

            // 2. Inyectar jQuery
            const jquery = document.createElement('script');
            jquery.src = "https://code.jquery.com/jquery-3.7.1.min.js";
            jquery.id = "jq-script";
            document.head.appendChild(jquery);

            jquery.onload = () => {
                window.$ = window.jQuery;
                window.jQuery = window.jQuery;
                console.log("✅ jQuery inyectado y asignado");

                // 3. Inyectar ePayco SOLO después de que jQuery sea funcional
                const epayco = document.createElement('script');
                epayco.src = "https://checkout.epayco.co/epayco.min.js";
                epayco.id = "ep-script";
                document.head.appendChild(epayco);

                epayco.onload = () => {
                    if (window.ePayco) {
                        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                        console.log("✅ ePayco SDK listo");
                        setIsSystemReady(true); // AQUÍ SE ACTIVA EL BOTÓN
                    }
                };
            };
        };

        loadLogic();

        // Limpieza para evitar duplicados al navegar
        return () => {
            const s1 = document.getElementById("jq-script");
            const s2 = document.getElementById("ep-script");
            if (s1) s1.remove();
            if (s2) s2.remove();
        };
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isSystemReady || loading) return;
        setLoading(true);

        // Objeto de datos puro para evitar error 101
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
                alert("Error: " + (error?.description || "Verifique los datos de la tarjeta"));
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
                            userId: user.id,
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        alert("Falla: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Falla de red con el servidor de pagos.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Pago Seguro</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Plan: <span className="text-[#ec5b13]">{planName}</span></p>
            </header>
            
            <form onSubmit={handlePayment} className="space-y-5">
                <input required placeholder="TITULAR DE LA TARJETA" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" value={card.name} onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                <input required type="email" placeholder="EMAIL DE FACTURACIÓN" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm" value={card.email} onChange={e => setCard({...card, email: e.target.value})} />
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" 
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

                <button 
                    type="submit" 
                    disabled={loading || !isSystemReady} 
                    className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                >
                    {loading ? "PROCESANDO..." : isSystemReady ? "ACTIVAR SUSCRIPCIÓN" : "INICIANDO SEGURIDAD..."}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Pasarela de pago segura BitaFly" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <Suspense fallback={<p className="text-center font-black animate-pulse">Cargando...</p>}>
                    <PaymentFormContent />
                </Suspense>
            </section>
        </main>
    );
}