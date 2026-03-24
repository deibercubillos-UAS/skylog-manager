'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { initEpayco } from '@/lib/useEpayco';
import AuthSidePanel from '@/components/AuthSidePanel';
import Script from 'next/script';

function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [planId, setPlanId] = useState('');
    const [planName, setPlanName] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPlanId(params.get('planId') || '');
        setPlanName(params.get('name') || '');
        
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
        }
        getUser();

        // Verificador de librerías y configuración (Importante)
        const loadLibs = () => {
            if (window.ePayco && window.jQuery) {
                console.log("Librerías de pago cargadas con éxito");
                initEpayco();
                setIsReady(true);
            }
        };

        loadLibs();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!isReady) {
            alert("Los sistemas de pago se están cargando. Intenta en unos segundos.");
            return;
        }
        
        setLoading(true);

        // 1. Llamada a la API de tokenización (si la necesitas)
        // ... (Debería estar AQUÍ) ...
        
        // 2. Creación del objeto de datos para ePayco (Verifica que no falte nada)
        const $form = window.jQuery('#payment-form');
        window.ePayco.token.create($form, async (error, token) => { // <<-- LA LLAMADA CLAVE
            if (error || !token || !token.id) {
                console.error("Error ePayco: ", error);
                alert("Error al procesar los datos: " + (error?.description || error?.message || "Error desconocido"));
                setLoading(false);
                return; // Salimos para que no envíe el formulario sin token
            }

            try {
                // 3. Llamada a la API de suscripción con EL TOKEN
                const response = await fetch('/api/payments/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,  // <---- ESTE ES EL TOKEN (Importante)
                        planId: planId,
                        name: user?.user_metadata?.full_name || user?.email || "Usuario",
                        email: user?.email,
                        userId: user?.id,
                    })
                });
            
                if (!response.ok) throw new Error("Error en el servidor: " + response.status);

                const result = await response.json();
                alert("¡Suscripción procesada! Acceso desbloqueado.");
                window.location.href = '/dashboard/subscription';
            } catch (err) {
                console.error("Error en la suscripción", err);
                alert("Error al procesar el pago: " + err.message);
                setLoading(false);
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row font-display">
            <AuthSidePanel title="Control de pagos" />
            <section className="flex-1 p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto space-y-10">
                    <header>
                        <h2 className="text-3xl font-black uppercase">Suscripción Plan {planName}</h2>
                        <p className="text-sm text-slate-500">Ingresa tu información de pago.</p>
                    </header>
                    
                    <form onSubmit={handlePayment} id="payment-form" className="space-y-6">
                        <input type="text" data-epayco="card[name]" required className="w-full p-4 bg-white border rounded-xl" placeholder="Nombre del titular" />
                        <input type="email" data-epayco="card[email]" defaultValue={user?.email || ''} required className="w-full p-4 bg-white border rounded-xl" placeholder="Correo Electrónico" />
                        <input type="text" data-epayco="card[number]" required className="w-full p-4 bg-white border rounded-xl font-mono" placeholder="Número de tarjeta" />
                        <div className="grid grid-cols-3 gap-4">
                            <input type="text" data-epayco="card[exp_month]" maxLength="2" required className="w-full p-4 bg-white border rounded-xl text-center" placeholder="MM" />
                            <input type="text" data-epayco="card[exp_year]" maxLength="4" required className="w-full p-4 bg-white border rounded-xl text-center" placeholder="AAAA" />
                            <input type="text" data-epayco="card[cvc]" maxLength="4" required className="w-full p-4 bg-white border rounded-xl text-center" placeholder="CVC" />
                        </div>
                        <button type="submit" disabled={loading || !isReady} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-xl uppercase" >
                            {loading ? 'Procesando...' : 'Activar Pago'}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}