'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { hasPermission, labelForRole } from '@/lib/roles';
import { getOrgContext } from '@/lib/apiAuth';
import AerocivilCredentialsSection from '@/components/settings/AerocivilCredentialsSection';
import { toast } from '@/lib/toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { docOpenUrl } from '@/lib/docUrl';

const inputCls = "w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-slate-900";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

const ROLE_CHIP = {
    superadmin:   'bg-purple-50 text-purple-600',
    admin:        'bg-orange-50 text-orange-600',
    gerente_sms:  'bg-blue-50 text-blue-600',
    jefe_pilotos: 'bg-emerald-50 text-emerald-600',
    piloto:       'bg-slate-100 text-slate-600',
};

// Mismo umbral Vigente/Vence/Vencida que Tripulación y Mi Perfil
function expiryStatus(date) {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    const fmt = new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    if (diff < 0)  return { tone: 'red',    label: `Vencido ${fmt}` };
    if (diff < 60) return { tone: 'amber',  label: `Vence ${fmt} · ${diff}d` };
    return           { tone: 'emerald', label: `Vigente · ${fmt} · ${diff}d` };
}
const EXP_BADGE_CLS = {
    red: 'bg-red-500/15 text-red-400', amber: 'bg-amber-500/15 text-amber-400', emerald: 'bg-emerald-500/15 text-emerald-400',
};
const EXP_TEXT_CLS = { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600' };

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [org, setOrg] = useState(null);
    const [profile, setProfile] = useState(null);
    const [aircraft, setAircraft] = useState([]);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [newAuth, setNewAuth] = useState('');

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
        const ctx = await getOrgContext(supabase);
        const prof = { organization_id: ctx.orgId, role: ctx.role, subscription_plan: ctx.subscription_plan };
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

        if (orgRes.data) setOrg({ ...orgRes.data, authorized_operations: orgRes.data.authorized_operations || [] });
        setAircraft(airRes.data || []);
        setPolicies(polRes.data || []);
        setLoading(false);
    }
    loadOrgData();
}, []);

useEffect(() => {
    async function loadMembers() {
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' });
            const data = await res.json();
            setMembers(res.ok && Array.isArray(data) ? data : []);
        } catch {
            setMembers([]);
        } finally {
            setMembersLoading(false);
        }
    }
    loadMembers();
}, []);

