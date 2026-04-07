'use client';
import { useState } from 'react';

export default function SubscriptionCheckout({ planId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [card, setCard] = useState({
        number: '',
        name: '',
        exp: '',
        cvc: '',
        docType: 'CC',
        docNumber: ''
    });

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        const [month, year] = card.exp.split('/');
        
        const payload = {
            planId: planId,
            cardInfo: {
                "card[number]": card.number.replace(/\s/g, ''),
                "card[exp_year]": "20" + year,
                "card[exp_month]": month,
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
                alert("🚀 ¡Suscripción Activada Exitosamente!");
                onSuccess();
            } else {
                alert("❌ Error: " + result.error);
            }
        } catch (error) {
            alert("Error crítico en el proceso de pago");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-500 text-left">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6 text-slate-800">Finalizar Suscripción</h3>
            
            {/* VISTA PREVIA DE TARJETA */}
            <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-black rounded-3xl p-6 text-white mb-8 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-20">
                    <span className="material-symbols-outlined text-6xl">credit_card</span>
                </div>
                <div className="flex flex-col h-full justify-between relative z-10">
                    <div className="flex justify-between items-start">
                        <img src="/logo.png" className="h-8 grayscale brightness-200" alt="BitaFly" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">BitaFly Gold</span>
                    </div>
                    <p className="text-xl font-mono tracking-[0.2em]">
                        {card.number || '**** **** **** ****'}
                    </p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] uppercase opacity-50 font-black">Titular</p>
                            <p className="text-xs font-bold uppercase">{card.name || 'Nombre Apellido'}</p>
                        </div>
                        <div>
                            <p className="text-[8px] uppercase opacity-50 font-black">Vence</p>
                            <p className="text-xs font-bold">{card.exp || 'MM/AA'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre en la Tarjeta</label>
                    <input required className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold uppercase" 
                           onChange={e => setCard({...card, name: e.target.value})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Tarjeta</label>
                    <input required maxLength="19" className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" 
                           placeholder="0000 0000 0000 0000"
                           onChange={e => setCard({...card, number: e.target.value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim()})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Expiración</label>
                        <input required placeholder="MM/AA" maxLength="5" className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" 
                               onChange={e => setCard({...card, exp: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CVC</label>
                        <input required maxLength="4" type="password" placeholder="***" className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" 
                               onChange={e => setCard({...card, cvc: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo</label>
                        <select className="w-full p-3 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase" 
                                onChange={e => setCard({...card, docType: e.target.value})}>
                            <option value="CC">CC</option>
                            <option value="NIT">NIT</option>
                            <option value="CE">CE</option>
                        </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">No. Identificación</label>
                        <input required className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" 
                               onChange={e => setCard({...card, docNumber: e.target.value})} />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] mt-6 transition-all active:scale-95 disabled:opacity-50">
                    {loading ? 'Procesando Pago Seguro...' : 'Activar Suscripción Ahora'}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Pago encriptado por ePayco PCI DSS</span>
                </div>
            </form>
        </div>
    );
}
