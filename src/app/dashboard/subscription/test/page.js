'use client';
import { useState } from 'react';

export default function SDKTestPage() {
    const [res, setRes] = useState(null);
    const [loading, setLoading] = useState(false);

    const runSDKTest = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payments/sdk-token');
            const data = await response.json();
            setRes(data);
        } catch (e) {
            setRes({ error: "Error de red o crash del servidor" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto text-left">
            <h1 className="text-2xl font-black uppercase mb-2">Manual SDK Integration</h1>
            <p className="text-slate-500 text-sm mb-8 italic">Paso 1: Tokenización de tarjeta (Datos Fijos)</p>

            <button 
                onClick={runSDKTest} 
                disabled={loading}
                className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
                {loading ? "CONECTANDO CON EPAYCO..." : "EJECUTAR EPAYCO.TOKEN.CREATE()"}
            </button>

            {res && (
                <div className="mt-10 p-6 bg-slate-900 rounded-3xl border border-slate-700">
                    <p className="text-emerald-400 text-xs font-mono mb-4">// RESPUESTA DEL SDK:</p>
                    
                    {res.token_id && res.token_id !== "ERROR_NO_ID" ? (
                        <div className="mb-6">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">TOKEN GENERADO:</span>
                            <h2 className="text-white text-xl font-mono break-all">{res.token_id}</h2>
                        </div>
                    ) : (
                        <p className="text-red-400 font-bold mb-4 uppercase text-xs">Error: El SDK no devolvió un ID válido.</p>
                    )}

                    <pre className="text-[10px] text-slate-400 overflow-auto bg-black/30 p-4 rounded-xl">
                        {JSON.stringify(res, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
