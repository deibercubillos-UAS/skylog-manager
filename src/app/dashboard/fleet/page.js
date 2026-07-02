'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AircraftCard from '@/components/AircraftCard';
import TechCard from '@/components/TechCard';
import { PLAN_CONFIG } from '@/lib/planLimits';
import { PERMISSIONS } from '@/lib/roles';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

// Paneles: carga diferida → no bloquean el bundle inicial
const AddAircraftPanel  = dynamic(() => import('@/components/AddAircraftPanel'),  { ssr: false });
const AddTechPanel      = dynamic(() => import('@/components/AddTechPanel'),      { ssr: false });
const EditAircraftPanel = dynamic(() => import('@/components/EditAircraftPanel'), { ssr: false });
const EditTechPanel     = dynamic(() => import('@/components/EditTechPanel'),     { ssr: false });

// ─── Modal: Dar de baja ─────────────────────────────────────────────────────
function BajaModal({ aircraft, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fleet/${aircraft.id}/baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al dar de baja.');
      toast.success(`${aircraft.model} dada de baja correctamente.`);
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-3xl text-red-500">archive</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Dar de baja</h2>
            <p className="text-xs font-bold text-slate-400 truncate">{aircraft.model} · {aircraft.ruas || 'Sin RUAS'}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 space-y-2">
          <p className="text-xs font-bold text-amber-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-amber-600 mt-0.5 shrink-0">block</span>
            La aeronave quedará retirada del servicio y no podrá usarse para nuevos vuelos.
          </p>
          <p className="text-xs font-bold text-amber-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-amber-500 mt-0.5 shrink-0">history</span>
            Su bitácora, mantenimiento y todas las horas registradas se conservan como registro histórico permanente.
          </p>
        </div>

        <label className="block mb-4">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1 block">Motivo de baja (opcional)</span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: Daño irreparable, obsolescencia técnica..."
            rows={3}
            className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar baja'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Transferir ──────────────────────────────────────────────────────
function TransferModal({ aircraft, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { toast.error('Ingresa el email del administrador destino.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/fleet/${aircraft.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_org_email: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al transferir.');
      toast.success(data.message || 'Aeronave transferida correctamente.');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-3xl text-blue-500">swap_horiz</span>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Transferir aeronave</h2>
            <p className="text-xs font-bold text-slate-400 truncate">{aircraft.model} · {aircraft.ruas || 'Sin RUAS'}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-2">
          <p className="text-xs font-bold text-blue-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-blue-500 mt-0.5 shrink-0">check_circle</span>
            Se transfieren: aeronave, horas de vuelo acumuladas e historial de mantenimiento.
          </p>
          <p className="text-xs font-bold text-blue-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5 shrink-0">lock</span>
            Tus registros de bitácora quedan en tu historial privado — no se comparten con el receptor.
          </p>
        </div>

        <label className="block mb-4">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1 block">Email del administrador de la organización destino</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@empresadestino.com"
            className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Transfiriendo...' : 'Confirmar transferencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function FleetPage() {
  const [drones, setDrones] = useState([]);
  const [batteryChipsByAircraft, setBatteryChipsByAircraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [planKey, setPlanKey] = useState('piloto');
  const [tech, setTech] = useState([]);
  const [editingTech, setEditingTech] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [editingDrone, setEditingDrone] = useState(null);
  const [bajaTarget, setBajaTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('role, organization_id, subscription_plan').eq('id', user.id).single();

      if (prof) {
        setUserRole(prof.role);
        setPlanKey(prof.subscription_plan || 'piloto');
      }

      if (prof?.organization_id) {
        const [resDrones, resTech, resLogs, resBatteries] = await Promise.all([
          supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
          supabase.from('inventory_items').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
          // Batería asociada a cada aeronave — se infiere del último vuelo cargado en la
          // Bitácora (battery_logs), mismo patrón que usa /dashboard/batteries a la inversa.
          supabase.from('battery_logs')
            .select('battery_sn, aircraft_id, created_at')
            .eq('organization_id', prof.organization_id)
            .order('created_at', { ascending: false }),
          supabase.from('batteries').select('id, serial_number, cycles, health_status').eq('organization_id', prof.organization_id),
        ]);

        setDrones(resDrones.data || []);
        setTech(resTech.data || []);

        // Log más reciente por serial de batería → aeronave asignada
        const latestAircraftForBattery = {};
        (resLogs.data || []).forEach(l => {
          if (l.battery_sn && l.aircraft_id && !(l.battery_sn in latestAircraftForBattery)) {
            latestAircraftForBattery[l.battery_sn] = l.aircraft_id;
          }
        });
        const battBySerial = {};
        (resBatteries.data || []).forEach(b => { battBySerial[b.serial_number] = b; });
        const chipsByAircraft = {};
        Object.entries(latestAircraftForBattery).forEach(([sn, aircraftId]) => {
          const b = battBySerial[sn];
          if (!b) return;
          (chipsByAircraft[aircraftId] ||= []).push(b);
        });
        setBatteryChipsByAircraft(chipsByAircraft);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const canManage        = PERMISSIONS.canManageFleet.includes(userRole);
  const canManageStatus  = PERMISSIONS.canManageAircraftStatus.includes(userRole);

  // Separar activos de inactivos
  const activeDrones   = drones.filter(d => d.status !== 'Baja' && d.status !== 'Transferido');
  const inactiveDrones = drones.filter(d => d.status === 'Baja' || d.status === 'Transferido');

  // Límites del plan (solo cuenta aeronaves activas)
  const planCfg      = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.piloto;
  const maxDrones    = planCfg.maxDrones === Infinity ? Infinity : planCfg.maxDrones;
  const maxTech      = (planCfg.maxTech === null || planCfg.maxTech === Infinity) ? Infinity : planCfg.maxTech;
  const droneAtLimit = activeDrones.length >= maxDrones;
  const techAtLimit  = tech.length >= maxTech;

  const uniqueModels = useMemo(() => [...new Set(drones.map(d => d.model).filter(Boolean))], [drones]);

  const filteredActiveDrones = useMemo(() => {
    let result = activeDrones;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(d => d.model?.toLowerCase().includes(q) || d.serial_number?.toLowerCase().includes(q) || d.ruas?.toLowerCase().includes(q));
    }
    if (statusFilter === 'operativo')      result = result.filter(d => d.operational_status !== 'en_mantenimiento');
    if (statusFilter === 'en_mantenimiento') result = result.filter(d => d.operational_status === 'en_mantenimiento');
    if (modelFilter) result = result.filter(d => d.model === modelFilter);
    return result;
  }, [activeDrones, search, statusFilter, modelFilter]);

  const maintenanceCount = activeDrones.filter(d => d.operational_status === 'en_mantenimiento').length;

  const handleDeleteTech = (id) => {
    setConfirmDlg({
      isOpen: true,
      title: '¿Eliminar este equipo?',
      message: 'Esta acción es irreversible y no puede deshacerse.',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        const prev = tech;
        setTech(t => t.filter(x => x.id !== id));
        try {
          const { error } = await supabase.from('inventory_items').delete().eq('id', id);
          if (error) throw error;
          toast.success('Equipo eliminado.');
        } catch (err) {
          setTech(prev);
          toast.error('Error al eliminar: ' + err.message);
        }
      },
    });
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO INVENTARIO TÉCNICO...</div>;

  return (
    <div className="space-y-5 md:space-y-8 text-left animate-in fade-in duration-500 pb-20">

      <PageHero
        eyebrow="Flota & Equipo"
        title="Mi Flota"
        description="Registro de aeronaves, horas de vuelo y estado operativo."
        right={
          <div className="flex items-center gap-4 md:gap-6">
            {maintenanceCount > 0 && (
              <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">En mantenimiento</p>
                <p className="text-sm font-black text-orange-400 mt-1 whitespace-nowrap">{maintenanceCount} aeronave{maintenanceCount !== 1 ? 's' : ''}</p>
              </div>
            )}
            {canManage && !droneAtLimit && (
              <button
                onClick={() => setActivePanel('drone')}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Nueva aeronave
              </button>
            )}
          </div>
        }
      />

      <section aria-label="Indicadores de flota" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
        <KPIStrip variant="strip" items={[
          { key: 'total', label: 'Total aeronaves', value: activeDrones.length, icon: 'precision_manufacturing', iconColor: '#ec5b13' },
          { key: 'ready', label: 'Operativas', value: activeDrones.filter(d => d.operational_status !== 'en_mantenimiento').length, icon: 'check_circle', iconColor: '#16a34a' },
          { key: 'hours', label: 'Horas totales flota', value: activeDrones.reduce((sum, d) => sum + parseFloat(d.total_hours || 0), 0).toFixed(1), unit: 'h', icon: 'schedule', iconColor: '#94a3b8' },
          {
            key: 'maint', label: 'En mantenimiento', value: maintenanceCount, icon: 'build',
            iconColor: maintenanceCount > 0 ? '#d97706' : '#94a3b8',
          },
        ]} />
      </section>

      {/* SECCIÓN AERONAVES */}
      <section className="animate-in fade-in duration-700 space-y-4">
        {/* Barra de filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
            <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
            <input
              placeholder="Buscar por modelo, serial…"
              aria-label="Buscar aeronaves"
              className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filtrar por estado" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="operativo">Operativo</option>
              <option value="en_mantenimiento">En mantenimiento</option>
            </select>
            <select aria-label="Filtrar por modelo" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
              <option value="">Todos los modelos</option>
              {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="md:ml-auto">
            <Link href="/dashboard/batteries" className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase text-slate-600 border border-slate-200 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
              <span className="material-symbols-outlined text-sm">battery_charging_full</span>
              Ver baterías
            </Link>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{filteredActiveDrones.length} de {activeDrones.length} unidades activas</p>
          {canManage && droneAtLimit && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400 uppercase">
              <span className="material-symbols-outlined text-sm">lock</span>
              Límite del plan ({activeDrones.length}/{maxDrones === Infinity ? '∞' : maxDrones})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredActiveDrones.map(d => (
            <AircraftCard
              key={d.id}
              aircraft={d}
              onEdit={setEditingDrone}
              onBaja={setBajaTarget}
              onTransfer={setTransferTarget}
              canManage={canManage}
              canManageStatus={canManageStatus}
              batteryChips={batteryChipsByAircraft[d.id] || []}
            />
          ))}
          {activeDrones.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-300">
              <span className="material-symbols-outlined text-5xl mb-3 block">flight</span>
              <p className="font-black text-slate-400 uppercase text-sm">Sin aeronaves registradas</p>
            </div>
          )}
          {activeDrones.length > 0 && filteredActiveDrones.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-300">
              <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
              <p className="font-black text-slate-400 uppercase text-sm">Sin resultados con los filtros seleccionados</p>
            </div>
          )}
        </div>

        {/* Aeronaves inactivas (baja / transferidas) */}
        {inactiveDrones.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowInactive(v => !v)}
              className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-700 transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-base">{showInactive ? 'expand_less' : 'expand_more'}</span>
              {showInactive ? 'Ocultar' : 'Ver'} aeronaves inactivas ({inactiveDrones.length})
            </button>
            {showInactive && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {inactiveDrones.map(d => (
                  <AircraftCard
                    key={d.id}
                    aircraft={d}
                    onEdit={setEditingDrone}
                    onBaja={setBajaTarget}
                    onTransfer={setTransferTarget}
                    canManage={canManage}
                    canManageStatus={canManageStatus}
                    batteryChips={batteryChipsByAircraft[d.id] || []}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECCIÓN TECNOLOGÍA */}
      <section className="mb-12">
        <header className="flex justify-between items-end border-b pb-4 mb-8">
          <div className="text-left">
            <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Tecnología</h2>
            <p className="text-slate-400 text-xs font-black uppercase">{tech.length} PAYLOADS</p>
          </div>
          {canManage && (
            techAtLimit ? (
              <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400 uppercase">
                <span className="material-symbols-outlined text-sm">lock</span>
                Límite del plan ({tech.length}/{maxTech === Infinity ? '∞' : maxTech})
              </span>
            ) : (
              <button
                onClick={() => setActivePanel('tech')}
                className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Nuevo Payload
              </button>
            )
          )}
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tech.map(t => (
            <TechCard key={t.id} item={t} onEdit={setEditingTech} onDelete={(id) => handleDeleteTech(id)} canManage={canManage} />
          ))}
        </div>
      </section>

      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

      {/* Modales de baja y transferencia */}
      {bajaTarget && (
        <BajaModal
          aircraft={bajaTarget}
          onClose={() => setBajaTarget(null)}
          onSuccess={() => { setBajaTarget(null); fetchData(); }}
        />
      )}
      {transferTarget && (
        <TransferModal
          aircraft={transferTarget}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => { setTransferTarget(null); fetchData(); }}
        />
      )}

      {/* PANELES DE CREACIÓN / EDICIÓN */}
      {activePanel === 'drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'tech'  && <AddTechPanel     onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
      {editingTech  && <EditTechPanel     item={editingTech}      onClose={() => setEditingTech(null)}  onSuccess={() => { setEditingTech(null);  fetchData(); }} />}
    </div>
  );
}
