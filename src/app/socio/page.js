'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

const TABS = ['Panel', 'Reportes', 'Perfil'];

export default function SocioPanel() {
  const [tab, setTab]         = useState('Panel');
  const [ctx, setCtx]         = useState(null);
  const [grants, setGrants]   = useState([]);
  const [giftEmail, setGiftEmail] = useState('');
  const [gifting, setGifting] = useState(false);
  const [deletingGrant, setDeletingGrant] = useState({}); // {id: bool}

  // Perfil: logo + borrar cuenta
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');
  const [deletingAcct, setDeletingAcct] = useState(false);

  // Asesores
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [advName, setAdvName]   = useState('');
  const [advEmail, setAdvEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Reportes
  const [report, setReport]         = useState(null);
  const [reportMonths, setReportMonths] = useState(3);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDetail, setShowDetail]   = useState(false);

  const loadCtx = useCallback(() => {
    fetch('/api/socio/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCtx(d);
    }).catch(() => {});
  }, []);

  const loadGrants = useCallback(() => {
    fetch('/api/socio/grants').then(r => r.ok ? r.json() : [])
      .then(d => setGrants(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const loadReport = useCallback((months) => {
    setLoadingReport(true);
    fetch(`/api/socio/reports?months=${months}`)
      .then(r => r.ok ? r.json() : null)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoadingReport(false));
  }, []);

  useEffect(() => { loadCtx(); loadGrants(); }, [loadCtx, loadGrants]);

  useEffect(() => {
    if (tab === 'Reportes') loadReport(reportMonths);
  }, [tab, reportMonths, loadReport]);

  const gift = async (e) => {
    e.preventDefault();
    const email = giftEmail.trim();
    if (!email) return;
    setGifting(true);
    try {
      const res  = await fetch('/api/socio/grants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al regalar');
      toast.success('Perfil regalado. Se envió la invitación por correo.');
      setGiftEmail('');
      loadGrants(); loadCtx();
    } catch (err) { toast.error(err.message); }
    finally { setGifting(false); }
  };

  const deleteGrant = async (g) => {
    if (deletingGrant[g.id]) return;
    const msg = g.status === 'activado'
      ? `¿Anular el perfil regalado a ${g.email}? El beneficiario perderá el plan obsequiado.`
      : `¿Anular la invitación enviada a ${g.email}?`;
    if (!confirm(msg)) return;
    setDeletingGrant(v => ({ ...v, [g.id]: true }));
    try {
      const res = await fetch('/api/socio/grants', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_id: g.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al anular');
      toast.success('Perfil regalado anulado.');
      loadGrants(); loadCtx();
    } catch (err) { toast.error(err.message); }
    finally { setDeletingGrant(v => ({ ...v, [g.id]: false })); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-subir el mismo archivo
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/socio/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir el logo');
      toast.success('Logo actualizado. Aparecerá en los correos a tus beneficiarios.');
      loadCtx();
    } catch (err) { toast.error(err.message); }
    finally { setUploadingLogo(false); }
  };

  const removeLogo = async () => {
    if (!confirm('¿Quitar el logo?')) return;
    try {
      const res = await fetch('/api/socio/logo', { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Logo eliminado.');
      loadCtx();
    } catch (err) { toast.error(err.message); }
  };

  const deleteAccount = async () => {
    setDeletingAcct(true);
    try {
      const res = await fetch('/api/socio/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmEmail: delConfirm.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al borrar la cuenta');
      toast.success('Cuenta eliminada. Hasta pronto.');
      window.location.href = '/';
    } catch (err) { toast.error(err.message); setDeletingAcct(false); }
  };

  const inviteAdvisor = async (e) => {
    e.preventDefault();
    if (!advName.trim() || !advEmail.trim()) return;
    setInviting(true);
    try {
      const res  = await fetch('/api/socio/advisors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: advName.trim(), email: advEmail.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al invitar');
      toast.success(`Asesor ${data.advisor?.name} creado. ${data.linked ? 'Vinculado a su cuenta.' : 'Correo enviado.'}`);
      setAdvName(''); setAdvEmail(''); setShowAdvisorForm(false);
      loadCtx();
    } catch (err) { toast.error(err.message); }
    finally { setInviting(false); }
  };

  const deactivateAdvisor = async (id, name) => {
    if (!confirm(`¿Desactivar a ${name}? Sus códigos dejarán de funcionar.`)) return;
    try {
      const res = await fetch('/api/socio/advisors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advisor_id: id }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Asesor desactivado.');
      loadCtx();
    } catch (err) { toast.error(err.message); }
  };

  if (!ctx) return <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Cargando...</p>;

  const s    = ctx.stats || {};
  const copy = (txt) => { navigator.clipboard?.writeText(txt); toast.success('Código copiado'); };
  const money = (n)  => '$' + (Number(n) || 0).toLocaleString('es-CO');
  const isSchoolOwner = ctx.partner?.type === 'escuela' && ctx.member?.role === 'owner';
  const advisors = ctx.advisors || [];

  const KPI = ({ label, value, icon, accent }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-base">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-black mt-2 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );

  const statusChip = (status) => {
    if (status === 'pendiente') return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">Pendiente</span>;
    if (status === 'liquidada') return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Liquidada</span>;
    return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Panel del socio</h1>
        <p className="text-sm text-slate-500">
          Comisión {ctx.partner?.commission_pct}% · {ctx.partner?.free_days} días gratis · Cupos {ctx.partner?.free_seats_limit ?? '∞'} (usados {ctx.partner?.free_seats_used})
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>{t}</button>
        ))}
      </div>

      {/* ── TAB: PANEL ──────────────────────────────────────────────────────── */}
      {tab === 'Panel' && (
        <div className="space-y-8">
          {/* Códigos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tus códigos de venta</p>
            <div className="flex flex-wrap gap-2">
              {(ctx.codes || []).filter(c => c.active).map(c => (
                <button key={c.code} onClick={() => copy(c.code)} title="Copiar"
                  className="text-sm font-mono font-black px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 cursor-pointer">
                  {c.code}
                </button>
              ))}
              {!(ctx.codes || []).length && <span className="text-xs text-slate-400 italic">Sin códigos asignados todavía.</span>}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI label="Perfiles regalados" value={s.grants_total ?? 0}     icon="card_giftcard" />
            <KPI label="Perfiles activos"   value={s.grants_active ?? 0}    icon="check_circle"  accent="text-emerald-600" />
            <KPI label="Clientes referidos" value={s.referrals_total ?? 0}  icon="groups" />
            <KPI label="Referidos activos"  value={s.referrals_active ?? 0} icon="trending_up"   accent="text-emerald-600" />
            <KPI label="Comisión pendiente" value={money(s.commission_pending)} icon="schedule"  accent="text-orange-600" />
            <KPI label="Comisión liquidada" value={money(s.commission_paid)}    icon="paid" />
          </div>

          {/* Regalar perfil */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Regalar perfil gratis</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Ingresa el correo del beneficiario. Recibirá una invitación con {ctx.partner?.free_days} días gratis.
                Único por persona, no renovable.
              </p>
            </div>
            <form onSubmit={gift} className="flex gap-2">
              <input type="email" required value={giftEmail} onChange={e => setGiftEmail(e.target.value)}
                placeholder="correo@beneficiario.com"
                className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl text-sm font-bold" />
              <button disabled={gifting} className="px-5 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer">
                {gifting ? 'Enviando...' : 'Regalar'}
              </button>
            </form>

            {grants.length > 0 && (
              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                {grants.map(g => (
                  <div key={g.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                    <span className="font-bold text-slate-700 truncate flex-1 min-w-0">{g.email}</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                      g.status === 'activado'  ? 'bg-emerald-100 text-emerald-700' :
                      g.status === 'enviado'   ? 'bg-amber-100 text-amber-700' :
                      g.status === 'degradado' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>{g.status}</span>
                    {isSchoolOwner || ctx.member?.role === 'owner' ? (
                      <button onClick={() => deleteGrant(g)} disabled={deletingGrant[g.id]} title="Anular perfil regalado"
                        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asesores (solo escuela owner) */}
          {isSchoolOwner && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Mis asesores</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Cada asesor tiene su propio código de ventas y genera comisiones bajo tu cuenta.
                  </p>
                </div>
                <button onClick={() => setShowAdvisorForm(v => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Invitar
                </button>
              </div>

              {showAdvisorForm && (
                <form onSubmit={inviteAdvisor} className="grid sm:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl">
                  <input required value={advName} onChange={e => setAdvName(e.target.value)}
                    placeholder="Nombre del asesor"
                    className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                  <input required type="email" value={advEmail} onChange={e => setAdvEmail(e.target.value)}
                    placeholder="correo@asesor.com"
                    className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={inviting}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer">
                      {inviting ? 'Enviando...' : 'Crear'}
                    </button>
                    <button type="button" onClick={() => setShowAdvisorForm(false)}
                      className="px-3 py-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-black cursor-pointer">✕</button>
                  </div>
                </form>
              )}

              {advisors.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Aún no tienes asesores. Invita al primero.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {advisors.map(a => {
                    const activeCode = (a.codes || []).find(c => c.active);
                    const owner = (a.members || []).find(m => m.role === 'owner');
                    return (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-slate-800 truncate">{a.name}</p>
                            {a.status !== 'activo' && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-600 rounded">Inactivo</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {owner?.email || 'Sin cuenta vinculada'}
                            {activeCode && (
                              <> · <button onClick={() => copy(activeCode.code)}
                                className="font-mono font-black text-orange-600 cursor-pointer hover:underline">{activeCode.code}</button></>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-slate-700">{a.referrals_active} activos</p>
                            <p className="text-[10px] text-slate-400">{a.referrals_total} referidos</p>
                          </div>
                          {a.status === 'activo' && (
                            <button onClick={() => deactivateAdvisor(a.id, a.name)} title="Desactivar"
                              className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-lg">person_remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: REPORTES ───────────────────────────────────────────────────── */}
      {tab === 'Reportes' && (
        <div className="space-y-6">
          {/* Filtro período */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Período:</span>
            {[1, 3, 6, 12].map(m => (
              <button key={m} onClick={() => setReportMonths(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-colors ${
                  reportMonths === m ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>{m === 12 ? '1 año' : `${m} ${m === 1 ? 'mes' : 'meses'}`}</button>
            ))}
          </div>

          {loadingReport ? (
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Cargando reporte...</p>
          ) : !report ? (
            <p className="text-xs text-slate-400 italic">No se pudo cargar el reporte.</p>
          ) : (
            <>
              {/* Totales propios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pagos recibidos</p>
                  <p className="text-2xl font-black mt-1 text-slate-900">{report.totals?.payments ?? 0}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comisión pendiente</p>
                  <p className="text-2xl font-black mt-1 text-orange-600">{money(report.totals?.pending)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comisión liquidada</p>
                  <p className="text-2xl font-black mt-1 text-slate-900">{money(report.totals?.paid)}</p>
                </div>
              </div>

              {/* Desglose por asesor (escuela) */}
              {isSchoolOwner && (report.advisors?.length > 0) && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Desglose por asesor</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                          <th className="text-left px-5 py-3">Asesor</th>
                          <th className="text-right px-4 py-3">Referidos</th>
                          <th className="text-right px-4 py-3">Pagos</th>
                          <th className="text-right px-4 py-3">Ventas</th>
                          <th className="text-right px-4 py-3">Pendiente</th>
                          <th className="text-right px-5 py-3">Liquidado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.advisors.map(a => (
                          <tr key={a.id} className={a.status !== 'activo' ? 'opacity-50' : ''}>
                            <td className="px-5 py-3">
                              <span className="font-black text-slate-800">{a.name}</span>
                              {a.status !== 'activo' && <span className="ml-2 text-[10px] text-red-500">inactivo</span>}
                            </td>
                            <td className="text-right px-4 py-3 text-slate-600">{a.referrals_count}</td>
                            <td className="text-right px-4 py-3 text-slate-600">{a.payments_count}</td>
                            <td className="text-right px-4 py-3 font-bold text-slate-800">{money(a.total_sales)}</td>
                            <td className="text-right px-4 py-3 font-bold text-orange-600">{money(a.commission_pending)}</td>
                            <td className="text-right px-5 py-3 font-bold text-slate-900">{money(a.commission_paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Historial por período */}
              {report.history?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Historial por período</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                          <th className="text-left px-5 py-3">Período</th>
                          <th className="text-right px-4 py-3">Pagos</th>
                          <th className="text-right px-4 py-3">Ventas</th>
                          <th className="text-right px-4 py-3">Comisión</th>
                          <th className="text-right px-5 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.history.map(h => (
                          <tr key={h.period}>
                            <td className="px-5 py-3 font-black text-slate-800">{h.period}</td>
                            <td className="text-right px-4 py-3 text-slate-600">{h.count}</td>
                            <td className="text-right px-4 py-3 font-bold text-slate-700">{money(h.sales)}</td>
                            <td className="text-right px-4 py-3 font-black text-orange-600">{money(h.commission)}</td>
                            <td className="text-right px-5 py-3">{statusChip(h.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detalle de cada comisión (expandible) */}
              {report.detail?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setShowDetail(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Detalle de comisiones ({report.detail.length})</h2>
                    <span className="material-symbols-outlined text-slate-400">{showDetail ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {showDetail && (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <th className="text-left px-5 py-3">Fecha</th>
                            <th className="text-left px-4 py-3">Plan</th>
                            <th className="text-right px-4 py-3">Venta</th>
                            <th className="text-right px-4 py-3">%</th>
                            <th className="text-right px-4 py-3">Comisión</th>
                            <th className="text-right px-5 py-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.detail.map(c => (
                            <tr key={c.id}>
                              <td className="px-5 py-2.5 text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : '—'}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-bold text-slate-700 capitalize">{c.plan || '—'}</span>
                                {c.billing && <span className="ml-1 text-slate-400">· {c.billing === 'annual' ? 'anual' : 'mensual'}</span>}
                              </td>
                              <td className="text-right px-4 py-2.5 text-slate-600">{money(c.sale_amount)}</td>
                              <td className="text-right px-4 py-2.5 text-slate-400">{c.commission_pct}%</td>
                              <td className="text-right px-4 py-2.5 font-black text-orange-600">{money(c.commission_amount)}</td>
                              <td className="text-right px-5 py-2.5">{statusChip(c.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {!report.detail?.length && !report.history?.length && (
                <p className="text-sm text-slate-400 italic text-center py-8">Sin comisiones registradas en este período.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: PERFIL ─────────────────────────────────────────────────────── */}
      {tab === 'Perfil' && (
        <div className="space-y-6 max-w-2xl">
          {/* Datos de la cuenta */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Mi cuenta</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</p>
                <p className="font-bold text-slate-800">{ctx.member?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo</p>
                <p className="font-bold text-slate-800 break-all">{ctx.member?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Socio</p>
                <p className="font-bold text-slate-800">{ctx.partner?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rol</p>
                <p className="font-bold text-slate-800">{ctx.member?.role === 'owner' ? 'Administrador' : 'Asesor'}</p>
              </div>
            </div>
          </div>

          {/* Logo del socio (solo owner) */}
          {ctx.member?.role === 'owner' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Logo de {ctx.partner?.type === 'escuela' ? 'la escuela' : 'tu marca'}</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Se mostrará junto al de BitaFly en los correos que reciben tus beneficiarios y asesores. PNG, JPG, WEBP o SVG · máx 2 MB.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {ctx.partner?.logo_url
                    ? <img src={ctx.partner.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    : <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={`px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer inline-flex items-center gap-1.5 ${uploadingLogo ? 'opacity-60 pointer-events-none' : ''}`}>
                    <span className="material-symbols-outlined text-sm">upload</span>
                    {uploadingLogo ? 'Subiendo...' : (ctx.partner?.logo_url ? 'Cambiar logo' : 'Subir logo')}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={uploadLogo} className="hidden" />
                  </label>
                  {ctx.partner?.logo_url && (
                    <button onClick={removeLogo} className="text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer">Quitar logo</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Borrar cuenta */}
          <div className="bg-white border border-red-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-red-600">Borrar mi cuenta</h2>
            <p className="text-xs text-slate-500 font-medium">
              Esta acción es permanente. Se eliminará tu acceso y tus datos personales. Para confirmar, escribe tu correo
              <span className="font-mono font-bold text-slate-700"> {ctx.member?.email}</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="email" value={delConfirm} onChange={e => setDelConfirm(e.target.value)}
                placeholder="Escribe tu correo para confirmar"
                className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" />
              <button onClick={deleteAccount}
                disabled={deletingAcct || delConfirm.trim().toLowerCase() !== String(ctx.member?.email || '').toLowerCase()}
                className="px-5 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                {deletingAcct ? 'Borrando...' : 'Borrar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
