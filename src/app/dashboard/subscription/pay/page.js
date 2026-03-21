'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function TokenPayPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [planInfo, setPlanInfo] = useState({ id: '', name: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanInfo({ id: params.get('planId'), name: params.get('name') });
        
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setProfile(user);
        }
        getProfile();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!window.ePayco) return alert("Cargando pasarela...");

        // 1. Autenticar con la llave pública
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // 2. Tokenizar la tarjeta (Lógica de la imagen que pasaste)
        window.ePayco.token.create(e.target, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + error.description);
                setLoading(false);
            } else {
                // 3. Enviar token a nuestro Backend
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        planId: planInfo.id,
                        name: profile.user_metadata.full_name,
                        email: profile.email,
                        userId: profile.id
                    })
                });

                if (response.ok) {
                    alert("✅ ¡Suscripción Activa! Bienvenido al " + planInfo.name);
                    window.location.href = '/dashboard/subscription';
                } else {
                    alert("Hubo un problema al procesar el alta.");
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
            <AuthSidePanel title={`Configura el pago para tu ${planInfo.name}`} />
            
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-8">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Método de Pago</h2>
                    
                    <form onSubmit={handlePayment} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en la tarjeta</label>
                            <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none" placeholder="Nombre completo" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                            <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-mono" placeholder="0000 0000 0000 0000" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mes</label>
                                <input type="text" data-epayco="card[exp_month]" placeholder="MM" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Año</label>
                                <input type="text" data-epayco="card[exp_year]" placeholder="YYYY" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CVC</label>
                                <input type="text" data-epayco="card[cvc]" placeholder="123" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center" />
                            </div>
                        </div>
                        
                        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest mt-6">
                            {loading ? "Tokenizando..." : "Activar Suscripción Mensual"}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}