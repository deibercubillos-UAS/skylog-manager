'use client';
import { useState } from 'react';

export default function PaymentTestPage() {
    const [card, setCard] = useState({ number: '', name: '', exp: '', cvc: '', docNumber: '' });
    const [loading, setLoading] = useState(false);

    const handleFullPayment = async () => {
        setLoading(true);
        const [month, year] = card.exp.split('/');
        
        const payload = {
            planId: 'plan_escuadrilla_mensual',
            cardInfo: {
                number: card.number.replace(/\s/g, ''),
                exp_year: "20" + year,
                exp_month: month,
                cvc: card.cvc
            },
            customerInfo: { name: card.name, lastName: 'User', docType: 'CC', docNumber: card.docNumber }
        };

        try {
            const res = await fetch('/api/payments/subscribe-sdk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            console.log("🔍 RESPUESTA:", result);

            if (res.ok && result.success) {
                alert("🚀 PROCESO EXITOSO - Revisa Consola");
            } else {
                alert("❌ FALLO: " + result.error);
            }
        } catch (e) {
            alert("💥 CRASH: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-xl mx-auto space-y-6 text-left">
            <h2 className="text-2xl font-black uppercase">Debug ePayco REST</h2>
            <div className="bg-white p-8 rounded-3xl border shadow-xl space-y-4">
                <input className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Nombre" onChange={e => setCard({...card, name: e.target.value})} />
                <input className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Tarjeta" onChange={e => setCard({...card, number: e.target.value})} />
                <div className="grid grid-cols-3 gap-2">
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="MM/AA" onChange={e => setCard({...card, exp: e.target.value})} />
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="CVC" onChange={e => setCard({...card, cvc: e.target.value})} />
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="Cédula" onChange={e => setCard({...card, docNumber: e.target.value})} />
                </div>
                <button onClick={handleFullPayment} disabled={loading} className="w-full py-5 bg-black text-white font-black rounded-2xl">
                    {loading ? 'PROCESANDO...' : 'PROBAR PAGO'}
                </button>
            </div>
        </div>
    );
}
