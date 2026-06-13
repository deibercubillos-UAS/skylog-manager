'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

export default function SocioPanel() {
  const [ctx, setCtx] = useState(null);
  const [grants, setGrants] = useState([]);
  const [giftEmail, setGiftEmail] = useState('');
  const [gifting, setGifting] = useState(false);

  const loadGrants = () => {
    fetch('/api/socio/grants').then(r => r.ok ? r.json() : []).then(d => setGrants(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/socio/me').then(r => r.ok ? r.json() : null).then(setCtx).catch(() => {});
    loadGrants();
  }, []);

  const gift = async (e) => {
    e.preventDefault();
    const email = giftEmail.trim();
    if (!email) return;
    setGifting(true);
    try {
      const res = await fetch('/api/socio/grants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al regalar');
      toast.success('Perfil regalado. Se envió la invitación por correo.');
      setGiftEmail('');
      loadGrants();
      fetch('/api/socio/me').then(r => r.ok ? r.json() : null).then(setCtx).catch(() => {});
    } catch (err) { toast.error(err.message); }
    finally { setGifting(false); }
  };

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

      {/* Regalar perfil gratis */}
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
          <button disabled={gifting} className="px-5 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60">
            {gifting ? 'Enviando...' : 'Regalar'}
          </button>
        </form>

        {/* Lista de regalos */}
        {grants.length > 0 && (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {grants.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold text-slate-700 truncate">{g.email}</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded ${
                  g.status === 'activado' ? 'bg-emerald-100 text-emerald-700' :
                  g.status === 'enviado'  ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{g.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
