'use client';
import { useState, useEffect } from 'react';

export default function PlanesTab() {
  const [planes, setPlanes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  const loadPlanes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/epayco/config');
      setPlanes(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { loadPlanes(); }, []);

  const syncUIDs = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/epayco/plans', {
        headers: { 'x-admin-key': prompt('Ingresa el ADMIN_SECRET:') || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const ok = data.updates?.filter(u => !u.error).length ?? 0;
      setSyncMsg(`✓ ${ok} UIDs sincronizados. Recargando...`);
      setTimeout(() => { setSyncMsg(''); loadPlanes(); }, 1500);
    } catch (e) {
      setSyncMsg('✗ ' + e.message);
    } finally { setSyncing(false); }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setForm({
      name:                   p.name,
      description:            p.description || '',
      amount:                 p.amount,
      trial_days:             p.trial_days,
      replay_retention_days:  p.replay_retention_days ?? 30,
      replay_max_flights:     p.replay_max_flights    ?? 10,
    });
    setMsg('');
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/epayco/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                   editId,
          ...form,
          amount:               Number(form.amount),
          trial_days:           Number(form.trial_days),
          replay_retention_days: Number(form.replay_retention_days),
          replay_max_flights:    Number(form.replay_max_flights),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.epayco_warning) {
        setMsg(`⚠ Supabase OK, pero ePayco falló: ${data.epayco_warning}`);
      } else {
        setMsg('✓ Guardado y sincronizado con ePayco');
        setTimeout(() => { setEditId(null); setMsg(''); loadPlanes(); }, 1200);
      }
    } catch (e) {
      setMsg('✗ ' + e.message);
    } finally { setSaving(false); }
  };

  const PLAN_ORDER = { piloto: 0, escuadrilla: 1, flota: 2 };
  const grouped = planes.reduce((acc, p) => {
    if (!acc[p.plan_key]) acc[p.plan_key] = [];
    acc[p.plan_key].push(p);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="text-orange-500 font-black text-sm uppercase tracking-widest animate-pulse">Cargando planes...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
          Los cambios se sincronizan con ePayco. Primero sincroniza los UIDs si es la primera vez.
        </p>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={syncUIDs}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-base ${syncing ? 'animate-spin' : ''}`}>sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar UIDs desde ePayco'}
          </button>
          {syncMsg && (
            <p className={`text-xs font-black ${syncMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{syncMsg}</p>
          )}
        </div>
      </div>

      {Object.entries(grouped)
        .sort(([a], [b]) => (PLAN_ORDER[a] ?? 9) - (PLAN_ORDER[b] ?? 9))
        .map(([planKey, items]) => (
          <div key={planKey} className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="bg-black/40 px-8 py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-orange-500 text-lg">workspace_premium</span>
              <h3 className="font-black uppercase tracking-widest text-sm text-white">{planKey}</h3>
            </div>

            <div className="divide-y divide-white/5">
              {items.map(p => (
                <div key={p.id} className="px-8 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                        {p.billing === 'monthly' ? 'Mensual' : 'Anual'}
                      </span>
                      <p className="text-white font-black text-base mt-0.5">{p.name}</p>
                      <p className="text-slate-500 text-xs font-mono mt-0.5">
                        ID: <span className="text-orange-400">{p.epayco_id}</span>
                        {p.epayco_uid
                          ? <> · UID: <span className="text-emerald-400">{p.epayco_uid.slice(0,8)}…</span></>
                          : <span className="text-red-400 ml-1">⚠ UID faltante — sincroniza primero</span>
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-400">${p.amount.toLocaleString('es-CO')}</p>
                      {p.trial_days > 0 && (
                        <span className="text-xs font-black text-emerald-400">{p.trial_days} días gratis</span>
                      )}
                    </div>
                  </div>

                  {editId !== p.id && (
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                      <span className="material-symbols-outlined text-sm text-orange-500/60">play_circle</span>
                      <span>
                        Replay: {p.replay_max_flights === 0 ? '∞ vuelos' : `${p.replay_max_flights} vuelos`}
                        {' · '}
                        {p.replay_retention_days === 0 ? 'permanente' : `${p.replay_retention_days} días`}
                      </span>
                    </div>
                  )}

                  {editId === p.id ? (
                    <div className="bg-black/30 rounded-2xl p-6 space-y-4 border border-orange-500/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Nombre en ePayco</label>
                          <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-medium outline-none focus:border-orange-500/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Precio COP (IVA incl.)</label>
                          <input
                            type="number"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-mono outline-none focus:border-orange-500/50"
                          />
                          {form.amount > 0 && (
                            <p className="text-xs text-slate-600 font-mono">
                              Base: ${Math.floor(Number(form.amount)/1.19).toLocaleString('es-CO')} · IVA: ${(Number(form.amount) - Math.floor(Number(form.amount)/1.19)).toLocaleString('es-CO')}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Días gratis (trial)</label>
                          <input
                            type="number"
                            min="0"
                            value={form.trial_days}
                            onChange={e => setForm(f => ({ ...f, trial_days: e.target.value }))}
                            className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-mono outline-none focus:border-orange-500/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Descripción</label>
                          <input
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-medium outline-none focus:border-orange-500/50"
                          />
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-orange-500 text-base">play_circle</span>
                          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Replay de Vuelo</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Días de retención</label>
                            <input
                              type="number"
                              min="0"
                              value={form.replay_retention_days}
                              onChange={e => setForm(f => ({ ...f, replay_retention_days: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-mono outline-none focus:border-orange-500/50"
                            />
                            <p className="text-xs text-slate-600">0 = historial permanente</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Máx. vuelos con replay</label>
                            <input
                              type="number"
                              min="0"
                              value={form.replay_max_flights}
                              onChange={e => setForm(f => ({ ...f, replay_max_flights: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 p-3 rounded-xl text-white text-sm font-mono outline-none focus:border-orange-500/50"
                            />
                            <p className="text-xs text-slate-600">0 = ilimitados</p>
                          </div>
                        </div>
                      </div>

                      {msg && (
                        <p className={`text-xs font-black ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => { setEditId(null); setMsg(''); }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black uppercase text-xs transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-[2] bg-orange-600 hover:bg-orange-700 py-3 rounded-xl font-black uppercase text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {saving
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                            : <><span className="material-symbols-outlined text-base">sync</span>Guardar y sincronizar ePayco</>
                          }
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Editar plan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
