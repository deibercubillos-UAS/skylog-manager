'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');

    useEffect(() => {
        // Leer parámetros de la URL
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId'));
        setPlanName(params.get('name'));
        
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        getUser();
        initEpayco(); // Inicializar llave pública
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!window.ePayco) {
            alert("Error: El motor de pagos no ha cargado. Refresca la página.");
            setLoading(false);
            return;
        }

        // --- LÓGICA DE TOKENIZACIÓN (Basada en tu PDF) ---
        window.ePayco.token.create(e.target, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + (error.description || error.message));
                setLoading(false);
            } else {
                // Si la tarjeta es válida, enviamos el TOKEN al Backend para crear la suscripción
                try {
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: user.user_metadata.full_name || "Usuario BitaFly",
                            email: user.email,
                            userId: user.id
                        })
                    });

                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada! Disfruta de BitaFly " + planName);
                        window.location.href = '/dashboard/subscription';
                    } else {
                        const errData = await response.json();
                        alert("Falla en servidor: " + errData.error);
                    }
                } catch (err) {
                    alert("Error de conexión con el servidor de pagos.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            <AuthSidePanel title={`Pago de suscripción ${planName || ''}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                        <p className="text-slate-500 text-sm mt-1">Ingresa los datos para activar tu cobro recurrente.</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="customer-form" className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en la tarjeta</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20 font-bold" placeholder="EJ: CARLOS RUIZ" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono font-bold" placeholder="0000 0000 0000 0000" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mes</label>
                                <input type="text" data-epayco="card[exp_month]" placeholder="MM" maxLength="2" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Año</label>
                                <input type="text" data-epayco="card[exp_year]" placeholder="YYYY" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CVC</label>
                                <input type="text" data-epayco="card[cvc]" placeholder="123" maxLength="4" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center font-bold" />
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50">
                                {loading ? "Procesando Token..." : "Activar Pago Recurrente"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}