'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { toast } from '@/lib/toast';
import { docOpenUrl } from '@/lib/docUrl';
import { ROLE_LABELS } from '@/lib/roles';
import { PLAN_CONFIG } from '@/lib/planLimits';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';
import { getOrgContext } from '@/lib/apiAuth';

const inputCls = "w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-slate-900";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

// Mismo umbral Vigente/Vence/Vencida que Tripulación (dashboard/pilots/page.js)
function medicalStatus(expiry) {
    if (!expiry) return null;
    const diff = (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24);
    const fmt = new Date(expiry).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    if (diff < 0)  return { tone: 'red',    label: `Vencido ${fmt}` };
    if (diff < 30) return { tone: 'amber',  label: `Vence ${fmt}` };
    return           { tone: 'emerald', label: `Vigente · ${fmt}` };
}

const MED_BADGE_CLS = {
    red:     'bg-red-500/15 text-red-400',
    amber:   'bg-amber-500/15 text-amber-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
};
const MED_TEXT_CLS = {
    red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600',
};

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    // Expediente del piloto (tabla pilots) — gestionado por el propio tripulante
    const [docs, setDocs] = useState(null);
    const [savingDocs, setSavingDocs] = useState(false);
    const [welcome, setWelcome] = useState(false);
    const [lastSignIn, setLastSignIn] = useState(null);
    const [sendingReset, setSendingReset] = useState(false);

    // Banner de bienvenida cuando el tripulante recién se unió a la org (?welcome=1)
    useEffect(() => {
        try {
            if (new URLSearchParams(window.location.search).get('welcome') === '1') setWelcome(true);
        } catch { /* no-op */ }
    }, []);

    useEffect(() => {
        async function loadDocs() {
            try {
                const res = await fetch('/api/pilots/my-documents');
                const data = await res.json();
                setDocs(data.pilot || {
                    id_doc_url: null, pilot_course_url: null, theoretical_exam_url: null,
                    medical_cert_url: null, medical_expiry: '', cipu_number: '',
                    emergency_contact_name: '', emergency_contact_phone: '', aerocivil_additions: [],
                });
            } catch {
                setDocs({});
            }
        }
        loadDocs();
    }, []);

    const handlePasswordReset = async () => {
        if (!profile?.email) return;
        setSendingReset(true);
        try {
            const res = await fetch('/api/auth/reset-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: profile.email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo enviar el correo.');
            toast.success('Te enviamos un enlace a tu correo para cambiar tu contraseña.');
        } catch (err) {
            toast.error('Error: ' + err.message);
        } finally {
            setSendingReset(false);
        }
    };

    const handleLogout = () => {
        supabase.auth.signOut().then(() => { window.location.href = '/login'; });
    };

    const handleSaveDocs = async () => {
        setSavingDocs(true);
        try {
            const res = await fetch('/api/pilots/my-documents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_doc_url:              docs.id_doc_url,
                    pilot_course_url:        docs.pilot_course_url,
                    theoretical_exam_url:    docs.theoretical_exam_url,
                    medical_cert_url:        docs.medical_cert_url,
                    medical_expiry:          docs.medical_expiry || null,
                    cipu_number:             docs.cipu_number || null,
                    emergency_contact_name:  docs.emergency_contact_name || null,
                    emergency_contact_phone: docs.emergency_contact_phone || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar');
            toast.success('Documentos actualizados. Se notificó a tus superiores.');
        } catch (err) {
            toast.error('Error al guardar documentos: ' + err.message);
        } finally {
            setSavingDocs(false);
        }
    };

    // REEMPLACE EL BLOQUE useEffect (Líneas 10 a 18 aprox) POR ESTE:
useEffect(() => {
    async function loadFullProfile() {
        // getSession() es local (sin roundtrip de red), más rápido que getUser()
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login'; return; }
        setLastSignIn(session.user?.last_sign_in_at || null);

        // Perfil y organización en paralelo: primero el perfil, luego ambas queries a la vez
        const [{ data: prof }, ctx] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            getOrgContext(supabase),
        ]);

        // role/organization_id/subscription_plan se resuelven vía organization_members
        // (organización activa), no desde la fila cruda de profiles.
        const profWithOrgCtx = { ...prof, role: ctx.role, organization_id: ctx.orgId, subscription_plan: ctx.subscription_plan };

        if (ctx.orgId) {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('company_name, unique_code')
                .eq('id', ctx.orgId)
                .single();
            setProfile({ ...profWithOrgCtx, company_name: orgData?.company_name, unique_code: orgData?.unique_code });
        } else {
            setProfile(profWithOrgCtx);
        }
        setLoading(false);
    }
    loadFullProfile();
}, []);

    const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
        // Extraemos solo los campos que pertenecen a la tabla 'profiles'
        const updateData = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: `${profile.first_name} ${profile.last_name}`,
            phone: profile.phone,
            city: profile.city,
            address: profile.address,
            license_number: profile.license_number,
            medical_expiry: profile.medical_expiry,
            avatar_url: profile.avatar_url,
            emergency_contact_name: profile.emergency_contact_name,
            emergency_contact_phone: profile.emergency_contact_phone
        };

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id);

        if (error) throw error;
        toast.success("Expediente guardado exitosamente");
    } catch (err) {
        toast.error("Error al guardar: " + err.message);
    } finally {
        setUpdating(false);
    }
};

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'ELIMINAR') return;
        setDeleteLoading(true);
        try {
            const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al eliminar la cuenta.');
            }
            await supabase.auth.signOut();
            window.location.href = '/?cuenta=eliminada';
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO EXPEDIENTE...</div>;

    const medStatus = medicalStatus(profile.medical_expiry);
    const pilotoIndependiente = isPilotoIndependiente({ role: profile.role, plan: profile.subscription_plan });
    const roleLabel = pilotoIndependiente ? 'Piloto Independiente' : (ROLE_LABELS[profile.role] || profile.role);
    const planLabel = PLAN_CONFIG[profile.subscription_plan]?.name || 'Plan Piloto';
    const pilotAdditions = Array.isArray(docs?.aerocivil_additions) ? docs.aerocivil_additions : [];

    return (
        <div className="max-w-5xl mx-auto space-y-8 text-left animate-in fade-in duration-700 pb-20">
            {welcome && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-3">
                    <span className="material-symbols-outlined text-orange-600 text-2xl shrink-0">waving_hand</span>
                    <div>
                        <p className="text-sm font-black text-slate-900">¡Bienvenido a tu organización!</p>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                            Ya eres parte del equipo. Completa tu expediente cargando tus documentos
                            (cédula, diploma UAS, examen teórico, certificado médico, CIPU) y tu contacto
                            de emergencia. Al guardar, se notificará a tus superiores.
                        </p>
                    </div>
                </div>
            )}

            {/* HERO — avatar, identidad, guardar */}
            <div className="bg-[#1A202C] rounded-[2rem] px-6 py-6 md:px-9 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5 min-w-0">
                    <div className="relative size-16 shrink-0">
                        <div className="size-full rounded-full bg-slate-700 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                            {profile.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={docOpenUrl(profile.avatar_url)} alt="Foto de perfil" className="size-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                                <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
                            )}
                        </div>
                        <FileUpload
                            variant="avatar"
                            path="crew/avatars"
                            label="Cambiar foto de perfil"
                            // Esto SOLO actualiza la variable en memoria, no guarda en DB aún
                            onUploadSuccess={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Mi cuenta</p>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 truncate">{profile.full_name || profile.email}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                            <span className="text-[11px] font-bold text-slate-400">{roleLabel}</span>
                            {medStatus && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${MED_BADGE_CLS[medStatus.tone]}`}>
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    Certificado médico {medStatus.label}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    type="submit"
                    form="profile-form"
                    disabled={updating}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                    <span className="material-symbols-outlined text-base">save</span>
                    {updating ? 'Sincronizando...' : 'Guardar cambios'}
                </button>
            </div>

            <form id="profile-form" onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Datos personales</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>Nombres</label>
                                <input required className={inputCls} value={profile.first_name || ''} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Apellidos</label>
                                <input required className={inputCls} value={profile.last_name || ''} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>Teléfono</label>
                                <input className={inputCls} value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Ciudad</label>
                                <input className={inputCls} value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Correo electrónico</label>
                            <input disabled className={inputCls + ' opacity-60 cursor-not-allowed'} value={profile.email || ''} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Licencia RPAS</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>N.º de licencia / CIPU</label>
                                <input className={inputCls + ' uppercase'} placeholder="CO-CIPU-XXXX" value={profile.license_number || ''} onChange={e => setProfile({...profile, license_number: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Vencimiento certificado médico</label>
                                <input type="date" className={inputCls} value={profile.medical_expiry || ''} onChange={e => setProfile({...profile, medical_expiry: e.target.value})} />
                                {medStatus && <p className={`text-[10px] font-black ${MED_TEXT_CLS[medStatus.tone]}`}>{medStatus.label}</p>}
                            </div>
                        </div>
                        {pilotAdditions.length > 0 && (
                            <div className="space-y-1.5">
                                <label className={labelCls}>Certificaciones (Aerocivil)</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {pilotAdditions.map(a => (
                                        <span key={a} className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                            <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>{a}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[9.5px] font-semibold text-slate-400">Gestionadas por tu organización desde Tripulación</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Contacto de emergencia</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelCls}>Nombre completo</label>
                                <input className={inputCls} value={profile.emergency_contact_name || ''} onChange={e => setProfile({...profile, emergency_contact_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Teléfono</label>
                                <input className={inputCls} value={profile.emergency_contact_phone || ''} onChange={e => setProfile({...profile, emergency_contact_phone: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Seguridad de la cuenta</p>
                        <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="material-symbols-outlined text-slate-500 shrink-0">lock</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900">Contraseña</p>
                                    <p className="text-[10px] font-semibold text-slate-400">Te enviamos un enlace a tu correo para cambiarla</p>
                                </div>
                            </div>
                            <button type="button" onClick={handlePasswordReset} disabled={sendingReset}
                                className="text-[10.5px] font-black text-orange-600 hover:text-orange-800 disabled:opacity-50 shrink-0">
                                {sendingReset ? 'Enviando...' : 'Cambiar'}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                            <span className="material-symbols-outlined text-slate-500 shrink-0">devices</span>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900">Último acceso</p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                    {lastSignIn ? new Date(lastSignIn).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 flex flex-col space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Resumen de cuenta</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Organización</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{profile.company_name || 'Individual'}</span>
                                {profile.unique_code && <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">{profile.unique_code}</span>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Plan</span>
                            <span className="text-xs font-black text-slate-900">{planLabel}</span>
                        </div>
                        {profile.subscription_expires_at && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Vence</span>
                                <span className="text-xs font-black text-slate-900">
                                    {new Date(profile.subscription_expires_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                        {profile.created_at && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Miembro desde</span>
                                <span className="text-xs font-black text-slate-900">
                                    {new Date(profile.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={handleLogout}
                            className="flex items-center gap-2 pt-3 border-t border-slate-100 text-red-600 font-black text-[11px] uppercase tracking-wide">
                            <span className="material-symbols-outlined text-base">logout</span>
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </form>
            {/* EXPEDIENTE DEL PILOTO — documentos (tabla pilots) */}
            {docs && (
              <section className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-8 shadow-sm">
                <div className="flex items-start gap-3 border-b pb-4">
                  <span className="material-symbols-outlined text-orange-500 text-2xl mt-0.5 shrink-0">folder_shared</span>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-lg tracking-tighter">Documentos del Piloto</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      Carga tus documentos aeronáuticos. Al actualizarlos se notificará al Gerente General,
                      Jefe de Pilotos y Gerente SMS para su revisión.
                    </p>
                  </div>
                </div>

                {/* Credenciales numéricas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Número CIPU</label>
                    <input
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-orange-600 uppercase text-sm"
                      placeholder="CO-CIPU-XXXX"
                      value={docs.cipu_number || ''}
                      onChange={e => setDocs({ ...docs, cipu_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Vencimiento Certificado Médico</label>
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                      value={docs.medical_expiry || ''}
                      onChange={e => setDocs({ ...docs, medical_expiry: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contacto de emergencia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <h4 className="col-span-1 md:col-span-2 text-xs font-black text-red-600 uppercase tracking-[0.2em] border-b pb-2">Contacto de Emergencia</h4>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                    <input
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                      value={docs.emergency_contact_name || ''}
                      onChange={e => setDocs({ ...docs, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Teléfono</label>
                    <input
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                      value={docs.emergency_contact_phone || ''}
                      onChange={e => setDocs({ ...docs, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Documentos cargados */}
                {(docs.id_doc_url || docs.pilot_course_url || docs.theoretical_exam_url || docs.medical_cert_url) && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Archivos cargados</p>
                    {[
                      { url: docs.id_doc_url,           label: 'Cédula / Identidad' },
                      { url: docs.pilot_course_url,     label: 'Diploma Curso UAS' },
                      { url: docs.theoretical_exam_url, label: 'Examen Teórico Aerocivil' },
                      { url: docs.medical_cert_url,     label: 'Certificado Médico' },
                    ].filter(d => d.url).map(d => (
                      <a key={d.label} href={docOpenUrl(d.url)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-800 truncate">
                        <span className="material-symbols-outlined text-sm shrink-0">description</span>
                        <span className="truncate">{d.label}</span>
                        <span className="material-symbols-outlined text-sm shrink-0 ml-auto">open_in_new</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Subir / reemplazar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUpload path="crew/docs" label="Cédula / Documento de Identidad"  onUploadSuccess={(url) => setDocs(d => ({ ...d, id_doc_url: url }))} />
                  <FileUpload path="crew/docs" label="Diploma Curso Piloto UAS"         onUploadSuccess={(url) => setDocs(d => ({ ...d, pilot_course_url: url }))} />
                  <FileUpload path="crew/docs" label="Examen Teórico Aerocivil"         onUploadSuccess={(url) => setDocs(d => ({ ...d, theoretical_exam_url: url }))} />
                  <FileUpload path="crew/docs" label="Certificado Médico Aeronáutico"   onUploadSuccess={(url) => setDocs(d => ({ ...d, medical_cert_url: url }))} />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDocs}
                  disabled={savingDocs}
                  className="w-full py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-slate-900 active:scale-95 disabled:opacity-60"
                >
                  {savingDocs ? 'GUARDANDO Y NOTIFICANDO...' : 'GUARDAR DOCUMENTOS'}
                </button>
              </section>
            )}

            {/* ZONA DE PELIGRO — Eliminar cuenta */}
            <section className="bg-white border border-red-100 rounded-[2rem] p-8 space-y-4">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-400 text-2xl mt-0.5 shrink-0">warning</span>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase text-sm tracking-wide">Zona de peligro</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                            Eliminar tu cuenta es permanente e irreversible. Se borrarán tu perfil, organización, flota, bitácoras y todos los datos asociados. Si tienes una suscripción activa, se cancelará automáticamente.
                        </p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-red-200 text-red-500 text-xs font-black uppercase hover:bg-red-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">delete_forever</span>
                        Eliminar mi cuenta
                    </button>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
                        <p className="text-xs font-bold text-red-700">
                            Para confirmar, escribe <span className="font-mono font-black bg-red-100 px-1 rounded">ELIMINAR</span> en el campo:
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                            placeholder="ELIMINAR"
                            className="w-full p-3 bg-white border border-red-300 rounded-xl text-sm font-mono font-black text-red-700 placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'ELIMINAR' || deleteLoading}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {deleteLoading ? 'Eliminando...' : 'Confirmar eliminación'}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}