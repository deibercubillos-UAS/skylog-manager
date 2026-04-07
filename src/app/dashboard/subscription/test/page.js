'use client';
import { useState } from 'react';

export default function TokenTestPage() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const startTest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/payments/static-token');
            const data = await res.json();
            console.log("💎 LOG EPAYCO:", data);
            setResult(data);
        } catch (e) {
            setResult({ error: "Error de red" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-xl mx-auto text-left font-sans">
            <h1 className="text-2xl font-black uppercase mb-2">BitaFly Pay Engine</h1>
            <p className="text-slate-500 text-sm mb-8">Fase 1: Prueba de Tokenización Estática</p>

            <button 
                onClick={startTest} 
                disabled={loading}
                className="w-full py-5 bg-black text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
                {loading ? "CONSULTANDO EPAYCO..." : "GENERAR TOKEN (DATOS FIJOS)"}
            </button>

            {result && (
                <div className="mt-10 p-6 bg-slate-900 rounded-3xl border border-slate-700">
                    <p className="text-emerald-400 text-xs font-mono mb-4">// RESPUESTA RECIBIDA:</p>
                    
                    {result.token_id !== "No generado" ? (
                        <div className="mb-6">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">TOKEN ID:</span>
                            <h2 className="text-white text-xl font-mono break-all">{result.token_id}</h2>
                        </div>
                    ) : (
                        <p className="text-red-400 font-bold mb-4">Error: {result.respuesta_cruda?.message || "Revisa la respuesta cruda"}</p>
                    )}

                    <pre className="text-[10px] text-slate-400 overflow-auto bg-black/30 p-4 rounded-xl">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
