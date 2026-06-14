'use client';
import { useState, useEffect, useCallback } from 'react';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

const statusChip = (s) => {
  if (s === 'pendiente') return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-900/60 text-amber-400">Pendiente</span>;
  if (s === 'liquidada') return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-400">Liquidada</span>;
  return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-400">{s}</span>;
};

export default function ComisionesTab() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendiente');
  const [expanded, setExpanded]   = useState({});    // partner_id → bool
  const [liquidating, setLiquidating] = useState({}); // key → bool
  const [msg, setMsg]             = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/master/commissions?status=${filterStatus}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const liquidate = async (ids, label, key) => {
    if (!ids?.length) return;
    if (!confirm(`¿Marcar como liquidadas ${ids.length} comisión(es) de "${label}"?`)) return;
    setLiquidating(v => ({ ...v, [key]: true }));
    setMsg('');
    try {
      const res  = await fetch('/api/admin/master/commissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg(`✓ ${d.liquidated} comisión(es) liquidada(s)`);
      load();
    } catch (err) { setMsg('✗ ' + err.message); }
    finally { setLiquidating(v => ({ ...v, [key]: false })); }
  };

  const totals = data?.totals || {};

  return (
    <div className="space-y-6">
      {/* Totales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total registros', value: totals.count ?? 0, color: 'text-white' },
          { label: 'Pendiente de pago', value: money(totals.pending), color: 'text-amber-400' },
          { label: 'Total liquidado',  value: money(totals.paid),    color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + acción global */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {[
            { v: 'pendiente', l: 'Pendientes' },
            { v: 'liquidada', l: 'Liquidadas' },
            { v: 'all',       l: 'Todas' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterStatus === v ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>{l}</button>
          ))}
        </div>
        {msg && <p className={`text-xs font-black ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
        <button onClick={load} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all">
          <span className="material-symbols-outlined text-base">sync</span>
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-xs font-black uppercase animate-pulse">Cargando comisiones...</p>
      ) : !data?.partners?.length ? (
        <p className="text-slate-600 text-xs font-bold text-center py-12">Sin comisiones {filterStatus !== 'all' ? filterStatus + 's' : ''} registradas.</p>
      ) : (
        <div className="space-y-4">
          {data.partners.map(partner => {
            const isOpen  = !!expanded[partner.partner_id];
            const allPendingIds = partner.periods
              .flatMap(p => p.statuses.includes('pendiente') ? p.commission_ids : []);
            const partnerTotal = partner.periods.reduce((s, p) => s + p.total_commission, 0);

            return (
              <div key={partner.partner_id} className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                {/* Header del socio */}
                <div className="flex items-center justify-between px-6 py-4 gap-4">
                  <button onClick={() => setExpanded(v => ({ ...v, [partner.partner_id]: !isOpen }))}
                    className="flex items-center gap-3 min-w-0 cursor-pointer text-left flex-1">
                    <span className="material-symbols-outlined text-slate-500 text-base">{isOpen ? 'expand_less' : 'expand_more'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-white uppercase tracking-wide text-sm">{partner.partner_name}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          partner.partner_type === 'escuela' ? 'bg-blue-900/60 text-blue-400' : 'bg-slate-700 text-slate-400'
                        }`}>{partner.partner_type}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {partner.periods.length} período(s) · Total acumulado: <span className="font-black text-orange-400">{money(partnerTotal)}</span>
                      </p>
                    </div>
                  </button>
                  {allPendingIds.length > 0 && filterStatus !== 'liquidada' && (
                    <button
                      disabled={liquidating[partner.partner_id]}
                      onClick={() => liquidate(allPendingIds, partner.partner_name, partner.partner_id)}
                      className="shrink-0 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer transition-all">
                      {liquidating[partner.partner_id] ? 'Procesando...' : `Liquidar todo (${allPendingIds.length})`}
                    </button>
                  )}
                </div>

                {/* Períodos (desplegable) */}
                {isOpen && (
                  <div className="border-t border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-black/20">
                          <th className="text-left px-6 py-3">Período</th>
                          <th className="text-right px-4 py-3">Pagos</th>
                          <th className="text-right px-4 py-3">Ventas</th>
                          <th className="text-right px-4 py-3">Comisión</th>
                          <th className="text-right px-4 py-3">Estado</th>
                          <th className="text-right px-6 py-3">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {partner.periods.map(p => {
                          const periodKey = `${partner.partner_id}-${p.period}`;
                          const isPending = p.statuses.includes('pendiente');
                          return (
                            <tr key={p.period} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-3 font-black text-white">{p.period}</td>
                              <td className="text-right px-4 py-3 text-slate-400">{p.payments_count}</td>
                              <td className="text-right px-4 py-3 font-bold text-slate-300">{money(p.total_sales)}</td>
                              <td className="text-right px-4 py-3 font-black text-amber-400">{money(p.total_commission)}</td>
                              <td className="text-right px-4 py-3">
                                {p.mixed
                                  ? <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">Mixto</span>
                                  : statusChip(p.statuses[0])
                                }
                              </td>
                              <td className="text-right px-6 py-3">
                                {isPending ? (
                                  <button
                                    disabled={liquidating[periodKey]}
                                    onClick={() => liquidate(p.commission_ids, `${partner.partner_name} · ${p.period}`, periodKey)}
                                    className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-700 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer transition-all">
                                    {liquidating[periodKey] ? '...' : 'Liquidar'}
                                  </button>
                                ) : (
                                  <span className="text-slate-600 text-[10px] font-bold">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
