'use client';
import { useState } from 'react';

export default function TokenTestPage() {
    const [card, setCard] = useState({ number: '', exp_month: '', exp_year: '', cvc: '' });
    const [loading, setLoading] = useState(false);
    const [tokenResult, setTokenResult] = useState(null);

    const handleTokenize = async (e) => {
        e.preventDefault();
        setLoading(true);
        setTokenResult(null);

        console.log("📡 Iniciando petición de tokenización...");

        try {
            const res = await fetch('/api/payments/debug-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });

            const result = await res.json();
            
            // LOG CLAVE: Aquí verás el número de token
            console.log("💎 RESPUESTA DEL SERVIDOR:", result);
            setTokenResult(result);

            if (result.ok && (result.data.id || result.data.data?.id)) {
                const id = result.data.id || result.data.data?.id;
                console.log("%c🚀 TOKEN GENERADO: " + id, "color: #ec5b13; font-size: 20px; font-weight: bold;");
                alert("¡Token creado con éxito! Revisa la consola (F12)");
            } else {
                console.error("❌ ERROR DE EPAYCO:", result.data);
                alert("Fallo: " + (result.data.description || "Revisa la consola"));
            }
        } catch (error) {
            console.error("💥 CRASH:", error);
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-xl mx-auto text-left">
            <h2 className="text-2xl font-black uppercase mb-6">Paso 1: Generar Token</h2>
            <form onSubmit={handleTokenize} className="bg-white p-8 rounded-3xl border shadow-xl space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Número de Tarjeta</label>
                    <input required className="w-full p-4 bg-slate-50 rounded-xl font-mono" 
                           onChange={e => setCard({...card, number: e.target.value.replace(/\s/g, '')})} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Mes (MM)</label>
                        <input required placeholder="01" className="w-full p-4 bg-slate-50 rounded-xl" 
                               onChange={e => setCard({...card, exp_month: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Año (AAAA)</label>
                        <input required placeholder="2025" className="w-full p-4 bg-slate-50 rounded-xl" 
                               onChange={e => setCard({...card, exp_year: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">CVC</label>
                        <input required className="w-full p-4 bg-slate-50 rounded-xl" 
                               onChange={e => setCard({...card, cvc: e.target.value})} />
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl uppercase tracking-widest">
                    {loading ? 'Tokenizando...' : 'Generar Token ID'}
                </button>
            </form>

            {tokenResult && (
                <div className="mt-8 p-4 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-xs overflow-auto">
                    <p>// Respuesta JSON:</p>
                    <pre>{JSON.stringify(tokenResult, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
