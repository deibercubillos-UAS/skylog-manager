'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { PERMISSIONS } from '@/lib/roles';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const AddBatteryPanel  = dynamic(() => import('@/components/AddBatteryPanel'),  { ssr: false });
const EditBatteryPanel = dynamic(() => import('@/components/EditBatteryPanel'), { ssr: false });

const RETIRE_CYCLES = 200; // mismo umbral que BatteryCard.js y el escáner de alertas del dashboard

const healthColor = h => h >= 85 ? '#16a34a' : h >= 65 ? '#d97706' : '#dc2626';

export default function BatteriesPage() {
  const [batteries, setBatteries] = useState([]);
  const [assignedMap, setAssignedMap] = useState({}); // serial_number -> aircraft model
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [activePanel, setActivePanel] = useState(false);
  const [editingBattery, setEditingBattery] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles').select('role, organization_id').eq('id', user.id).single();
      if (prof) setUserRole(prof.role);
      if (!prof?.organization_id) return;

      // Baterías + logs para derivar la aeronave asignada (último vuelo por serial).
      // El propio diseño aclara que la aeronave asignada se infiere del último vuelo
      // cargado en la Bitácora — no es un campo del esquema de baterías.
      const [resBat, resLogs] = await Promise.all([
        supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
        supabase.from('battery_logs')
          .select('battery_sn, aircraft:aircraft_id(model, serial_number), created_at')
          .eq('organization_id', prof.organization_id)
          .order('created_at', { ascending: false }),
      ]);

      setBatteries(resBat.data || []);

      // Primer log (más reciente) por serial → aeronave asignada.
      const map = {};
      (resLogs.data || []).forEach(log => {
        if (log.battery_sn && !map[log.battery_sn] && log.aircraft) {
          map[log.battery_sn] = log.aircraft.model || log.aircraft.serial_number || null;
        }
      });
      setAssignedMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const canManage = PERMISSIONS.canManageFleet.includes(userRole);

  const uniqueModels = useMemo(() => [...new Set(batteries.map(b => b.model).filter(Boolean))], [batteries]);

  const filteredBatteries = useMemo(() => {
    let result = batteries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(b => b.serial_number?.toLowerCase().includes(q) || b.model?.toLowerCase().includes(q) || b.brand?.toLowerCase().includes(q));
    }
    if (statusFilter === 'servicio') result = result.filter(b => Number(b.cycles || 0) < RETIRE_CYCLES);
    if (statusFilter === 'retirar')  result = result.filter(b => Number(b.cycles || 0) >= RETIRE_CYCLES);
    if (modelFilter) result = result.filter(b => b.model === modelFilter);
    return result;
  }, [batteries, search, statusFilter, modelFilter]);

  const handleDelete = (id) => {
    setConfirmDlg({
      isOpen: true,
      title: '¿Eliminar esta batería?',
      message: 'Esta acción es irreversible y no puede deshacerse.',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        const prev = batteries;
        setBatteries(b => b.filter(x => x.id !== id));
        try {
          const { error } = await supabase.from('batteries').delete().eq('id', id);
          if (error) throw error;
          toast.success('Batería eliminada.');
        } catch (err) {
          setBatteries(prev);
          toast.error('Error al eliminar: ' + err.message);
        }
      },
    });
  };

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Cargando inventario de baterías...
    </div>
  );

  const inService = batteries.filter(b => Number(b.cycles || 0) < RETIRE_CYCLES).length;
  const avgCycles = batteries.length
    ? Math.round(batteries.reduce((s, b) => s + Number(b.cycles || 0), 0) / batteries.length)
    : 0;
  const toRetire = batteries.filter(b => Number(b.cycles || 0) >= RETIRE_CYCLES).length;

  return (
    <div className="space-y-5 md:space-y-8 text-left animate-in fade-in duration-500 pb-20">
      <PageHero
        eyebrow="Flota & Equipo"
        title="Baterías"
        description="Inventario independiente de la aeronave — intercambiables, con ciclos y salud propios."
        right={
          <div className="flex items-center gap-4 md:gap-6">
            {toRetire > 0 && (
              <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">Por retirar (≥{RETIRE_CYCLES} ciclos)</p>
                <p className="text-sm font-black text-red-400 mt-1 whitespace-nowrap">{toRetire} batería{toRetire !== 1 ? 's' : ''}</p>
              </div>
            )}
            {canManage && (
              <button
                onClick={() => setActivePanel(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Nueva batería
              </button>
            )}
          </div>
        }
      />

      <section aria-label="Indicadores de baterías" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
        <KPIStrip variant="strip" items={[
          { key: 'total', label: 'Total baterías', value: batteries.length, icon: 'battery_charging_full', iconColor: '#ec5b13' },
          { key: 'service', label: 'En servicio', value: inService, icon: 'check_circle', iconColor: '#16a34a' },
          { key: 'cycles', label: 'Ciclos promedio', value: avgCycles, icon: 'sync', iconColor: '#94a3b8' },
          { key: 'retire', label: 'Por retirar', value: toRetire, icon: 'warning', iconColor: toRetire > 0 ? '#dc2626' : '#94a3b8' },
        ]} />
      </section>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Nota informativa */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-50/60 border-b border-orange-100">
          <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
          <span className="text-[11px] font-semibold text-orange-800">Una batería puede usarse en varias aeronaves — la columna &quot;Última aeronave&quot; se actualiza sola al cargar cada vuelo en la Bitácora, no se asigna manualmente.</span>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-slate-100">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
            <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
            <input
              placeholder="Buscar por ID, modelo…"
              aria-label="Buscar baterías"
              className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filtrar por estado" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="servicio">En servicio</option>
              <option value="retirar">Por retirar</option>
            </select>
            <select aria-label="Filtrar por modelo" className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
              <option value="">Todos los modelos</option>
              {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="md:ml-auto">
            <Link href="/dashboard/fleet" className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase text-slate-600 border border-slate-200 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all">
              <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              Ver flota
            </Link>
          </div>
        </div>

        {filteredBatteries.length === 0 ? (
          <div className="text-center py-16 text-slate-300">
            <span className="material-symbols-outlined text-5xl mb-3 block">battery_charging_full</span>
            <p className="font-black text-slate-400 uppercase text-sm">
              {batteries.length === 0 ? 'Sin baterías registradas' : 'Sin resultados con los filtros seleccionados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[860px]">
              <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <th className="px-5 py-3">ID / Serial</th>
                  <th className="px-3 py-3">Modelo</th>
                  <th className="px-3 py-3">Ciclos</th>
                  <th className="px-3 py-3">Salud</th>
                  <th className="px-3 py-3">Última aeronave</th>
                  <th className="px-3 py-3">Estado</th>
                  {canManage && <th className="px-3 py-3 w-20"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBatteries.map(b => {
                  const cycles = Number(b.cycles || 0);
                  const health = Number(b.health_status ?? 100);
                  const retire = cycles >= RETIRE_CYCLES;
                  const aircraft = assignedMap[b.serial_number];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                      <td className="px-5 py-3">
                        <p className="font-black font-mono text-orange-600">{b.serial_number}</p>
                        {b.brand && <p className="text-slate-400 font-medium">{b.brand}</p>}
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-semibold">{b.model || '—'}</td>
                      <td className="px-3 py-3 text-slate-900 font-bold tabular-nums">{cycles}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-11 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${health}%`, background: healthColor(health) }} />
                          </div>
                          <span className="text-slate-500 font-bold">{health}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {aircraft ? (
                          <span className="text-slate-700 font-semibold">{aircraft}</span>
                        ) : (
                          <span className="text-slate-300 italic">Disponible — sin uso reciente</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {retire ? (
                          <span className="flex items-center gap-1 font-black text-red-600">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Por retirar
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-black text-emerald-600">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            En servicio
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditingBattery(b)} aria-label="Editar batería"
                              className="size-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors active:scale-95">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button onClick={() => handleDelete(b.id)} aria-label="Eliminar batería"
                              className="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
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
          </div>
        )}
      </div>

      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

      {activePanel && <AddBatteryPanel onClose={() => setActivePanel(false)} onSuccess={() => { setActivePanel(false); fetchData(); }} />}
      {editingBattery && <EditBatteryPanel battery={editingBattery} onClose={() => setEditingBattery(null)} onSuccess={() => { setEditingBattery(null); fetchData(); }} />}
    </div>
  );
}
