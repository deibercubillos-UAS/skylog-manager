'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import PageHero from '@/components/PageHero';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { docOpenUrl } from '@/lib/docUrl';
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
    const router = useRouter();

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
                    emergency_contact_name: '', emergency_contact_phone: '',
                });
            } catch {
                setDocs({});
            }
        }
        loadDocs();
    }, []);

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

        // Perfil y organización en paralelo: primero el perfil, luego ambas queries a la vez
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

        if (prof?.organization_id) {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('company_name, unique_code')
                .eq('id', prof.organization_id)
                .single();
            setProfile({ ...prof, company_name: orgData?.company_name, unique_code: orgData?.unique_code });
        } else {
            setProfile(prof);
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

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-700 pb-20">
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
            <PageHero
                eyebrow="Cuenta"
                title="Mi Perfil"
                description="Gestión de identidad y credenciales aeronáuticas."
                metric={{ label: 'Rol', value: profile.role?.replace('_', ' ') }}
            />

            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* COLUMNA IZQUIERDA: FOTO Y CREDENCIALES */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="size-32 bg-slate-100 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 relative group">
                            {profile.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={docOpenUrl(profile.avatar_url)} alt="Foto de perfil" className="size-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                                <span className="material-symbols-outlined text-5xl text-slate-300">person</span>
                            )}
                        </div>
                        <div className="mt-4 w-full">
                          <FileUpload 
                                path="crew/avatars" 
                                label="Cambiar Foto de Perfil" 
                                // Esto SOLO actualiza la variable en memoria, no guarda en DB aún
                                onUploadSuccess={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))} 
                            />
                        </div>
                        <h3 className="font-black text-slate-900 uppercase leading-tight">{profile.full_name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{profile.email}</p>
                    </div>

                    <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-4">
                        <h4 className="text-orange-500 text-xs font-black uppercase tracking-widest border-b border-white/5 pb-2">Estatus Médico</h4>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase">Vencimiento Examen</label>
                            <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={profile.medical_expiry || ''} onChange={e => setProfile({...profile, medical_expiry: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase">Licencia / CIPU</label>
                            <input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white uppercase" placeholder="CO-CIPU-XXXX" value={profile.license_number || ''} onChange={e => setProfile({...profile, license_number: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS FORMULARIO */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <h4 className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Información de Contacto</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombres</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.first_name || ''} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Apellidos</label>
                                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.last_name || ''} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Teléfono Móvil</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Ciudad</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                            </div>
                            <div className="col-span-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 mt-2">
                                <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Organización Actual</p>
                                <div className="flex justify-between items-center mt-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase">{profile.company_name || 'Individual'}</h3>
                                    <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-orange-200">ID: {profile.unique_code || '---'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <h4 className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Contacto de Emergencia</h4>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.emergency_contact_name || ''} onChange={e => setProfile({...profile, emergency_contact_name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Teléfono</label>
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={profile.emergency_contact_phone || ''} onChange={e => setProfile({...profile, emergency_contact_phone: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            disabled={updating}
                            type="submit" 
                            className="w-full py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest transition-all hover:bg-slate-900 active:scale-95"
                        >
                            {updating ? 'SINCRONIZANDO...' : 'GUARDAR EXPEDIENTE'}
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