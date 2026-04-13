'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateMasterReport, generateBatteryReport } from '@/lib/reportGenerators';
import FileUpload from '@/components/FileUpload';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);
    
    // ESTADO DE CONFIGURACIÓN GLOBAL Y DE CÓDIGOS
    const [config, setConfig] = useState({
        from: '', 
        to: '', 
        version: '1.0',
        reportDate: new Date().toISOString().split('T')[0],
        formCodeMaster: 'F-OPS-002',
        formCodeBattery: 'F-MNT-003'
    });

    const loadOrg = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
        
        setOrgData(org);
        // Sincronizamos los códigos guardados en la base de datos
        setConfig(prev => ({ 
            ...prev, 
            formCodeMaster: org?.form_code_master || 'F-OPS-002',
            formCodeBattery: org?.form_code_batteries || 'F-MNT-003' 
        }));
    };

    useEffect(() => { loadOrg(); }, []);

    // FUNCIÓN PARA DESCARGAR MASTER DE VUELO
    const downloadMaster = async () => {
        if (!config.from || !config.to) return alert("Seleccione rango de fechas");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/master?from=${config.from}&to=${config.to}`);
            const data = await res.json();
            generateMasterReport(data, {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate,
                formCode: config.formCodeMaster
            });
        } catch (e) { alert("Error en reporte de vuelo"); }
        finally { setLoading(false); }
    };

    // FUNCIÓN PARA DESCARGAR REGISTRO DE BATERÍAS
    const downloadBatteries = async () => {
        if (!config.from || !config.to) return alert("Seleccione rango de fechas");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/batteries?from=${config.from}&to=${config.to}`);
            const data = await res.json();
            generateBatteryReport(data, {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate,
                formCode: config.formCodeBattery
            });
        } catch (e) { alert("Error en reporte de energía"); }
        finally { setLoading(false); }
    };

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', orgData.id);
        loadOrg();
        alert("✅ Logo actualizado");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Centro de Reportes</h2>
                    <p className="text-slate-500 text-sm italic">Generación de documentos oficiales RAC 100.</p>
                </div>
                <div className="w-48">
                    <FileUpload path="org/logos" label="Logo para Reportes" onUploadSuccess={updateLogo} />
                </div>
            </header>

            {/* SECCIÓN DE FILTROS GLOBALES */}
            <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-orange-500 ml-1">Periodo (Desde / Hasta)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="p-3 bg-slate-800 rounded-xl border-none text-xs font-bold" onChange={e => setConfig({...config, from: e.target.value})} />
                        <input type="date" className="p-3 bg-slate-800 rounded-xl border-none text-xs font-bold" onChange={e => setConfig({...config, to: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-orange-500 ml-1">Control Documental</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Versión" className="p-3 bg-slate-800 rounded-xl border-none text-xs font-bold" value={config.version} onChange={e => setConfig({...config, version: e.target.value})} />
                        <input type="date" className="p-3 bg-slate-800 rounded-xl border-none text-xs font-bold" value={config.reportDate} onChange={e => setConfig({...config, reportDate: e.target.value})} />
                    </div>
                </div>
                <div className="flex items-end">
                    <p className="text-[8px] text-slate-500 uppercase italic">Configure los datos superiores antes de generar cualquier PDF.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* REPORTE 1: MASTER DE VUELO */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="size-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-3xl">analytics</span></div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black uppercase tracking-tight">Formato Máster de Vuelo</h3>
                        <p className="text-xs text-slate-500 mt-1">Historial detallado de misiones, tripulaciones y horómetros.</p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-2">
                        <input className="p-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-center" value={config.formCodeMaster} onChange={e => setConfig({...config, formCodeMaster: e.target.value})} />
                        <button onClick={downloadMaster} disabled={loading} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">Descargar PDF</button>
                    </div>
                </div>

                {/* REPORTE 2: REGISTRO DE BATERÍAS */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="size-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-3xl">battery_charging_full</span></div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black uppercase tracking-tight">Registro Operacional de Baterías</h3>
                        <p className="text-xs text-slate-500 mt-1">Control de ciclos de carga y descarga vinculado a misiones.</p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-2">
                        <input className="p-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-center" value={config.formCodeBattery} onChange={e => setConfig({...config, formCodeBattery: e.target.value})} />
                        <button onClick={downloadBatteries} disabled={loading} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">Descargar PDF</button>
                    </div>
                </div>
            </div>
        </div>
    );
}