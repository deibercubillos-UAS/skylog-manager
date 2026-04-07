'use client';
import { useState } from 'react';

export default function StaticTestPage() {
    const [res, setRes] = useState(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payments/static-token');
            const data = await response.json();
            console.log("%c💎 RESULTADO EPAYCO:", "color: yellow; background: black; font-size: 16px;", data);
            setRes(data);
        } catch (e) {
            setRes({ error: "Error de conexión" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto text-left">
            <h2 className="text-2xl font-black uppercase mb-4">Prueba Estática de Tokenización</h2>
            <p className="mb-8 text-slate-500 text-sm italic">Este botón usa los datos de tarjeta del manual de ePayco (4575...).</p>
            
            <button 
                onClick={runTest} 
                disabled={loading}
                className="bg-[#ec5b13] text-white px-10 py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest active:scale-95 transition-all"
            >
                {loading ? "PROCESANDO SDK..." : "LANZAR PRUEBA ESTÁTICA"}
            </button>

            {res && (
                <div className="mt-10 p-8 bg-black rounded-[2rem] border border-slate-800 shadow-2xl">
                    <p className="text-orange-500 font-mono text-xs mb-4">// RESPUESTA DEL SERVIDOR:</p>
                    {res.token_id && (
                        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Token ID Generado:</span>
                            <span className="text-white font-mono text-xl break-all">{res.token_id}</span>
                        </div>
                    )}
                    <pre className="text-emerald-400 font-mono text-[10px] overflow-auto max-h-60">
                        {JSON.stringify(res, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
