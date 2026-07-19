'use client';
import { useState, useEffect, useMemo } from 'react';
import SuscripcionesTab from './_SuscripcionesTab';
import PlanesTab from './_PlanesTab';
import SociosTab from './_SociosTab';
import ComisionesTab from './_ComisionesTab';
import ReleasesTab from './_ReleasesTab';
import InvitacionesTab from './_InvitacionesTab';

const TABS = [
  { id: 'users',         label: 'Usuarios',      icon: 'group' },
  { id: 'invitaciones',  label: 'Invitaciones',  icon: 'forward_to_inbox' },
  { id: 'subs',          label: 'Suscripciones', icon: 'subscriptions' },
  { id: 'planes',        label: 'Planes ePayco', icon: 'credit_card' },
  { id: 'socios',        label: 'Socios',        icon: 'handshake' },
  { id: 'comisiones',    label: 'Comisiones',    icon: 'paid' },
  { id: 'releases',      label: 'App Releases',  icon: 'system_update' },
];

const PLANS = ['piloto', 'escuadrilla', 'flota', 'enterprise'];

const PLAN_STYLE = {
  piloto:      'bg-slate-700 text-slate-300',
  escuadrilla: 'bg-blue-900 text-blue-300',
  flota:       'bg-orange-900 text-orange-300',
  enterprise:  'bg-purple-900 text-purple-300',
};

