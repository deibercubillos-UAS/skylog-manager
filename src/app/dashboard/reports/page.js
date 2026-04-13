'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateMasterReport, generateBatteryReport, generatePilotReport } from '@/lib/reportGenerators';
import FileUpload from '@/components/FileUpload';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);
    const [pilots, setPilots] = useState([]);
    const [selectedPilot, setSelectedPilot] = useState('');
    
    const [config, setConfig] = useState({
        from: '', to: '', version: '1.0',
        reportDate: new Date().toISOString().split('T')[0],
        formCodeMaster: 'F-OPS-002',
        formCodeBattery: 'F-MNT-003',
        formCodePilot: 'F-HUM-005'
    });

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
            const { data: crew } = await supabase.from('pilots').select('id, name').eq('organization_id', prof.organization_id);
            
            setOrgData(org);
            setPilots(crew || []);
            setConfig(prev => ({ 
                ...prev, 
                formCodeMaster: org?.form_code_master || 'F-OPS-002',
                formCodeBattery: org?.form_code_batteries || 'F-MNT-003',
                formCodePilot: org?.form_code_pilots || 'F-HUM-005'
            }));
        }
        init();
    }, []);

    const downloadPilotLog = async () => {
        if (!config.from || !config.to || !selectedPilot) return alert("Seleccione fechas y piloto");
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/pilots?from=${config.from}&to=${config.to}&pilotId=${selectedPilot}`);
            const data = await res.json();
            if (data.length === 0) return alert("No hay vuelos para este piloto en el periodo");
            
            generatePilotReport(data, {
                orgName: orgData?.company_name,
                logoUrl: orgData?.logo_url,
                version: config.version,
                reportDate: config.reportDate,
                formCode: config.formCodePilot
            });
        } finally { setLoading(false); }
    };

    // ... Funciones downloadMaster y downloadBatteries se mantienen igual ...

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
            {/* Header y Filtros Globales (Iguales a los anteriores) */}
            
            <div className="grid grid-cols-1 gap-8">
                {/* REPORTE 1 y 2 (Ya los tiene) */}

                {/* REPORTE 3: BITÁCORA DE PILOTO */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="size-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-3xl">badge</span></div>
                    <div className="flex-1 space-y-3">
                        <h3 className="text-xl font-black uppercase tracking-tight">Bitácora de Piloto</h3>
                        <p className="text-xs text-slate-500">Reporte individual de horas y experiencia por tripulante.</p>
                        <select 
                            className="w-full md:w-64 p-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedPilot}
                            onChange={(e) => setSelectedPilot(e.target.value)}
                        >
                            <option value="">-- Seleccionar Piloto --</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-2">
                        <input className="p-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-center" value={config.formCodePilot} onChange={e => setConfig({...config, formCodePilot: e.target.value})} />
                        <button onClick={downloadPilotLog} disabled={loading} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">Descargar PDF</button>
                    </div>
                </div>
            </div>
        </div>
    );
}