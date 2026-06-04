'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { hasPermission } from '@/lib/roles';
import AerocivilCredentialsSection from '@/components/settings/AerocivilCredentialsSection';
import { toast } from '@/lib/toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [org, setOrg] = useState(null);
    const [profile, setProfile] = useState(null);
    const [aircraft, setAircraft] = useState([]);

    // ── Onboarding Express ──────────────────────────────────────────────
    const [obDownloading, setObDownloading] = useState(false);
    const [obUploading,   setObUploading]   = useState(false);
    const [obResult,      setObResult]      = useState(null); // resultado del import
    const [obError,       setObError]       = useState(null);
    const obFileRef = useRef(null);

    async function handleObDownload() {
        setObDownloading(true);
        setObError(null);
        try {
            const res = await fetch('/api/onboarding/template');
            if (!res.ok) throw new Error('Error descargando la plantilla');
            const blob   = await res.blob();
            const url    = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href     = url;
            anchor.download = `Bitafly-Onboarding-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch (e) {
            setObError(e.message);
        } finally {
            setObDownloading(false);
        }
    }

    async function handleObUpload(file) {
        if (!file) return;
        if (!file.name.endsWith('.xlsx')) { setObError('Solo se aceptan archivos .xlsx'); return; }
        if (file.size > 10_000_000) { setObError('Archivo demasiado grande (máx 10 MB)'); return; }
        setObUploading(true);
        setObError(null);
        setObResult(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res  = await fetch('/api/onboarding/import', { method: 'POST', body: fd });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
            setObResult(body);
        } catch (e) {
            setObError(e.message);
        } finally {
            setObUploading(false);
            if (obFileRef.current) obFileRef.current.value = '';
        }
    }
const [policies, setPolicies] = useState([]);
const [editingPolicy, setEditingPolicy] = useState(null);
const [showPolicyForm, setShowPolicyForm] = useState(false);
const [policyForm, setPolicyForm] = useState({
    insurance_company: '', policy_number: '',
    start_date: '', end_date: '', aircraft_id: ''
});
const [confirmDlg, setConfirmDlg] = useState(null);

    const loadPolicies = async (orgId) => {
    const { data } = await supabase
        .from('insurance_policies')
        .select('*, aircraft:aircraft_id(model, serial_number)')
        .eq('organization_id', orgId)
        .order('end_date', { ascending: true });
    setPolicies(data || []);
};

useEffect(() => {
    async function loadOrgData() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login'; return; }
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', session.user.id).single();
        setProfile(prof);

        // Carga org, aeronaves y pólizas en paralelo — elimina roundtrip secuencial
        const [orgRes, airRes, polRes] = await Promise.all([
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single(),
            supabase.from('aircraft').select('id, model, serial_number').eq('organization_id', prof.organization_id).order('model'),
            supabase.from('insurance_policies')
                .select('*, aircraft:aircraft_id(model, serial_number)')
                .eq('organization_id', prof.organization_id)
                .order('end_date', { ascending: true })
        ]);

        if (orgRes.data) setOrg(orgRes.data);
        setAircraft(airRes.data || []);
        setPolicies(polRes.data || []);
        setLoading(false);
    }
    loadOrgData();
}, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { data: updatedData, error: orgErr } = await supabase
                .from('organizations')
                .update({
                    company_name: org.company_name,
                    tax_id: org.tax_id,
                    tax_id_type: org.tax_id_type,
                    dan_number: org.dan_number,
                    legal_rep: org.legal_rep,
                    operator_email: org.operator_email,
                    phone: org.phone,
                    address: org.address
                })
                .eq('id', profile.organization_id)
                .select();

            if (orgErr) throw orgErr;
            if (!updatedData || updatedData.length === 0) throw new Error("No se pudo persistir el cambio.");

            toast.success("Identidad Corporativa actualizada.");
            setOrg(updatedData[0]);
        } catch (err) {
            toast.error("Error: " + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', org.id);
        setOrg({ ...org, logo_url: url });
        toast.success("Logo actualizado.");
    };

    const openNewPolicy = () => {
    setEditingPolicy(null);
    setPolicyForm({ insurance_company: '', policy_number: '', start_date: '', end_date: '', aircraft_id: '' });
    setShowPolicyForm(true);
};

const openEditPolicy = (p) => {
    setEditingPolicy(p);
    setPolicyForm({
        insurance_company: p.insurance_company || '',
        policy_number: p.policy_number || '',
        start_date: p.start_date || '',
        end_date: p.end_date || '',
        aircraft_id: p.aircraft_id || ''  // vacío = todas
    });
    setShowPolicyForm(true);
};

const savePolicy = async (e) => {
    e.preventDefault();
    if (new Date(policyForm.end_date) <= new Date(policyForm.start_date)) {
        return toast.warn("La fecha fin debe ser posterior a la fecha inicio.");
    }
    try {
        const payload = {
            insurance_company: policyForm.insurance_company,
            policy_number: policyForm.policy_number,
            start_date: policyForm.start_date,
            end_date: policyForm.end_date,
            aircraft_id: policyForm.aircraft_id || null, // null = todas
            organization_id: profile.organization_id
        };
        const { error } = editingPolicy
            ? await supabase.from('insurance_policies').update(payload).eq('id', editingPolicy.id)
            : await supabase.from('insurance_policies').insert([payload]);

        if (error) throw error;
        setShowPolicyForm(false);
        await loadPolicies(profile.organization_id);
        toast.success(`Póliza ${editingPolicy ? 'actualizada' : 'registrada'}.`);
    } catch (err) {
        toast.error("Error: " + err.message);
    }
};

const deletePolicy = (p) => {
    setConfirmDlg({
        isOpen: true,
        title: 'Eliminar póliza',
        message: `¿Eliminar la póliza ${p.policy_number}?`,
        confirmText: 'Eliminar',
        danger: true,
        onConfirm: async () => {
            setConfirmDlg(null);
            const { error } = await supabase.from('insurance_policies').delete().eq('id', p.id);
            if (error) return toast.error("Error: " + error.message);
            await loadPolicies(profile.organization_id);
        }
    });
};

const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">Sincronizando Identidad...</div>;

    if (!hasPermission(profile?.role, 'canEditOrg')) {
        return (
            <div className="max-w-xl mx-auto mt-20 bg-slate-100 p-10 rounded-[2.5rem] border border-slate-200 text-center space-y-4">
                <span className="material-symbols-outlined text-5xl text-slate-400">lock</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-700">Acceso restringido</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Esta sección requiere permisos de Gerente General.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-700 pb-20 px-2 md:px-0">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />
            <header className="flex justify-between items-end border-b pb-6 px-2 md:px-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Configurar Organización</h2>
<p className="text-slate-500 text-xs md:text-sm font-bold uppercase mt-2 tracking-widest">Identidad Legal y Pólizas de Seguro</p>
                </div>
            </header>

            {/* ── INICIO RÁPIDO — Onboarding Express ─────────────────── */}
            <section className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-orange-600/20 to-transparent">
                    <span className="material-symbols-outlined text-2xl text-orange-400">rocket_launch</span>
                    <div>
                        <p className="text-sm font-black text-white">Inicio Rápido — Onboarding Express</p>
                        <p className="text-xs text-slate-400">¿Tienes tu información en Excel? Descarga la plantilla, llénala y súbela para configurar todo en un paso.</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Pasos visuales */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { icon: 'download', label: '1. Descargar', desc: 'Plantilla .xlsx con 8 hojas guiadas' },
                            { icon: 'edit',     label: '2. Llenar',    desc: 'Org · Tripulación · Flota · Baterías · más' },
                            { icon: 'upload_file', label: '3. Subir',  desc: 'Bitafly importa todo automáticamente' },
                        ].map(s => (
                            <div key={s.icon} className="bg-slate-700/50 rounded-xl p-3">
                                <span className="material-symbols-outlined text-xl text-orange-400 block mb-1">{s.icon}</span>
                                <p className="text-xs font-black text-white">{s.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Botones */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleObDownload}
                            disabled={obDownloading}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50
                                text-white text-xs font-black uppercase tracking-wide rounded-xl px-4 py-2.5 transition-colors">
                            {obDownloading
                                ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-sm">download</span>
                            }
                            {obDownloading ? 'Generando...' : 'Descargar plantilla .xlsx'}
                        </button>

                        <input ref={obFileRef} type="file" accept=".xlsx" className="hidden"
                            onChange={e => handleObUpload(e.target.files?.[0])} />
                        <button
                            type="button"
                            onClick={() => obFileRef.current?.click()}
                            disabled={obUploading}
                            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50
                                text-white text-xs font-black uppercase tracking-wide rounded-xl px-4 py-2.5 transition-colors">
                            {obUploading
                                ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-sm">upload_file</span>
                            }
                            {obUploading ? 'Importando...' : 'Subir plantilla llenada'}
                        </button>
                    </div>

                    {/* Error */}
                    {obError && (
                        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                            <p className="text-xs text-red-300">{obError}</p>
                            <button onClick={() => setObError(null)} className="ml-auto text-slate-500 hover:text-white">
                                <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                        </div>
                    )}

                    {/* Resultado del import */}
                    {obResult && (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                                <p className="text-sm font-black text-white">
                                    Importación completada — {obResult.totalCreated} registros creados
                                    {obResult.totalSkipped > 0 && `, ${obResult.totalSkipped} omitidos (ya existían)`}
                                </p>
                                <button onClick={() => setObResult(null)} className="ml-auto text-slate-500 hover:text-white">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {[
                                    { key: 'org',         label: 'Organización', icon: 'business',       val: obResult.results?.org?.updated ? 'Actualizada' : 'Sin cambios' },
                                    { key: 'flota',       label: 'Aeronaves',    icon: 'flight',          val: `+${obResult.results?.flota?.created || 0}` },
                                    { key: 'tripulacion', label: 'Pilotos',      icon: 'group',           val: `+${obResult.results?.tripulacion?.created || 0}` },
                                    { key: 'baterias',    label: 'Baterías',     icon: 'battery_charging_full', val: `+${obResult.results?.baterias?.created || 0}` },
                                    { key: 'polizas',     label: 'Pólizas RCE',  icon: 'shield',          val: `+${obResult.results?.polizas?.created || 0}` },
                                    { key: 'contactos',   label: 'Contactos',    icon: 'emergency',       val: `+${obResult.results?.contactos?.created || 0}` },
                                    { key: 'bitacora',    label: 'Vuelos',       icon: 'menu_book',       val: `+${obResult.results?.bitacora?.inserted || 0}` },
                                ].map(item => (
                                    <div key={item.key} className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-slate-400">{item.icon}</span>
                                        <div>
                                            <p className="text-[10px] text-slate-400">{item.label}</p>
                                            <p className="text-xs font-black text-emerald-400">{item.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Errores por sección */}
                            {Object.entries(obResult.results || {}).some(([, v]) => v?.errors?.length > 0) && (
                                <details className="mt-1">
                                    <summary className="text-xs text-orange-400 cursor-pointer font-semibold">Ver advertencias</summary>
                                    <div className="mt-2 space-y-1">
                                        {Object.entries(obResult.results).map(([section, v]) =>
                                            (v?.errors || []).map((e, i) => (
                                                <p key={`${section}-${i}`} className="text-[11px] text-orange-300">
                                                    [{section}] {e}
                                                </p>
                                            ))
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                
                {/* COLUMNA IZQUIERDA: LOGO Y CÓDIGO (Apilado en mobile) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="size-28 md:size-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6">
                            {org.logo_url ? (
                                <img src={org.logo_url} className="size-full object-contain p-2" alt="Logo" loading="lazy" decoding="async" />
                            ) : (
                                <span className="material-symbols-outlined text-4xl text-slate-300">business</span>
                            )}
                        </div>
                        <FileUpload path="org/logos" label="Actualizar Logo Corporativo" onUploadSuccess={updateLogo} />
                    </div>

                    <div className="bg-[#1A202C] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-white space-y-4">
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">NIT · Código de acceso</p>
                            <p className="text-xl md:text-2xl font-mono font-black text-orange-500 mt-1">{org.unique_code}</p>
                            <p className="text-xs text-slate-400 mt-2 uppercase leading-tight italic">
                                Comparte este NIT con tu tripulación para que se vinculen.
                            </p>
                        </div>
                        {org.slug && (
                            <div className="border-t border-white/10 pt-4">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">URL pública VOR/MOR</p>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-mono text-sky-400 break-all">bitafly.com/vor/<span className="font-black">{org.slug}</span></p>
                                    <p className="text-xs font-mono text-rose-400 break-all">bitafly.com/mor/<span className="font-black">{org.slug}</span></p>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 italic">El slug se genera automáticamente del nombre de la empresa.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: FORMULARIO TÉCNICO-LEGAL */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <h4 className="col-span-full text-xs font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">01. Datos de Registro</h4>
                            
                            <div className="col-span-full space-y-1">
                                <label htmlFor="org-company-name" className="text-xs font-black uppercase text-slate-600 ml-1">Razón Social</label>
                                <input id="org-company-name" required className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.company_name || ''} onChange={e => setOrg({...org, company_name: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="org-tax-id-type" className="text-xs font-black uppercase text-slate-600 ml-1">Tipo Identificación</label>
                                <select
                                    id="org-tax-id-type"
                                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                    value={org.tax_id_type || 'NIT'}
                                    onChange={e => setOrg({...org, tax_id_type: e.target.value})}
                                >
                                    <option value="NIT">NIT (Empresa)</option>
                                    <option value="CC">Cédula (Persona Natural)</option>
                                    <option value="PP">Pasaporte</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="org-tax-id" className="text-xs font-black uppercase text-slate-600 ml-1">N° Documento</label>
                                <input id="org-tax-id" required className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.tax_id || ''} onChange={e => setOrg({...org, tax_id: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="org-dan" className="text-xs font-black uppercase text-slate-600 ml-1">N° Explotador (DAN)</label>
                                <input id="org-dan" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.dan_number || ''} onChange={e => setOrg({...org, dan_number: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="org-legal-rep" className="text-xs font-black uppercase text-slate-600 ml-1">Representante Legal</label>
                                <input id="org-legal-rep" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.legal_rep || ''} onChange={e => setOrg({...org, legal_rep: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4">
                            <h4 className="col-span-full text-xs font-black text-orange-600 uppercase tracking-[0.2em] border-b pb-2">02. Contacto Administrativo</h4>

                            <div className="space-y-1">
                                <label htmlFor="org-email" className="text-xs font-black uppercase text-slate-600 ml-1">Email Corporativo</label>
                                <input id="org-email" type="email" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.operator_email || ''} onChange={e => setOrg({...org, operator_email: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="org-phone" className="text-xs font-black uppercase text-slate-600 ml-1">Teléfono</label>
                                <input id="org-phone" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.phone || ''} onChange={e => setOrg({...org, phone: e.target.value})} />
                            </div>

                            <div className="col-span-full space-y-1">
                                <label htmlFor="org-address" className="text-xs font-black uppercase text-slate-600 ml-1">Dirección Oficial</label>
                                <input id="org-address" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={org.address || ''} onChange={e => setOrg({...org, address: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            disabled={updating}
                            type="submit" 
                            className="w-full py-4 md:py-5 bg-slate-900 text-white font-black rounded-2xl md:rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-orange-600 active:scale-95"
                        >
                            {updating ? 'SINCRONIZANDO...' : 'ACTUALIZAR IDENTIDAD CORPORATIVA'}
                        </button>
                    </div>
                </div>
            </form>
            {/* SECCIÓN PÓLIZAS DE SEGURO */}
<section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
    <header className="flex justify-between items-center border-b pb-4">
        <div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900">Pólizas de Seguro</h3>
            <p className="text-slate-400 text-xs font-black uppercase mt-1">{policies.length} pólizas registradas</p>
        </div>
        <button 
            onClick={openNewPolicy}
            className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
        >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Nueva Póliza
        </button>
    </header>

    {policies.length === 0 ? (
        <div className="p-10 text-center text-slate-300 italic font-bold uppercase text-xs tracking-widest">
            No hay pólizas registradas todavía.
        </div>
    ) : (
        <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100 -mx-6">
                {policies.map(p => {
                    const days = daysUntil(p.end_date);
                    const stateCls = days < 0 ? 'bg-red-50 text-red-600' : days < 30 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600';
                    const stateLabel = days < 0 ? 'VENCIDA' : days < 30 ? `VENCE EN ${days}D` : 'VIGENTE';
                    return (
                        <div key={p.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">{p.insurance_company}</p>
                                    <p className="text-xs font-mono text-slate-500 mt-0.5">{p.policy_number}</p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black ${stateCls}`}>{stateLabel}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-bold">
                                {p.aircraft_id
                                    ? <span>{p.aircraft?.model} · {p.aircraft?.serial_number}</span>
                                    : <span className="text-orange-600">Toda la flota</span>
                                }
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">{p.start_date} → {p.end_date}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditPolicy(p)} className="size-11 rounded-xl bg-slate-50 inline-flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors active:scale-95">
                                        <span className="material-symbols-outlined text-base">edit_square</span>
                                    </button>
                                    <button onClick={() => deletePolicy(p)} className="size-11 rounded-xl bg-red-50 inline-flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                            <th className="px-4 py-3">Aseguradora</th>
                            <th className="px-4 py-3">N° Póliza</th>
                            <th className="px-4 py-3">Vigencia</th>
                            <th className="px-4 py-3">Aeronave</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {policies.map(p => {
                            const days = daysUntil(p.end_date);
                            const stateCls = days < 0 ? 'bg-red-50 text-red-600' : days < 30 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600';
                            const stateLabel = days < 0 ? 'VENCIDA' : days < 30 ? `VENCE EN ${days}D` : 'VIGENTE';
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 text-xs">
                                    <td className="px-4 py-3 font-bold text-slate-900">{p.insurance_company}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{p.policy_number}</td>
                                    <td className="px-4 py-3 text-xs">{p.start_date} → {p.end_date}</td>
                                    <td className="px-4 py-3 text-xs font-bold">
                                        {p.aircraft_id ? `${p.aircraft?.model} (${p.aircraft?.serial_number})` : <span className="text-orange-600">TODA LA FLOTA</span>}
                                    </td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-black ${stateCls}`}>{stateLabel}</span></td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openEditPolicy(p)} className="size-11 rounded-xl bg-slate-50 inline-flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors mr-1 active:scale-95">
                                            <span className="material-symbols-outlined text-base">edit_square</span>
                                        </button>
                                        <button onClick={() => deletePolicy(p)} className="size-11 rounded-xl bg-red-50 inline-flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )}
</section>

{/* SECCIÓN CUENTA AEROCIVIL */}
{profile && <AerocivilCredentialsSection orgId={profile.organization_id} role={profile.role} />}

{/* MODAL PANEL DE PÓLIZA */}
{showPolicyForm && (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end md:items-center justify-center md:p-4" onClick={() => setShowPolicyForm(false)}>
        <form
            onClick={e => e.stopPropagation()}
            onSubmit={savePolicy}
            className="bg-white w-full rounded-t-[2.5rem] md:rounded-[2.5rem] md:max-w-lg shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
        >
            <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="p-8 md:p-10 space-y-5">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                {editingPolicy ? 'Editar Póliza' : 'Nueva Póliza'}
            </h3>

            <div className="space-y-1">
                <label htmlFor="policy-insurer" className="text-xs font-black uppercase text-slate-600 ml-1">Empresa Aseguradora</label>
                <input id="policy-insurer" required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={policyForm.insurance_company} onChange={e => setPolicyForm({...policyForm, insurance_company: e.target.value})} />
            </div>

            <div className="space-y-1">
                <label htmlFor="policy-number" className="text-xs font-black uppercase text-slate-600 ml-1">Número de Póliza</label>
                <input id="policy-number" required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={policyForm.policy_number} onChange={e => setPolicyForm({...policyForm, policy_number: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label htmlFor="policy-start" className="text-xs font-black uppercase text-slate-600 ml-1">Inicio Cobertura</label>
                    <input id="policy-start" required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={policyForm.start_date} onChange={e => setPolicyForm({...policyForm, start_date: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label htmlFor="policy-end" className="text-xs font-black uppercase text-slate-600 ml-1">Fin Cobertura</label>
                    <input id="policy-end" required type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={policyForm.end_date} onChange={e => setPolicyForm({...policyForm, end_date: e.target.value})} />
                </div>
            </div>

            <div className="space-y-1">
                <label htmlFor="policy-aircraft" className="text-xs font-black uppercase text-slate-600 ml-1">Aplica a</label>
                <select id="policy-aircraft" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={policyForm.aircraft_id} onChange={e => setPolicyForm({...policyForm, aircraft_id: e.target.value})}>
                    <option value="">🛡️ TODA LA FLOTA</option>
                    {aircraft.map(a => (
                        <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1 ml-1 uppercase">Si seleccionas "Toda la flota", cubre todas las aeronaves registradas.</p>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPolicyForm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs active:scale-95 transition-all">
                    {editingPolicy ? 'Actualizar' : 'Registrar'}
                </button>
            </div>
            </div>
        </form>
    </div>
)}
        </div>
    );
}