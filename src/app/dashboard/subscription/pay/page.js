'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
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

        // Verificador de carga de scripts (Según PDF Pág. 3)
        const check = setInterval(() => {
            if (window.ePayco && window.jQuery) {
                window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
                setReady(true);
                clearInterval(check);
            }
        }, 500);
        return () => clearInterval(check);
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Referencia al formulario para ePayco (Pág. 2 del manual)
        const $form = window.jQuery('#customer-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error: " + error.description);
                setLoading(false);
            } else {
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
                    alert("🚀 Suscripción Activada");
                    window.location.href = '/dashboard/subscription';
                } else {
                    const res = await response.json();
                    alert("Error: " + res.error);
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-10 text-left">
            <header>
                <h2 className="text-3xl font-black text-slate-900 uppercase">Método de Pago</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Plan: <span className="text-[#ec5b13]">{planInfo.name}</span></p>
            </header>
            
            <form onSubmit={handlePayment} id="customer-form" className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Titular</label>
                    <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border rounded-2xl font-bold" placeholder="NOMBRE COMPLETO" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                    <input type="email" data-epayco="card[email]" defaultValue={user?.email} required className="w-full p-4 bg-white border rounded-2xl font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Tarjeta</label>
                    <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border rounded-2xl font-mono" placeholder="0000 0000 0000 0000" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <input type="text" data-epayco="card[exp_month]" maxLength="2" required placeholder="MM" className="w-full p-4 bg-white border rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[exp_year]" maxLength="4" required placeholder="YYYY" className="w-full p-4 bg-white border rounded-2xl text-center font-black" />
                    <input type="text" data-epayco="card[cvc]" maxLength="4" required placeholder="CVC" className="w-full p-4 bg-white border rounded-2xl text-center font-black" />
                </div>
                <button type="submit" disabled={loading || !ready} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 disabled:opacity-20 transition-all">
                    {loading ? "Procesando..." : "Activar Pago Mensual"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display text-left">
      <AuthSidePanel title="Seguridad Bancaria BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}