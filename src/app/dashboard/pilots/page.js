'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { isGerenteGeneral } from '@/lib/planLimits';
import { getOrgContext } from '@/lib/apiAuth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const AddPilotPanel  = dynamic(() => import('@/components/AddPilotPanel'),  { ssr: false });
const EditPilotPanel = dynamic(() => import('@/components/EditPilotPanel'), { ssr: false });

// Duración real de un vuelo en horas — mismo criterio que PilotDashboard.js
// (prefiere total_time, si no calcula desde takeoff/landing).
function flightHours(f) {
  if (f.total_time) return Number(f.total_time) || 0;
  if (!f.takeoff_time || !f.landing_time) return 0;
  const [h1, m1] = f.takeoff_time.split(':').map(Number);
  const [h2, m2] = f.landing_time.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return mins > 0 ? mins / 60 : 0;
}

export default function PilotsPage() {
  const [pilots,        setPilots]        = useState([]);
  const [hoursByPilot,  setHoursByPilot]  = useState({});
  const [loading,       setLoading]       = useState(true);
  const [userRole,      setUserRole]      = useState(null);
  const [showAddPanel,  setShowAddPanel]  = useState(false);
  const [editingPilot,  setEditingPilot]  = useState(null);
  const [confirmDlg,    setConfirmDlg]    = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Carga de datos ─────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      // getOrgContext valida el token y resuelve organización/rol activos.
      const ctx = await getOrgContext(supabase);
      if (!ctx.user) { window.location.href = '/login'; return; }

      if (!ctx.orgId) { window.location.href = '/login'; return; }

      setUserRole(ctx.role);

      const [resPilots, resFlights] = await Promise.all([
        supabase.from('pilots').select('*').eq('organization_id', ctx.orgId).order('name', { ascending: true }),
        supabase.from('flights').select('pilot_id, total_time, takeoff_time, landing_time').eq('organization_id', ctx.orgId),
      ]);

      // El Gerente General (dueño/representante legal) no se muestra en el roster
      // de tripulación — no es tripulación operativa.
      setPilots((resPilots.data || []).filter(p => !isGerenteGeneral(p.pilot_role)));

      // Horas PIC totales por piloto — dato real, sumado desde la bitácora.
      const hoursMap = {};
      (resFlights.data || []).forEach(f => {
        if (!f.pilot_id) return;
        hoursMap[f.pilot_id] = (hoursMap[f.pilot_id] || 0) + flightHours(f);
      });
      setHoursByPilot(hoursMap);
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
    if (diff < 0)  return { tone: 'text-red-600',    label: `Vencida ${new Date(expiry).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}` };
    if (diff < 30) return { tone: 'text-amber-600',  label: `Vence ${new Date(expiry).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}` };
    return           { tone: 'text-emerald-600', label: `Vigente · ${new Date(expiry).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}` };
  };

  const uniqueRoles = useMemo(() => [...new Set(pilots.map(p => p.pilot_role || p.position).filter(Boolean))], [pilots]);

  const filteredPilots = useMemo(() => {
    let result = pilots;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.license_number?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    }
    if (roleFilter) result = result.filter(p => (p.pilot_role || p.position) === roleFilter);
    if (statusFilter === 'activo')   result = result.filter(p => p.is_active !== false);
    if (statusFilter === 'inactivo') result = result.filter(p => p.is_active === false);
    return result;
  }, [pilots, search, roleFilter, statusFilter]);

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest text-xs">
      Cargando tripulación...
    </div>
  );

  const activeCount = pilots.filter(p => p.is_active !== false).length;
  const totalHours = Object.values(hoursByPilot).reduce((s, h) => s + h, 0);
  const expiringCount = pilots.filter(p => {
    const ms = medicalStatus(p.medical_expiry);
    return ms && !ms.label.startsWith('Vigente');
  }).length;

  return (
    <div className="space-y-5 md:space-y-8 animate-in fade-in duration-500 text-left pb-20">

      <PageHero
        eyebrow="Flota & Equipo"
        title="Tripulación"
        description="Pilotos, licencias RPAS y vigencia de certificaciones."
        right={
          <div className="flex items-center gap-4 md:gap-6">
            {expiringCount > 0 && (
              <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">Certificaciones por vencer</p>
                <p className="text-sm font-black text-orange-400 mt-1 whitespace-nowrap">{expiringCount} piloto{expiringCount !== 1 ? 's' : ''}</p>
              </div>
            )}
            {canManage && (
              <button
                onClick={() => setShowAddPanel(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Nuevo piloto
              </button>
            )}
          </div>
        }
      />

      <section aria-label="Indicadores de tripulación" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
        <KPIStrip variant="strip" items={[
          { key: 'total', label: 'Total pilotos', value: pilots.length, icon: 'group', iconColor: '#ec5b13' },
          { key: 'active', label: 'Activos', value: activeCount, icon: 'check_circle', iconColor: '#16a34a' },
          { key: 'hours', label: 'Horas PIC totales', value: totalHours.toFixed(1), unit: 'h', icon: 'schedule', iconColor: '#94a3b8' },
          { key: 'expiring', label: 'Por vencer', value: expiringCount, icon: 'warning', iconColor: expiringCount > 0 ? '#d97706' : '#94a3b8' },
        ]} />
      </section>

      {/* Barra de filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
          <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
          <input
            placeholder="Buscar por nombre, licencia…"
            aria-label="Buscar tripulación"
            className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filtrar por rol" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">Todos los roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select aria-label="Filtrar por estado" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{filteredPilots.length} de {pilots.length} miembro{pilots.length !== 1 ? 's' : ''}</p>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPilots.map(p => {
          const ms = medicalStatus(p.medical_expiry);
          const ib = invitationBadge(p.invitation_status);
          const active = p.is_active !== false;
          const hours = hoursByPilot[p.id] || 0;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-orange-200 transition-all">
              <div className="flex items-center gap-2.5">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" className="size-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-10 rounded-full bg-[#1A202C] text-white flex items-center justify-center font-black text-xs shrink-0">
                    {initials(p.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-xs truncate">{p.name}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide truncate">{p.pilot_role || p.position || 'Piloto'}</p>
                </div>
                <span className={`size-2 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={active ? 'Activo' : 'Inactivo'} />
              </div>

              {ib && (
                <span className={`self-start px-2 py-0.5 rounded-lg text-[9.5px] font-black border ${ib.color}`}>{ib.label}</span>
              )}

              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-slate-400">badge</span>
                <span className="text-[10.5px] font-bold text-slate-600 font-mono truncate">{p.license_number || 'Sin licencia registrada'}</span>
              </div>

              <div className="flex items-end justify-between pt-2.5 border-t border-slate-100">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Horas PIC</p>
                  <p className="text-sm font-black text-orange-600">{hours.toFixed(1)}h</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Certificación</p>
                  {ms ? (
                    <p className={`text-[10px] font-bold mt-0.5 ${ms.tone}`}>{ms.label}</p>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-300 mt-0.5">Sin registrar</p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingPilot(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors text-[10px] font-black uppercase"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95 shrink-0"
                    aria-label="Eliminar piloto"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {pilots.length === 0 && (
          <div className="col-span-full text-center py-16">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">group</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin pilotos registrados</p>
          </div>
        )}
        {pilots.length > 0 && filteredPilots.length === 0 && (
          <div className="col-span-full text-center py-16">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">search_off</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin resultados con los filtros seleccionados</p>
          </div>
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
