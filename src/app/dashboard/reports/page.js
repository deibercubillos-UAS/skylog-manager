'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateMasterReport } from '@/lib/reportGenerators';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);
    const [config, setConfig] = useState({
        from: '',
        to: '',
        version: '1.0',
        reportDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        async function loadOrg() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
            setOrgData(org);
        }
        loadOrg();
    }, []);

    const handleGenerate = async () => {
        if (!config.from || !config.to) return alert("Seleccione el rango de fechas");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/master?from=${config.from}&to=${config.to}`);
            const data = await res.json();
            
            generateMasterReport(data, {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate
            });
        } catch (e) {
            alert("Error generando el documento");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-700">
            <header className="border-b pb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Centro de Reportes</h2>
                <p className="text-slate-500">Documentación oficial de aeronavegabilidad.</p>
            </header>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="size-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Formato Máster de Vuelo</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rango de Fechas (Desde / Hasta)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setConfig({...config, from: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setConfig({...config, to: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Control de Documento (Versión / Fecha Cabecera)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input placeholder="Ej: 1.0" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" value={config.version} onChange={e => setConfig({...config, version: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" value={config.reportDate} onChange={e => setConfig({...config, reportDate: e.target.value})} />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all"
                >
                    {loading ? 'SINCRO EN CURSO...' : 'GENERAR REPORTE OFICIAL PDF'}
                </button>
            </div>
        </div>
    );
}