'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateMasterReport } from '@/lib/reportGenerators';
import FileUpload from '@/components/FileUpload';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);
    const [config, setConfig] = useState({
        from: '', to: '', version: '1.0',
        reportDate: new Date().toISOString().split('T')[0],
        formCode: 'F-OPS-002'
    });

    const loadOrg = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
        setOrgData(org);
    };

    useEffect(() => { loadOrg(); }, []);

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', orgData.id);
        loadOrg();
        alert("✅ Logo de empresa actualizado para reportes.");
    };

    const handleGenerate = async () => {
        if (!config.from || !config.to) return alert("Seleccione fechas");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/master?from=${config.from}&to=${config.to}`);
            const data = await res.json();
            generateMasterReport(data, {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate,
                formCode: config.formCode
            });
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Centro de Reportes</h2>
                    <p className="text-slate-500 text-sm">Configuración de exportación oficial RAC 100.</p>
                </div>
                {/* BOTÓN DE LOGO COMPACTO */}
                <div className="w-48">
                    <FileUpload path="org/logos" label="Logo de Empresa" onUploadSuccess={updateLogo} />
                </div>
            </header>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <span className="material-symbols-outlined text-3xl">analytics</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Exportar Máster de Vuelo</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Periodo de Reporte</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setConfig({...config, from: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" onChange={e => setConfig({...config, to: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código del Formato</label>
                        <input placeholder="Ej: F-OPS-002" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase" value={config.formCode} onChange={e => setConfig({...config, formCode: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Versión / Fecha Cabecera</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input placeholder="1.0" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" value={config.version} onChange={e => setConfig({...config, version: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl text-xs font-bold" value={config.reportDate} onChange={e => setConfig({...config, reportDate: e.target.value})} />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] hover:bg-slate-900 transition-all active:scale-95"
                >
                    {loading ? 'GENERANDO ARCHIVO...' : 'DESCARGAR FORMATO MASTER PDF'}
                </button>
            </div>
        </div>
    );
}