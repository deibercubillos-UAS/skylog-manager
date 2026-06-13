'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

export default function SocioPanel() {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    fetch('/api/socio/me').then(r => r.ok ? r.json() : null).then(setCtx).catch(() => {});
  }, []);

  if (!ctx) return <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Cargando...</p>;

  const s = ctx.stats || {};
  const copy = (txt) => { navigator.clipboard?.writeText(txt); toast.success('Código copiado'); };

  const KPI = ({ label, value, icon, accent }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-base">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-black mt-2 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );

  const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Panel del socio</h1>
        <p className="text-sm text-slate-500">Comisión {ctx.partner?.commission_pct}% · {ctx.partner?.free_days} días gratis · Cupos {ctx.partner?.free_seats_limit ?? '∞'} (usados {ctx.partner?.free_seats_used})</p>
      </div>

      {/* Códigos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tus códigos de venta</p>
        <div className="flex flex-wrap gap-2">
          {(ctx.codes || []).filter(c => c.active).map(c => (
            <button key={c.code} onClick={() => copy(c.code)} title="Copiar"
              className="text-sm font-mono font-black px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
              {c.code}
            </button>
          ))}
          {(ctx.codes || []).length === 0 && <span className="text-xs text-slate-400 italic">Sin códigos asignados todavía.</span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Perfiles regalados" value={s.grants_total ?? 0} icon="card_giftcard" />
        <KPI label="Perfiles activos" value={s.grants_active ?? 0} icon="check_circle" accent="text-emerald-600" />
        <KPI label="Clientes referidos" value={s.referrals_total ?? 0} icon="groups" />
        <KPI label="Referidos activos" value={s.referrals_active ?? 0} icon="trending_up" accent="text-emerald-600" />
        <KPI label="Comisión pendiente" value={money(s.commission_pending)} icon="schedule" accent="text-orange-600" />
        <KPI label="Comisión liquidada" value={money(s.commission_paid)} icon="paid" accent="text-slate-900" />
      </div>

      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center">
        <p className="text-xs font-bold text-slate-400">
          Próximamente: regalar perfiles por correo, gestión de asesores y reportes detallados.
        </p>
      </div>
    </div>
  );
}
