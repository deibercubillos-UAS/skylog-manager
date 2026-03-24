'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');
    const [card, setCard] = useState({ name: '', email: '', number: '', mm: '', yy: '', cvc: '' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        async function load() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setCard(prev => ({ ...prev, email: data.user.email, name: data.user.user_metadata?.full_name || '' }));
            }
        }
        load();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!window.ePayco) return alert("Cargando pasarela...");
        
        setLoading(true);
        window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);

        // Objeto exacto segun documentacion de tokenización
        const dataToTokenize = {
            "card[number]": card.number.replace(/\s/g, ''),
            "card[exp_month]": card.mm,
            "card[exp_year]": card.yy,
            "card[cvc]": card.cvc,
            "card[name]": card.name,
            "card[email]": card.email
        };

        window.ePayco.token.create(dataToTokenize, async (error, token) => {
            if (error || !token.id) {
                alert("Error de validación de tarjeta. Revisa los datos.");
                setLoading(false);
            } else {
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id, // Enviamos el ID del token
                        planId: planId,
                        name: card.name,
                        email: card.email,
                        userId: user.id
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    alert("🚀 Suscripción Activada");
                    window.location.href = '/dashboard/subscription';
                } else {
                    alert("Error: " + result.error);
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-8 text-left">
            <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
            <Script src="https://checkout.epayco.co/epayco.min.js" strategy="beforeInteractive" />
            
            <h2 className="text-3xl font-black uppercase">Pago Seguro</h2>
            <form onSubmit={handlePayment} className="space-y-4">
                <input required placeholder="TITULAR" className="w-full p-4 bg-white border rounded-2xl" value={card.name} onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                <input required placeholder="EMAIL" className="w-full p-4 bg-white border rounded-2xl" value={card.email} onChange={e => setCard({...card, email: e.target.value})} />
                <input required placeholder="NÚMERO DE TARJETA" className="w-full p-4 bg-white border rounded-2xl font-mono" onChange={e => setCard({...card, number: e.target.value})} />
                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" className="w-full p-4 bg-white border rounded-2xl text-center" onChange={e => setCard({...card, mm: e.target.value})} />
                    <input required placeholder="YYYY" className="w-full p-4 bg-white border rounded-2xl text-center" onChange={e => setCard({...card, yy: e.target.value})} />
                    <input required placeholder="CVC" className="w-full p-4 bg-white border rounded-2xl text-center" onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase">
                    {loading ? "Procesando..." : "Activar Suscripción"}
                </button>
            </form>
        </div>
    );
}

export default function TokenPayPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
      <AuthSidePanel title="Pasarela de pago BitaFly" />
      <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
        <Suspense fallback={<p>Cargando...</p>}><PaymentForm /></Suspense>
      </section>
    </main>
  );
}