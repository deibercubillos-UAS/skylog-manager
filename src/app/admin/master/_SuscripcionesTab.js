'use client';
import { useState, useEffect } from 'react';

export default function SuscripcionesTab() {
  const [subs,      setSubs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [cancelling, setCancelling] = useState(null); // id en progreso
  const [msg,       setMsg]       = useState('');    // { id, text, ok }

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/admin/master/epayco-subscriptions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (sub) => {
    if (!sub.id) { setMsg({ id: sub.id, text: 'Esta suscripción no tiene ID válido', ok: false }); return; }
    if (!window.confirm(`¿Cancelar suscripción de ${sub.email}?\n\nID: ${sub.id}\n\nEsta acción cancela el cobro recurrente en ePayco y degrada el plan en Supabase.`)) return;

    setCancelling(sub.id);
    setMsg('');
    try {
      const res  = await fetch('/api/admin/master/epayco-subscriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: sub.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ id: sub.id, text: `✓ Cancelada · ${data.profilesUpdated} perfil(es) degradados a piloto`, ok: true });
      setTimeout(load, 1200);
    } catch (e) {
      setMsg({ id: sub.id, text: '✗ ' + e.message, ok: false });
    } finally {
      setCancelling(null);
    }
  };

  const filtered = subs.filter(s => {
    const q = search.toLowerCase();
    return !q || s.email?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || s.plan?.toLowerCase().includes(q);
  });

  const statusColor = (st) => {
    const s = String(st).toLowerCase();
    if (['active', '1', 'activa', 'activo'].includes(s)) return 'text-emerald-400';
    if (['cancelled', 'cancelada', 'canceled', '0'].includes(s)) return 'text-slate-500 line-through';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email, ID o plan..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-600 outline-none focus:border-orange-500/50"
          />
        </div>
        <button onClick={load} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          <span className="material-symbols-outlined text-base">sync</span>
          Recargar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-2xl px-6 py-4 text-sm text-red-400 font-bold">
          ✗ {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-orange-500 font-black text-xs uppercase tracking-widest animate-pulse">
          Consultando ePayco...
        </div>
      ) : (
        <div className="bg-slate-900 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-xs uppercase text-slate-500 font-black">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Plan ePayco</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">ID suscripción</th>
                  <th className="px-6 py-4">Creada</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-600 font-bold text-xs uppercase">
                      {subs.length === 0 ? 'Sin suscripciones en ePayco' : 'Sin resultados'}
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-white">{s.email}</td>
                    <td className="px-6 py-4 text-xs text-orange-400 font-black uppercase">{s.plan}</td>
                    <td className={`px-6 py-4 text-xs font-black uppercase ${statusColor(s.status)}`}>{s.status}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-[160px] truncate" title={s.id}>{s.id || '—'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-y-1">
                      {msg?.id === s.id && (
                        <p className={`text-xs font-black ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
                      )}
                      <button
                        onClick={() => handleCancel(s)}
                        disabled={cancelling === s.id || !s.id}
                        className="bg-red-900/40 hover:bg-red-700 border border-red-500/30 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-40 flex items-center gap-1.5 ml-auto"
                      >
                        {cancelling === s.id
                          ? <><span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"/>Cancelando...</>
                          : <><span className="material-symbols-outlined text-sm">cancel</span>Cancelar</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-white/5 text-right text-xs text-slate-600 font-mono">
            {filtered.length} de {subs.length} suscripciones
          </div>
        </div>
      )}
    </div>
  );
}
