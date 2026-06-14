'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

export default function SocioPanel() {
  const [ctx, setCtx]         = useState(null);
  const [grants, setGrants]   = useState([]);
  const [giftEmail, setGiftEmail] = useState('');
  const [gifting, setGifting] = useState(false);

  // Asesores
  const [advisors, setAdvisors]       = useState([]);
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [advName, setAdvName]         = useState('');
  const [advEmail, setAdvEmail]       = useState('');
  const [inviting, setInviting]       = useState(false);

  const loadCtx = useCallback(() => {
    fetch('/api/socio/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setCtx(d); setAdvisors(d.advisors || []); }
    }).catch(() => {});
  }, []);

  const loadGrants = useCallback(() => {
    fetch('/api/socio/grants').then(r => r.ok ? r.json() : []).then(d => setGrants(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => { loadCtx(); loadGrants(); }, [loadCtx, loadGrants]);

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
      loadGrants();
      loadCtx();
    } catch (err) { toast.error(err.message); }
    finally { setGifting(false); }
  };

  const inviteAdvisor = async (e) => {
    e.preventDefault();
    if (!advName.trim() || !advEmail.trim()) return;
    setInviting(true);
    try {
      const res  = await fetch('/api/socio/advisors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: advName.trim(), email: advEmail.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al invitar');
      toast.success(`Asesor ${data.advisor?.name} creado. ${data.linked ? 'Vinculado a su cuenta.' : 'Correo de invitación enviado.'}`);
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

  const KPI = ({ label, value, icon, accent }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-base">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-black mt-2 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Panel del socio</h1>
        <p className="text-sm text-slate-500">
          Comisión {ctx.partner?.commission_pct}% · {ctx.partner?.free_days} días gratis · Cupos {ctx.partner?.free_seats_limit ?? '∞'} (usados {ctx.partner?.free_seats_used})
        </p>
      </div>

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
          <button disabled={gifting} className="px-5 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer">
            {gifting ? 'Enviando...' : 'Regalar'}
          </button>
        </form>

        {grants.length > 0 && (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {grants.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold text-slate-700 truncate">{g.email}</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded ${
                  g.status === 'activado'  ? 'bg-emerald-100 text-emerald-700' :
                  g.status === 'enviado'   ? 'bg-amber-100 text-amber-700' :
                  g.status === 'degradado' ? 'bg-red-100 text-red-600' :
                  'bg-slate-100 text-slate-500'
                }`}>{g.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Asesores (solo escuelas, rol owner) ─────────────────────────────── */}
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

          {/* Formulario invitación */}
          {showAdvisorForm && (
            <form onSubmit={inviteAdvisor} className="grid sm:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl">
              <input required value={advName} onChange={e => setAdvName(e.target.value)}
                placeholder="Nombre del asesor"
                className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold col-span-1" />
              <input required type="email" value={advEmail} onChange={e => setAdvEmail(e.target.value)}
                placeholder="correo@asesor.com"
                className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold col-span-1" />
              <div className="flex gap-2">
                <button type="submit" disabled={inviting}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 cursor-pointer">
                  {inviting ? 'Enviando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowAdvisorForm(false)}
                  className="px-3 py-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-black cursor-pointer">
                  ✕
                </button>
              </div>
            </form>
          )}

          {/* Lista de asesores */}
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
  );
}
