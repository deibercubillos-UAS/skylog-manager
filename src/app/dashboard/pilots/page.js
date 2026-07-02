'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { isGerenteGeneral } from '@/lib/planLimits';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const AddPilotPanel  = dynamic(() => import('@/components/AddPilotPanel'),  { ssr: false });
const EditPilotPanel = dynamic(() => import('@/components/EditPilotPanel'), { ssr: false });

export default function PilotsPage() {
  const router      = useRouter();
  const menuRef     = useRef(null);
  const [pilots,        setPilots]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [userRole,      setUserRole]      = useState(null);
  const [orgId,         setOrgId]         = useState(null);
  const [showAddPanel,  setShowAddPanel]  = useState(false);
  const [editingPilot,  setEditingPilot]  = useState(null);
  const [openMenuId,    setOpenMenuId]    = useState(null);
  const [confirmDlg,    setConfirmDlg]    = useState(null);

  // ── Cerrar menú al click fuera ──────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Carga de datos ─────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      // getUser() verifica el token contra Supabase (más seguro que getSession())
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (!prof?.organization_id) { window.location.href = '/login'; return; }

      setUserRole(prof.role);
      setOrgId(prof.organization_id);

      const { data: pilotsData } = await supabase
        .from('pilots')
        .select('*')
        .eq('organization_id', prof.organization_id)
        .order('name', { ascending: true });

      // El Gerente General (dueño/representante legal) no se muestra en el roster
      // de tripulación — no es tripulación operativa.
      setPilots((pilotsData || []).filter(p => !isGerenteGeneral(p.pilot_role)));
    } catch (err) {
      console.error('Error cargando tripulación:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);
  const canEditMedical = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  const handleDelete = (pilot) => {
    setOpenMenuId(null);
    setConfirmDlg({
      isOpen: true,
      title: `¿Eliminar a ${pilot.name}?`,
      message: 'Esta acción es irreversible. Se eliminarán todos los datos del expediente.',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          const { error } = await supabase.from('pilots').delete().eq('id', pilot.id);
          if (error) throw error;
          setPilots(prev => prev.filter(p => p.id !== pilot.id));
          toast.success(`${pilot.name} eliminado del expediente.`);
        } catch (err) {
          toast.error('No se pudo eliminar: ' + err.message);
        }
      },
    });
  };

  const handleEdit = (pilot) => {
    setOpenMenuId(null);
    setEditingPilot(pilot);
  };

  // Iniciales para el avatar (mismo patrón que la tarjeta de usuario del sidebar).
  const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Badge de estado de invitación ──────────────────────────────────────
  const invitationBadge = (status) => {
    if (status === 'pending')  return { color: 'bg-amber-100 text-amber-700 border-amber-200',     label: 'Invitación pendiente' };
    if (status === 'accepted') return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Aceptado' };
    if (status === 'rejected') return { color: 'bg-red-100 text-red-600 border-red-200',           label: 'Invitación rechazada' };
    return null;
  };

  // ── Helpers de estado médico ───────────────────────────────────────────
  const medicalStatus = (expiry) => {
    if (!expiry) return null;
    const diff = (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0)  return { color: 'bg-red-100 text-red-600 border-red-200',       label: 'VENCIDO' };
    if (diff < 30) return { color: 'bg-orange-100 text-orange-600 border-orange-200', label: `Vence en ${Math.round(diff)}d` };
    return           { color: 'bg-emerald-100 text-emerald-600 border-emerald-200',  label: 'Vigente' };
  };

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest text-xs">
      Cargando tripulación...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20">

      {/* Header */}
      <PageHero
        eyebrow="Flota & Equipo"
        title="Tripulación"
        description="Pilotos, licencias RPAS y vigencia de certificaciones."
      />

      {(() => {
        const withLicense = pilots.filter(p => p.license_number).length;
        const expiring = pilots.filter(p => {
          const ms = medicalStatus(p.medical_expiry);
          return ms && ms.label !== 'Vigente';
        }).length;
        const complete = pilots.filter(p =>
          [p.id_doc_url, p.pilot_course_url, p.theoretical_exam_url, p.medical_cert_url].filter(Boolean).length === 4
        ).length;
        return (
          <KPIStrip items={[
            { key: 'total', title: 'Tripulantes', value: pilots.length, icon: 'group', color: 'text-slate-900' },
            { key: 'license', title: 'Con Licencia RPAS', value: withLicense, icon: 'badge', color: 'text-slate-900' },
            {
              key: 'expiring', title: 'Cert. por Vencer', value: expiring, icon: 'event_busy',
              warning: expiring > 0,
              sub: expiring > 0 ? 'Revisar vigencia médica' : 'Todas vigentes',
            },
            { key: 'complete', title: 'Expediente Completo', value: complete, icon: 'folder_shared', color: 'text-emerald-600' },
          ]} />
        );
      })()}

      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <p className="text-slate-400 text-xs font-black uppercase">{pilots.length} miembro{pilots.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Registrar Miembro
          </button>
        )}
      </div>

      {/* Lista — Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {pilots.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">group</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin pilotos registrados</p>
          </div>
        ) : pilots.map(p => {
          const ms = medicalStatus(p.medical_expiry);
          return (
            <div key={p.id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-orange-600">{initials(p.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase truncate">{p.pilot_role || p.position || 'Piloto'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const ib = invitationBadge(p.invitation_status);
                      return ib ? (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${ib.color}`}>
                          {ib.label}
                        </span>
                      ) : null;
                    })()}
                    {ms && (
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${ms.color}`}>
                        {ms.label}
                      </span>
                    )}
                    {(() => {
                      const docs = [p.id_doc_url, p.pilot_course_url, p.theoretical_exam_url, p.medical_cert_url].filter(Boolean);
                      return docs.length > 0 ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-600">
                          <span className="material-symbols-outlined text-sm">folder</span>
                          {docs.length}/4
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEdit(p)}
                    className="size-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="size-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista — Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {pilots.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">group</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin pilotos registrados</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Rol / Habilitaciones</th>
                <th className="px-6 py-4">Licencia</th>
                <th className="px-6 py-4">Estado Médico</th>
                <th className="px-6 py-4">Docs</th>
                {canManage && <th className="px-6 py-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pilots.map(p => {
                const ms = medicalStatus(p.medical_expiry);
                return (
                  <tr key={p.id} className="hover:bg-orange-50/30 transition-colors text-sm">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-orange-600">{initials(p.name)}</span>
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{p.name}</p>
                          {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                          {(() => {
                            const ib = invitationBadge(p.invitation_status);
                            return ib ? (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${ib.color}`}>
                                {ib.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{p.pilot_role || p.position || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.license_number || '—'}</td>
                    <td className="px-6 py-4">
                      {ms ? (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${ms.color}`}>{ms.label}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const docs = [p.id_doc_url, p.pilot_course_url, p.theoretical_exam_url, p.medical_cert_url].filter(Boolean);
                        return docs.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-600">
                            <span className="material-symbols-outlined text-sm">folder</span>
                            {docs.length}/4
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        );
                      })()}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="size-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="size-9 flex items-center justify-center rounded-xl bg-slate-100 text-red-400 hover:bg-red-50 active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

      {/* Paneles */}
      {showAddPanel && (
        <AddPilotPanel
          onClose={() => setShowAddPanel(false)}
          onSuccess={() => { setShowAddPanel(false); loadData(); }}
        />
      )}
      {editingPilot && (
        <EditPilotPanel
          pilot={editingPilot}
          userRole={userRole}
          canEditMedical={canEditMedical}
          onClose={() => setEditingPilot(null)}
          onSuccess={() => { setEditingPilot(null); loadData(); }}
        />
      )}
    </div>
  );
}
