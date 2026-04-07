'use client';
import { useState } from 'react';

export default function TokenTestPage() {
    const [card, setCard] = useState({ number: '', exp_month: '', exp_year: '', cvc: '' });
    const [loading, setLoading] = useState(false);
    const [debug, setDebug] = useState(null);

    const handleTokenize = async (e) => {
        e.preventDefault();
        setLoading(true);
        setDebug("Enviando...");

        try {
            const res = await fetch('/api/payments/debug-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });

            const result = await res.json();
            console.log("🔍 RESPUESTA COMPLETA:", result);
            setDebug(result);

            if (res.ok && (result.id || result.data?.id)) {
                console.log("%c🚀 TOKEN: " + (result.id || result.data?.id), "color: cyan; font-size: 20px;");
                alert("¡Token Generado! Mira la consola.");
            } else {
                alert(`Error: ${result.error || 'Desconocido'}`);
            }
        } catch (error) {
            setDebug("Error de red");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-xl mx-auto text-left">
            <h2 className="text-2xl font-black uppercase mb-6">Módulo de Tokenización 1.0</h2>
            <form onSubmit={handleTokenize} className="bg-white p-8 rounded-3xl border shadow-xl space-y-4">
                <input required placeholder="Tarjeta (Sin espacios)" className="w-full p-4 bg-slate-50 rounded-xl" 
                       onChange={e => setCard({...card, number: e.target.value})} />
                <div className="grid grid-cols-3 gap-4">
                    <input required placeholder="MM" className="p-4 bg-slate-50 rounded-xl" onChange={e => setCard({...card, exp_month: e.target.value})} />
                    <input required placeholder="AAAA" className="p-4 bg-slate-50 rounded-xl" onChange={e => setCard({...card, exp_year: e.target.value})} />
                    <input required placeholder="CVC" className="p-4 bg-slate-50 rounded-xl" onChange={e => setCard({...card, cvc: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-black text-white font-black rounded-2xl">
                    GENERAR TOKEN
                </button>
            </form>

            <div className="mt-8 p-6 bg-slate-900 rounded-2xl">
                <p className="text-xs font-mono text-slate-500 mb-2">// LOG DE RESPUESTA:</p>
                <pre className="text-[10px] text-emerald-400 overflow-auto">
                    {JSON.stringify(debug, null, 2)}
                </pre>
            </div>
        </div>
    );
}