const addAuth = () => {
    const v = newAuth.trim();
    if (!v) return;
    if (org.authorized_operations.some(a => a.toLowerCase() === v.toLowerCase())) { setNewAuth(''); return; }
    setOrg({ ...org, authorized_operations: [...org.authorized_operations, v] });
    setNewAuth('');
};
const removeAuth = (idx) => setOrg({ ...org, authorized_operations: org.authorized_operations.filter((_, i) => i !== idx) });

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
                    address: org.address,
                    operator_number: org.operator_number || null,
                    registration_expiry: org.registration_expiry || null,
                    authorized_operations: org.authorized_operations || [],
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

    const regStatus = expiryStatus(org.registration_expiry);

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-700 pb-20 px-2 md:px-0">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

            {/* HERO — logo, identidad, guardar */}
            <div className="bg-[#1A202C] rounded-[2rem] px-6 py-6 md:px-9 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5 min-w-0">
                    <div className="relative size-16 shrink-0">
                        <div className="size-full rounded-2xl bg-slate-700 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                            {org.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={docOpenUrl(org.logo_url)} className="size-full object-contain p-1.5" alt="Logo" loading="lazy" decoding="async" />
                            ) : (
                                <span className="material-symbols-outlined text-3xl text-slate-400">business</span>
                            )}
                        </div>
                        <FileUpload variant="avatar" path="org/logos" label="Actualizar logo corporativo" onUploadSuccess={updateLogo} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Organización</p>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 truncate">{org.company_name || 'Sin nombre'}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                            {org.tax_id && <span className="text-[11px] font-bold text-slate-400">{org.tax_id_type || 'NIT'} {org.tax_id}</span>}
                            {regStatus && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${EXP_BADGE_CLS[regStatus.tone]}`}>
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    Registro AeroCivil {regStatus.label}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    type="submit"
                    form="org-form"
                    disabled={updating}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                    <span className="material-symbols-outlined text-base">save</span>
                    {updating ? 'Sincronizando...' : 'Guardar cambios'}
                </button>
            </div>

            {/* ── INICIO RÁPIDO — Onboarding Express (oculto para piloto independiente) ── */}
            {profile?.subscription_plan !== 'piloto' && (
            <section id="inicio-rapido" className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Header — mismo estilo claro que el resto de la página (antes era un bloque
                    oscuro pegado directo bajo el hero navy, ilegible y sin relación visual
                    con las demás tarjetas blancas de esta página) */}
                <div className="flex items-center gap-3 px-5 py-4 md:px-7 border-b border-slate-100 bg-orange-50/60">
                    <span className="material-symbols-outlined text-2xl text-orange-600">rocket_launch</span>
                    <div>
                        <p className="text-sm font-black text-slate-900">Inicio Rápido — Onboarding Express</p>
                        <p className="text-xs text-slate-500">¿Tienes tu información en Excel? Descarga la plantilla, llénala y súbela para configurar todo en un paso.</p>
                    </div>
                </div>

                <div className="p-5 md:p-7 space-y-4">
                    {/* Pasos visuales */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { icon: 'download', label: '1. Descargar', desc: 'Plantilla .xlsx con 8 hojas guiadas' },
                            { icon: 'edit',     label: '2. Llenar',    desc: 'Org · Tripulación · Flota · Baterías · más' },
                            { icon: 'upload_file', label: '3. Subir',  desc: 'Bitafly importa todo automáticamente' },
                        ].map(s => (
                            <div key={s.icon} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <span className="material-symbols-outlined text-xl text-orange-600 block mb-1">{s.icon}</span>
                                <p className="text-xs font-black text-slate-900">{s.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Botones */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleObDownload}
                            disabled={obDownloading}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50
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
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50
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
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                            <p className="text-xs text-red-700">{obError}</p>
                            <button onClick={() => setObError(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                        </div>
                    )}

                    {/* Resultado del import */}
                    {obResult && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                                <p className="text-sm font-black text-slate-900">
                                    Importación completada — {obResult.totalCreated} registros creados
                                    {obResult.totalSkipped > 0 && `, ${obResult.totalSkipped} omitidos (ya existían)`}
                                </p>
                                <button onClick={() => setObResult(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {[
                                    { key: 'org',         label: 'Organización', icon: 'business',       val: obResult.results?.org?.updated ? 'Actualizada' : 'Sin cambios' },
                                    { key: 'flota',       label: 'Aeronaves',    icon: 'flight',          val: `+${obResult.results?.flota?.created || 0}` },
                                    { key: 'tripulacion', label: 'Pilotos',      icon: 'group',           val: `+${obResult.results?.tripulacion?.created || 0}` },
                                    { key: 'baterias',    label: 'Baterías',     icon: 'battery_charging_full', val: `+${obResult.results?.baterias?.created || 0}` },
                                    { key: 'tech',        label: 'Tech/Payloads', icon: 'settings_input_component', val: `+${obResult.results?.tech?.created || 0}` },
                                    { key: 'polizas',     label: 'Pólizas RCE',  icon: 'shield',          val: `+${obResult.results?.polizas?.created || 0}` },
                                    { key: 'contactos',   label: 'Contactos',    icon: 'emergency',       val: `+${obResult.results?.contactos?.created || 0}` },
                                    { key: 'bitacora',    label: 'Vuelos',       icon: 'menu_book',       val: `+${obResult.results?.bitacora?.inserted || 0}` },
                                ].map(item => (
                                    <div key={item.key} className="bg-white border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-slate-400">{item.icon}</span>
                                        <div>
                                            <p className="text-[10px] text-slate-500">{item.label}</p>
                                            <p className="text-xs font-black text-emerald-700">{item.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Errores por sección */}
                            {Object.entries(obResult.results || {}).some(([, v]) => v?.errors?.length > 0) && (
                                <details className="mt-1">
                                    <summary className="text-xs text-orange-600 cursor-pointer font-semibold">Ver advertencias</summary>
                                    <div className="mt-2 space-y-1">
                                        {Object.entries(obResult.results).map(([section, v]) =>
                                            (v?.errors || []).map((e, i) => (
                                                <p key={`${section}-${i}`} className="text-[11px] text-orange-700">
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
            )}

            <form id="org-form" onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Datos de la empresa</p>
                        <div className="space-y-1">
                            <label className={labelCls}>Razón social</label>
                            <input required className={inputCls} value={org.company_name || ''} onChange={e => setOrg({...org, company_name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>Tipo de identificación</label>
                                <select className={inputCls} value={org.tax_id_type || 'NIT'} onChange={e => setOrg({...org, tax_id_type: e.target.value})}>
                                    <option value="NIT">NIT (Empresa)</option>
                                    <option value="CC">Cédula (Persona Natural)</option>
                                    <option value="PP">Pasaporte</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>N.º Documento</label>
                                <input required className={inputCls} value={org.tax_id || ''} onChange={e => setOrg({...org, tax_id: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Correo corporativo</label>
                            <input type="email" className={inputCls} value={org.operator_email || ''} onChange={e => setOrg({...org, operator_email: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>Teléfono</label>
                                <input className={inputCls} value={org.phone || ''} onChange={e => setOrg({...org, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Representante legal</label>
                                <input className={inputCls} value={org.legal_rep || ''} onChange={e => setOrg({...org, legal_rep: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Dirección</label>
                            <input className={inputCls} value={org.address || ''} onChange={e => setOrg({...org, address: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Registro AeroCivil</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>N.º Explotador (DAN)</label>
                                <input className={inputCls} value={org.dan_number || ''} onChange={e => setOrg({...org, dan_number: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>N.º de operador UAS</label>
                                <input className={inputCls} value={org.operator_number || ''} onChange={e => setOrg({...org, operator_number: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Vigencia del registro</label>
                            <input type="date" className={inputCls} value={org.registration_expiry || ''} onChange={e => setOrg({...org, registration_expiry: e.target.value})} />
                            {regStatus && <p className={`text-[10px] font-black ${EXP_TEXT_CLS[regStatus.tone]}`}>{regStatus.label}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Autorizaciones activas</label>
                            {org.authorized_operations.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                    {org.authorized_operations.map((a, i) => (
                                        <span key={a} className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-slate-600 bg-slate-100 pl-2.5 pr-1.5 py-1 rounded-full">
                                            <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                                            {a}
                                            <button type="button" onClick={() => removeAuth(i)} className="size-4 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50">
                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    className={inputCls}
                                    placeholder="Ej. Operación nocturna, BVLOS, VLOS..."
                                    value={newAuth}
                                    onChange={e => setNewAuth(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAuth(); } }}
                                />
                                <button type="button" onClick={addAuth}
                                    className="shrink-0 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase transition-colors">
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1A202C] p-6 md:p-7 rounded-2xl text-white space-y-4">
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

                {/* COLUMNA DERECHA: MIEMBROS DEL EQUIPO */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Miembros del equipo</p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{members.length} miembro{members.length !== 1 ? 's' : ''}</p>
                        </div>
                        <Link href="/dashboard/pilots"
                            className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg px-3 py-2 text-[10.5px] font-black text-orange-600 uppercase transition-colors shrink-0">
                            <span className="material-symbols-outlined text-base">person_add</span>
                            Invitar
                        </Link>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-50 px-2">
                        {membersLoading ? (
                            <p className="py-10 text-center text-xs font-black text-slate-300 uppercase">Cargando...</p>
                        ) : members.length === 0 ? (
                            <p className="py-10 text-center text-xs font-black text-slate-300 uppercase">Sin miembros</p>
                        ) : members.map(m => (
                            <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="size-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                    {m.avatar_url
                                        ? (// eslint-disable-next-line @next/next/no-img-element
                                          <img src={docOpenUrl(m.avatar_url)} alt="" className="size-full object-cover" />)
                                        : <span className="material-symbols-outlined text-slate-400 text-lg">person</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 truncate">{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || '---'}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 truncate">{m.email}</p>
                                </div>
                                <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${ROLE_CHIP[m.role] || 'bg-slate-100 text-slate-600'}`}>
                                    {labelForRole(m.role)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link href="/dashboard/users"
                        className="flex items-center justify-center gap-1.5 px-6 py-3.5 border-t border-slate-100 text-[10.5px] font-black text-slate-500 hover:text-orange-600 uppercase tracking-wide transition-colors shrink-0">
                        Gestionar roles del equipo
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
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