const ROLE_STYLE = {
  superadmin:   'bg-red-900 text-red-300',
  admin:        'bg-orange-900 text-orange-300',
  jefe_pilotos: 'bg-blue-900 text-blue-300',
  gerente_sms:  'bg-green-900 text-green-300',
  piloto:       'bg-slate-700 text-slate-300',
};

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function MasterPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [saveMsg, setSaveMsg] = useState('');
  const [convertingIndependent, setConvertingIndependent] = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [addons, setAddons]         = useState([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonQty, setAddonQty]     = useState({ pilot: 1, drone: 1 });

  const openEdit = (u) => {
    setEdit({ ...u }); setDeleteConfirm(''); setSaveMsg(''); setAddons([]);
    if (u.organization_id) loadAddons(u.organization_id);
  };

  const loadAddons = async (organizationId) => {
    setAddonsLoading(true);
    try {
      const res = await fetch(`/api/admin/master/addons?organization_id=${organizationId}`);
      const data = await res.json();
      setAddons(Array.isArray(data) ? data : []);
    } catch { /* no-op */ }
    finally { setAddonsLoading(false); }
  };

  const addAddon = async (type) => {
    if (!edit?.organization_id) return;
    try {
      const res = await fetch('/api/admin/master/addons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: edit.organization_id, addon_type: type, quantity: addonQty[type] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadAddons(edit.organization_id);
    } catch (e) { setSaveMsg('✗ ' + e.message); }
  };

  const cancelAddon = async (id) => {
    try {
      const res = await fetch('/api/admin/master/addons', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Error al cancelar');
      loadAddons(edit.organization_id);
    } catch (e) { setSaveMsg('✗ ' + e.message); }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/master');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(data);
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Stats por plan
  const stats = useMemo(() => ({
    total: users.length,
    piloto: users.filter(u => u.subscription_plan === 'piloto').length,
    pagos: users.filter(u => ['escuadrilla','flota','enterprise'].includes(u.subscription_plan)).length,
    enterprise: users.filter(u => u.subscription_plan === 'enterprise').length,
  }), [users]);

  // Filtrado
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchSearch = !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || u.subscription_plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [users, search, planFilter]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/master', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: edit.id,
          updateData: {
            subscription_plan:      edit.subscription_plan,
            role:                   edit.role,
            organization_id:        edit.organization_id,
            subscription_expires_at: edit.subscription_expires_at || null,
            last_payment_date:      edit.last_payment_date || null,
            admin_notes:            edit.admin_notes || null,
          },
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveMsg('✓ Guardado');
      setTimeout(() => { setEdit(null); setSaveMsg(''); loadData(); }, 800);
    } catch (e) {
      setSaveMsg('✗ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Activación rápida de plan sin abrir modal
  const quickPlan = async (userId, plan) => {
    await fetch('/api/admin/master', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: userId,
        updateData: {
          subscription_plan: plan,
          last_payment_date: new Date().toISOString().split('T')[0],
          subscription_expires_at: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d.toISOString();
          })(),
        },
      }),
    });
    loadData();
  };

  // Convertir a piloto independiente: le crea una org propia nueva (no toca su
  // membresía anterior) y la deja activa — mismo mecanismo que switch-active.
  const handleConvertIndependent = async () => {
    if (!edit) return;
    if (!confirm(`¿Convertir a ${edit.full_name || edit.email} en piloto independiente? Se le creará una organización propia nueva.`)) return;
    setConvertingIndependent(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/master/convert-independent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: edit.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error al convertir');
      setSaveMsg('✓ Convertido a piloto independiente');
      setTimeout(() => { setEdit(null); setSaveMsg(''); loadData(); }, 900);
    } catch (e) {
      setSaveMsg('✗ ' + e.message);
    } finally {
      setConvertingIndependent(false);
    }
  };

  // Eliminar cuenta por completo — requiere escribir el correo exacto para confirmar.
  const handleDeleteAccount = async () => {
    if (!edit) return;
    if (deleteConfirm.trim().toLowerCase() !== (edit.email || '').trim().toLowerCase()) return;
    setDeletingAccount(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/master/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: edit.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error al eliminar la cuenta');
      setEdit(null);
      setDeleteConfirm('');
      loadData();
    } catch (e) {
      setSaveMsg('✗ ' + e.message);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-orange-500 font-black text-lg uppercase tracking-widest animate-pulse">Autorizando nivel master...</p>
    </div>
  );

  if (error) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 text-center px-6">
      <p className="text-red-500 font-black text-4xl uppercase">Acceso denegado</p>
      <p className="text-slate-400 text-sm max-w-sm">{error}</p>
      <button onClick={() => window.location.href='/dashboard'} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
        Volver al dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-display text-left">
      <main className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500 mb-1">Bitafly</p>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Master Control</h1>
            <p className="text-slate-500 text-xs font-bold uppercase mt-1">Torre de mando global · Solo superadmin</p>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            <span className="material-symbols-outlined text-base">sync</span>
            Actualizar
          </button>
        </header>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <div className="flex gap-1 border-b border-white/10 pb-0 min-w-max md:min-w-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 md:px-6 py-3 font-black uppercase text-xs tracking-widest border-b-2 transition-all -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Invitaciones */}
        {activeTab === 'invitaciones' && <InvitacionesTab />}

        {/* Tab: Suscripciones ePayco */}
        {activeTab === 'subs' && <SuscripcionesTab />}

        {/* Tab: Planes ePayco */}
        {activeTab === 'planes' && <PlanesTab />}

        {/* Tab: Socios (escuelas / asesores) */}
        {activeTab === 'socios' && <SociosTab />}

        {/* Tab: Comisiones */}
        {activeTab === 'comisiones' && <ComisionesTab />}

        {/* Tab: App Releases (OTA updates) */}
        {activeTab === 'releases' && <ReleasesTab />}

        {/* Tab: Usuarios */}
        {activeTab === 'users' && <>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total usuarios', value: stats.total, icon: 'group', color: 'text-white' },
            { label: 'Plan Piloto',    value: stats.piloto, icon: 'person', color: 'text-slate-400' },
            { label: 'Planes pagos',  value: stats.pagos,  icon: 'payments', color: 'text-orange-400' },
            { label: 'Enterprise',    value: stats.enterprise, icon: 'rocket_launch', color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-white/5 rounded-[1.5rem] p-6 flex items-center gap-4">
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
              <div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-black uppercase text-slate-500 tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o empresa..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', ...PLANS].map(p => (
              <button key={p} onClick={() => setPlanFilter(p)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${planFilter === p ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {p === 'all' ? 'Todos' : p}
                {p !== 'all' && <span className="ml-1 opacity-60">{users.filter(u => u.subscription_plan === p).length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla desktop */}
        <div className="hidden md:block bg-slate-900 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-xs uppercase text-slate-500 font-black">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Usuario / Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Vigencia</th>
                  <th className="px-6 py-4">Activación rápida</th>
                  <th className="px-6 py-4 text-right">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-600 font-bold text-xs uppercase">Sin resultados</td></tr>
                )}
                {filtered.map(u => {
                  const expired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date();
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 font-black text-orange-400 uppercase text-xs">
                        {u.company_name || <span className="text-slate-600">Individual</span>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm">{u.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-black uppercase ${ROLE_STYLE[u.role] || 'bg-slate-700 text-slate-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${PLAN_STYLE[u.subscription_plan] || 'bg-slate-700 text-slate-300'}`}>
                          {u.subscription_plan}
                        </span>
                        {expired && <span className="ml-2 text-xs text-red-400 font-black uppercase">Vencido</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {u.subscription_expires_at
                          ? new Date(u.subscription_expires_at).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {['escuadrilla','flota','enterprise'].map(p => (
                            <button key={p} onClick={() => quickPlan(u.id, p)}
                              className={`px-2 py-1 rounded-lg text-xs font-black uppercase transition-all hover:scale-105 ${
                                u.subscription_plan === p ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                              {p === 'escuadrilla' ? 'ESC' : p === 'flota' ? 'FLO' : 'ENT'}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEdit(u)}
                          className="bg-white/10 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all">
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-600 font-bold text-xs uppercase">Sin resultados</p>
          )}
          {filtered.map(u => {
            const expired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date();
            return (
              <div key={u.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3">
                {/* Empresa + usuario */}
                <div>
                  {u.company_name && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5">{u.company_name}</p>
                  )}
                  <p className="font-bold text-white text-sm leading-tight">{u.full_name}</p>
                  <p className="text-xs text-slate-500 font-mono break-all">{u.email}</p>
                </div>
                {/* Chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`px-2 py-1 rounded text-xs font-black uppercase ${ROLE_STYLE[u.role] || 'bg-slate-700 text-slate-300'}`}>
                    {u.role}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-black uppercase ${PLAN_STYLE[u.subscription_plan] || 'bg-slate-700 text-slate-300'}`}>
                    {u.subscription_plan}
                  </span>
                  {expired && <span className="text-xs text-red-400 font-black uppercase">Vencido</span>}
                  {u.subscription_expires_at && (
                    <span className="text-xs text-slate-500 font-mono">
                      hasta {new Date(u.subscription_expires_at).toLocaleDateString('es-CO')}
                    </span>
                  )}
                </div>
                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <div className="flex gap-1 flex-1">
                    {['escuadrilla','flota','enterprise'].map(p => (
                      <button key={p} onClick={() => quickPlan(u.id, p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all active:scale-95 ${
                          u.subscription_plan === p ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {p === 'escuadrilla' ? 'ESC' : p === 'flota' ? 'FLO' : 'ENT'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => openEdit(u)}
                    className="bg-white/10 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all">
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-slate-700 text-xs text-right font-mono">{filtered.length} de {users.length} usuarios</p>

        </>} {/* fin tab users */}
      </main>

      {/* Modal de edición */}
      {edit && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[200]" onClick={e => e.target === e.currentTarget && setEdit(null)}>
          <div className="bg-slate-900 border border-orange-500/20 p-8 md:p-10 rounded-[2.5rem] w-full max-w-lg space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div>
              <h2 className="text-xl font-black uppercase text-white">{edit.full_name}</h2>
              <p className="text-slate-500 text-xs font-mono">{edit.email}</p>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Plan de suscripción</label>
              <select value={edit.subscription_plan} onChange={e => setEdit({ ...edit, subscription_plan: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500/50">
                <option value="piloto">Piloto — Gratis</option>
                <option value="escuadrilla">Escuadrilla — $59.000 COP/mes</option>
                <option value="flota">Flota — $159.000 COP/mes</option>
                <option value="enterprise">Enterprise — Personalizado</option>
              </select>
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Rol del usuario</label>
              <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500/50">
                <option value="piloto">Piloto</option>
                <option value="jefe_pilotos">Jefe de Pilotos</option>
                <option value="gerente_sms">Gerente SMS</option>
                <option value="admin">Admin (Gerente General)</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {/* Vigencia */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Vigente hasta</label>
              <input type="date" value={edit.subscription_expires_at?.split('T')[0] || ''}
                onChange={e => setEdit({ ...edit, subscription_expires_at: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500/50" />
            </div>

            {/* Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Fecha último pago</label>
              <input type="date" value={edit.last_payment_date || ''}
                onChange={e => setEdit({ ...edit, last_payment_date: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500/50" />
            </div>

            {/* AeroCivil gratuito — solo Fase 0 del proceso de certificación (no Fase I), otorga
                plan Escuadrilla, tope real de 6 meses. Prellena el máximo permitido; el
                superadmin puede acortar la fecha "Vigente hasta" arriba si la fase del
                solicitante termina antes. */}
            <button
              type="button"
              onClick={() => {
                const max = new Date(); max.setMonth(max.getMonth() + 6);
                setEdit({
                  ...edit,
                  subscription_plan: 'escuadrilla',
                  subscription_expires_at: max.toISOString().split('T')[0],
                  admin_notes: (edit.admin_notes || '') + '\n[Acceso gratuito — Fase 0 certificación AeroCivil, máx. 6 meses]',
                });
              }}
              className="w-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-900/60 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">verified_user</span>
              Activar acceso gratuito · Fase 0 certificación (máx. 6 meses)
            </button>

            {/* Piloto Independiente — le crea una organización propia nueva
                (no toca ninguna membresía existente) y la deja activa. */}
            <button
              type="button"
              onClick={handleConvertIndependent}
              disabled={convertingIndependent || edit.role === 'superadmin'}
              className="w-full bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-900/60 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-base">person</span>
              {convertingIndependent ? 'Convirtiendo...' : 'Convertir a Piloto Independiente (org. propia nueva)'}
            </button>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Notas internas</label>
              <textarea rows={3} value={edit.admin_notes || ''}
                onChange={e => setEdit({ ...edit, admin_notes: e.target.value })}
                placeholder="Observaciones de pago, WhatsApp, etc."
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-medium outline-none focus:border-orange-500/50 resize-none" />
            </div>

            {/* Org ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">ID de organización</label>
              <input value={edit.organization_id || ''} onChange={e => setEdit({ ...edit, organization_id: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white font-mono text-xs outline-none focus:border-orange-500/50" />
            </div>

            {/* Recursos adicionales — piloto/dron extra, sin importar el plan
                (sin checkout self-service todavía — ver CLAUDE.md; esta es la
                vía real para registrar una venta hecha por fuera de ePayco). */}
            {edit.organization_id && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Recursos adicionales</label>
                {addonsLoading ? (
                  <p className="text-xs text-slate-500">Cargando...</p>
                ) : (
                  <div className="space-y-1.5">
                    {addons.filter(a => a.status === 'active').length === 0 && (
                      <p className="text-xs text-slate-600 italic">Sin recursos adicionales</p>
                    )}
                    {addons.filter(a => a.status === 'active').map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-slate-800 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-white">
                          {a.quantity}× {a.addon_type === 'pilot' ? 'Piloto adicional' : 'Dron adicional'}
                          <span className="text-slate-500 font-mono ml-2">${a.unit_price.toLocaleString('es-CO')}/mes c/u</span>
                        </span>
                        <button onClick={() => cancelAddon(a.id)} className="text-red-400 hover:text-red-300 text-xs font-black uppercase">Cancelar</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex gap-1">
                    <input type="number" min="1" value={addonQty.pilot}
                      onChange={e => setAddonQty({ ...addonQty, pilot: e.target.value })}
                      className="w-14 p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-xs text-center" />
                    <button onClick={() => addAddon('pilot')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black uppercase rounded-lg px-2">+ Piloto ($30k)</button>
                  </div>
                  <div className="flex gap-1">
                    <input type="number" min="1" value={addonQty.drone}
                      onChange={e => setAddonQty({ ...addonQty, drone: e.target.value })}
                      className="w-14 p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-xs text-center" />
                    <button onClick={() => addAddon('drone')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black uppercase rounded-lg px-2">+ Dron ($25k)</button>
                  </div>
                </div>
              </div>
            )}

            {/* Zona de peligro — eliminar cuenta. Oculta para superadmin (la API
                también lo bloquea, esto solo evita mostrar un botón que siempre falla). */}
            {edit.role !== 'superadmin' && (
              <div className="border border-red-500/30 bg-red-950/30 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black uppercase text-red-400 tracking-widest">Zona de peligro</p>
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Elimina el login y el perfil por completo. Si es el único miembro real de su
                  organización, la organización también se elimina (flota, vuelos, pilotos).
                  Escribe el correo exacto para confirmar.
                </p>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={edit.email}
                  className="w-full bg-slate-800 border border-red-500/20 p-3 rounded-xl text-white font-mono text-xs outline-none focus:border-red-500/50"
                />
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirm.trim().toLowerCase() !== (edit.email || '').trim().toLowerCase()}
                  className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta permanentemente'}
                </button>
              </div>
            )}

            {saveMsg && (
              <p className={`text-xs font-black text-center ${saveMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {saveMsg}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEdit(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-[2] bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black uppercase text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
