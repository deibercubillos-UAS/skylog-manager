'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { PERMISSIONS } from '@/lib/roles';
import ConfirmModal from '@/components/ui/ConfirmModal';
import BatteryCard from '@/components/BatteryCard';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const AddBatteryPanel  = dynamic(() => import('@/components/AddBatteryPanel'),  { ssr: false });
const EditBatteryPanel = dynamic(() => import('@/components/EditBatteryPanel'), { ssr: false });

export default function BatteriesPage() {
  const [batteries, setBatteries] = useState([]);
  const [assignedMap, setAssignedMap] = useState({}); // serial_number -> aircraft model
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [activePanel, setActivePanel] = useState(false);
  const [editingBattery, setEditingBattery] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);

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

  const charging = batteries.filter(b => b.status === 'Cargando').length;
  const avgCycles = batteries.length
    ? Math.round(batteries.reduce((s, b) => s + Number(b.cycles || 0), 0) / batteries.length)
    : 0;
  const toRetire = batteries.filter(b => Number(b.cycles || 0) >= 200).length;

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500 pb-20">
      <PageHero
        eyebrow="Flota & Equipo"
        title="Baterías"
        description="Inventario independiente de la aeronave — intercambiables, con ciclos y salud propios."
      />

      <KPIStrip items={[
        { key: 'total', title: 'Total Baterías', value: batteries.length, icon: 'battery_charging_full', color: 'text-slate-900' },
        { key: 'charging', title: 'Cargando', value: charging, icon: 'bolt', color: 'text-orange-500' },
        { key: 'cycles', title: 'Ciclos Promedio', value: avgCycles, icon: 'sync', color: 'text-slate-900' },
        { key: 'retire', title: 'Por Retirar', value: toRetire, icon: 'report_problem', warning: toRetire > 0,
          sub: toRetire > 0 ? '≥ 200 ciclos' : 'Ninguna al límite' },
      ]} />

      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <p className="text-slate-400 text-xs font-black uppercase">{batteries.length} unidad{batteries.length !== 1 ? 'es' : ''}</p>
        {canManage && (
          <button
            onClick={() => setActivePanel(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Nueva Batería
          </button>
        )}
      </div>

      {batteries.length === 0 ? (
        <div className="text-center py-16 text-slate-300">
          <span className="material-symbols-outlined text-5xl mb-3 block">battery_charging_full</span>
          <p className="font-black text-slate-400 uppercase text-sm">Sin baterías registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batteries.map(b => (
            <div key={b.id} className="space-y-1">
              <BatteryCard battery={b} onEdit={setEditingBattery} onDelete={handleDelete} canManage={canManage} />
              {assignedMap[b.serial_number] && (
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">flight</span>
                  {assignedMap[b.serial_number]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

      {activePanel && <AddBatteryPanel onClose={() => setActivePanel(false)} onSuccess={() => { setActivePanel(false); fetchData(); }} />}
      {editingBattery && <EditBatteryPanel battery={editingBattery} onClose={() => setEditingBattery(null)} onSuccess={() => { setEditingBattery(null); fetchData(); }} />}
    </div>
  );
}
