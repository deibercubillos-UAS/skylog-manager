'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/roles';
import FileUpload from '@/components/FileUpload';

// PERFORMANCE: Solo carga jsPDF + ExcelJS (~400 kB) cuando el usuario realmente descarga
const loadReportGenerators = () => import('@/lib/reportGenerators');

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);
    const [pilots, setPilots] = useState([]);
    const [selectedPilot, setSelectedPilot] = useState('');
    const [userRole, setUserRole] = useState(null);
    
    const [config, setConfig] = useState({
        from: '', to: '', version: '1.0',
        reportDate: new Date().toISOString().split('T')[0],
        formCodeMaster: 'F-OPS-002',
        formCodeBattery: 'F-MNT-003',
        formCodePilot: 'F-HUM-005'
    });

    const canViewReports = hasPermission(userRole, 'canViewAudit');
    const canEditLogo = hasPermission(userRole, 'canEditOrg');

   const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
        const { data: crew } = await supabase.from('pilots').select('id, name').eq('organization_id', prof.organization_id);
        
        setUserRole(prof?.role || null);
        setOrgData(org);
        setPilots(crew || []);
        setConfig(prev => ({ 
            ...prev, 
            formCodeMaster: org?.form_code_master || 'F-OPS-002',
            formCodeBattery: org?.form_code_batteries || 'F-MNT-003',
            formCodePilot: org?.form_code_pilots || 'F-HUM-005'
        }));
    };

    useEffect(() => { init(); }, []);

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', orgData.id);
        init();
        alert("✅ Logo actualizado");
    };

    const downloadReport = async (type) => {
        if (!config.from || !config.to) return alert("Seleccione fechas");
        setLoading(true);
        try {
            // Carga el generador de PDFs/Excel y la data del backend en paralelo
            const [{ generateMasterReport, generateBatteryReport, generatePilotReport }, res] = await Promise.all([
                loadReportGenerators(),
                fetch(`/api/reports/${type}?from=${config.from}&to=${config.to}${type === 'pilots' ? `&pilotId=${selectedPilot}` : ''}`)
            ]);
            const data = await res.json();

            const commonConfig = {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate,
            };

            if (type === 'master') generateMasterReport(data, { ...commonConfig, formCode: config.formCodeMaster });
            if (type === 'batteries') generateBatteryReport(data, { ...commonConfig, formCode: config.formCodeBattery });
            if (type === 'pilots') generatePilotReport(data, { ...commonConfig, formCode: config.formCodePilot });

        } catch (e) { alert("Error al generar reporte"); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left pb-20 animate-in fade-in duration-700">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Centro de Reportes</h2>
                    <p className="text-slate-500 text-sm italic">Sistemas de exportación aeronáutica oficial.</p>
                </div>
                {canEditLogo && (
                    <div className="w-48">
                        <FileUpload path="org/logos" label="Actualizar Logo" onUploadSuccess={updateLogo} />
                    </div>
                )}
            </header>

            {/* FILTROS GLOBALES */}
            <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl">
                <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-orange-500 ml-1">Periodo de Auditoría (Desde / Hasta)</label>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="date" className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white" onChange={e => setConfig({...config, from: e.target.value})} />
                        <input type="date" className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white" onChange={e => setConfig({...config, to: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-orange-500 ml-1">Control de Cabecera (Versión / Fecha Reporte)</label>
                    <div className="grid grid-cols-2 gap-3">
                        <input className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white" value={config.version} onChange={e => setConfig({...config, version: e.target.value})} />
                        <input type="date" className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white" value={config.reportDate} onChange={e => setConfig({...config, reportDate: e.target.value})} />
                    </div>
                </div>
            </div>

            {!canViewReports ? (
                <div className="bg-slate-100 p-10 rounded-[2.5rem] border border-slate-200 text-center space-y-4">
                    <span className="material-symbols-outlined text-5xl text-slate-400">lock</span>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Acceso restringido — solo personal gerencial.</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 gap-6">
                {/* REPORTE 1: MASTER */}
                <ReportCard 
                    icon="analytics" title="Máster de Vuelo" desc="Historial completo de la flota y operaciones."
                    formCode={config.formCodeMaster} 
                    onCodeChange={(val) => setConfig({...config, formCodeMaster: val})}
                    onDownload={() => downloadReport('master')}
                    loading={loading}
                />

                {/* REPORTE 2: BATERÍAS */}
                <ReportCard 
                    icon="battery_charging_full" title="Registro de Baterías" desc="Trazabilidad de ciclos y energía por misión."
                    formCode={config.formCodeBattery} 
                    onCodeChange={(val) => setConfig({...config, formCodeBattery: val})}
                    onDownload={() => downloadReport('batteries')}
                    loading={loading}
                />

                {/* REPORTE 3: PILOTOS */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="size-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-3xl">badge</span></div>
                    <div className="flex-1 space-y-4">
                        <h3 className="text-xl font-black uppercase tracking-tight">Bitácora de Piloto</h3>
                        <select 
                            className="w-full md:w-64 p-3 bg-slate-50 rounded-xl text-xs font-black uppercase border-2 border-slate-100"
                            value={selectedPilot} onChange={(e) => setSelectedPilot(e.target.value)}
                        >
                            <option value="">-- Seleccionar Piloto --</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                
                    <div className="w-full md:w-auto flex flex-col gap-2">
                        <input className="p-3 bg-slate-100 rounded-xl text-xs font-black uppercase text-center w-32" value={config.formCodePilot} onChange={e => setConfig({...config, formCodePilot: e.target.value})} />
                        <button onClick={() => downloadReport('pilots')} disabled={loading} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-900 transition-all">Descargar PDF</button>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 mt-6 transition-all hover:border-orange-500/30">
    <div className="size-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0">
        <span className="material-symbols-outlined text-3xl">folder_shared</span>
    </div>
    <div className="flex-1 space-y-3">
        <h3 className="text-xl font-black uppercase tracking-tight">Expediente de Tripulante</h3>
        <p className="text-xs text-slate-500">Hoja de vida completa con anexos digitales y certificados.</p>
        <select 
            className="w-full md:w-64 p-3 bg-slate-50 rounded-xl text-xs font-black uppercase border-2 border-slate-100"
            value={selectedPilot} onChange={(e) => setSelectedPilot(e.target.value)}
        >
            <option value="">-- Seleccionar Tripulante --</option>
            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
    </div>
    <button
        onClick={async () => {
            if(!selectedPilot) return alert("Seleccione un tripulante");
            setLoading(true);
            try {
                const [{ generatePilotDossier }, res] = await Promise.all([
                    loadReportGenerators(),
                    fetch(`/api/reports/crew/expediente?pilotId=${selectedPilot}`)
                ]);
                const pilotData = await res.json();
                generatePilotDossier(pilotData, {
                    orgName: orgData?.company_name,
                    logoUrl: orgData?.logo_url,
                    reportDate: config.reportDate
                });
            } finally { setLoading(false); }
        }}
        disabled={loading}
        className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-900 transition-all"
    > Descargar Expediente </button>
</div>
            </div>
            )}
        </div>
    );
}

function ReportCard({ icon, title, desc, formCode, onCodeChange, onDownload, loading }) {
    return (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="size-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-3xl">{icon}</span></div>
            <div className="flex-1">
                <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
            <div className="w-full md:w-auto flex flex-col gap-2">
                <input className="p-3 bg-slate-100 rounded-xl text-xs font-black uppercase text-center w-32" value={formCode} onChange={e => onCodeChange(e.target.value)} />
                <button onClick={onDownload} disabled={loading} className="px-8 py-4 bg-[#1A202C] text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-orange-600 transition-all">Descargar PDF</button>
            </div>
        </div>
    );
}