'use client';
import { useState } from 'react';
import { generateMasterReport } from '@/lib/reportGenerators';

export default function ReportsPage() {
    const [dates, setDates] = useState({ from: '', to: '' });
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!dates.from || !dates.to) return alert("Seleccione rango de fechas");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/master?from=${dates.from}&to=${dates.to}`);
            const data = await res.json();
            generateMasterReport(data, "BITAFLY_CORP");
        } catch (e) { alert("Error al generar reporte"); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-700">
            <header className="border-b pb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Centro de Reportes</h2>
                <p className="text-slate-500">Generación de documentación oficial para entes reguladores.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CARD DE REPORTE MÁSTER */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="size-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Formato Máster de Vuelo</h3>
                            <p className="text-xs text-slate-500 font-medium">Historial completo de aeronaves, tripulación y tiempos de vuelo.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setDates({...dates, from: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setDates({...dates, to: e.target.value})} />
                        </div>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all active:scale-95"
                    >
                        {loading ? 'PROCESANDO...' : 'GENERAR REPORTE PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}