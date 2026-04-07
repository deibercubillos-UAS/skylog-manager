'use client';
import { useState } from 'react';

export default function SubscriptionCheckout({ planId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [card, setCard] = useState({ number: '', name: '', exp: '', cvc: '', docType: 'CC', docNumber: '' });

    const handleExpChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Solo números
        if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
        setCard({ ...card, exp: val });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        const expParts = card.exp.split('/');
        if (expParts.length !== 2) {
            alert("Formato de fecha inválido (MM/AA)");
            setLoading(false);
            return;
        }

        const payload = {
            planId,
            cardInfo: {
                "card[number]": card.number.replace(/\s/g, ''),
                "card[exp_year]": "20" + expParts[1],
                "card[exp_month]": expParts[0],
                "card[cvc]": card.cvc,
                "hasCvv": true
            },
            customerInfo: {
                name: card.name.split(' ')[0],
                lastName: card.name.split(' ').slice(1).join(' ') || 'User',
                docType: card.docType,
                docNumber: card.docNumber
            }
        };

        try {
            const res = await fetch('/api/payments/subscribe-sdk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                alert("🚀 Suscripción Activada");
                onSuccess();
            } else {
                alert("❌ Error: " + result.error);
            }
        } catch (error) {
            alert("Falla de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl text-left">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Detalles de Pago</h3>
            <form onSubmit={handlePayment} className="space-y-4">
                <input required placeholder="Nombre en tarjeta" className="w-full p-4 bg-slate-50 rounded-xl font-bold uppercase text-sm" 
                       onChange={e => setCard({...card, name: e.target.value})} />
                
                <input required placeholder="0000 0000 0000 0000" maxLength="19" className="w-full p-4 bg-slate-50 rounded-xl font-mono font-bold" 
                       value={card.number} onChange={e => setCard({...card, number: e.target.value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim()})} />

                <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="MM/AA" maxLength="5" className="p-4 bg-slate-50 rounded-xl font-bold" 
                           value={card.exp} onChange={handleExpChange} />
                    <input required placeholder="CVC" maxLength="4" type="password" className="p-4 bg-slate-50 rounded-xl font-bold" 
                           onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-2 border-t pt-4">
                    <select className="p-4 bg-slate-50 rounded-xl font-black text-[10px]" onChange={e => setCard({...card, docType: e.target.value})}>
                        <option value="CC">CC</option>
                        <option value="NIT">NIT</option>
                    </select>
                    <input required placeholder="Número ID" className="col-span-2 p-4 bg-slate-50 rounded-xl font-bold text-sm" 
                           onChange={e => setCard({...card, docNumber: e.target.value})} />
                </div>

                <button disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase">
                    {loading ? 'Validando...' : 'Pagar y Activar'}
                </button>
            </form>
        </div>
    );
}
