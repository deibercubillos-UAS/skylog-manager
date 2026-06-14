'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

const EMPTY = { type: 'escuela', name: '', parent_partner_id: '', commission_pct: 20, free_seats_limit: '', free_days: 90 };

export default function SociosTab() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/partners');
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar socios'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const escuelas = partners.filter(p => p.type === 'escuela');

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warn('Nombre requerido'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');
      toast.success(`Socio creado. Código: ${data.codes?.[0]?.code ?? '—'}`);
      setForm(EMPTY);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const saveEdit = async (id) => {
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updateData: editData }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Socio actualizado');
      setEditId(null); setEditData({});
      load();
    } catch (err) { toast.error(err.message); }
  };

  const toggleStatus = async (p) => {
    const next = p.status === 'activo' ? 'inactivo' : 'activo';
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, updateData: { status: next } }),
      });
      if (!res.ok) throw new Error('Error');
      load();
    } catch { toast.error('No se pudo cambiar el estado'); }
  };

  const addCode = async (partnerId) => {
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_code', partner_id: partnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Código creado: ${data.code}`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const copy = (txt) => { navigator.clipboard?.writeText(txt); toast.success('Código copiado'); };

  const [memberEmail, setMemberEmail] = useState({}); // {partnerId: email}
  const [memberRole, setMemberRole]   = useState({}); // {partnerId: role}

  const addMember = async (partnerId) => {
    const email = (memberEmail[partnerId] || '').trim();
    if (!email) { toast.warn('Ingresa un correo'); return; }
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_member', partner_id: partnerId, email, role: memberRole[partnerId] || 'owner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.email_error) {
        toast.warn(`Vinculado, pero el correo falló: ${data.email_error}`);
      } else {
        toast.success(data.invited ? 'Invitación enviada por correo' : 'Miembro vinculado y notificado');
      }
      setMemberEmail({ ...memberEmail, [partnerId]: '' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const removeMember = async (memberId) => {
    try {
      const res = await fetch('/api/admin/master/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_member', member_id: memberId }),
      });
      if (!res.ok) throw new Error('Error');
      load();
    } catch { toast.error('No se pudo quitar'); }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEditData({ name: p.name, commission_pct: p.commission_pct, free_seats_limit: p.free_seats_limit ?? '', free_days: p.free_days, status: p.status });
  };

  return (
    <div className="space-y-8">
      {/* Crear socio */}
      <form onSubmit={create} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Nuevo socio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Tipo</span>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, parent_partner_id: '' })}
              className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900">
              <option value="escuela">Escuela</option>
              <option value="asesor">Asesor</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Nombre</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Escuela Águilas del Cielo" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold" />
          </label>
          {form.type === 'asesor' && (
            <label className="space-y-1 md:col-span-3">
              <span className="text-[10px] font-black uppercase text-slate-400">Pertenece a (escuela, opcional)</span>
              <select value={form.parent_partner_id} onChange={e => setForm({ ...form, parent_partner_id: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900">
                <option value="">— Asesor independiente —</option>
                {escuelas.map(es => <option key={es.id} value={es.id}>{es.name}</option>)}
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Comisión %</span>
            <input type="number" step="0.01" min="0" value={form.commission_pct}
              onChange={e => setForm({ ...form, commission_pct: e.target.value })}
              className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Cupos (vacío = ∞)</span>
            <input type="number" min="0" value={form.free_seats_limit}
              onChange={e => setForm({ ...form, free_seats_limit: e.target.value })}
              placeholder="∞" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Días gratis</span>
            <input type="number" min="1" value={form.free_days}
              onChange={e => setForm({ ...form, free_days: e.target.value })}
              className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900" />
          </label>
        </div>
        <button disabled={creating} className="px-6 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60">
          {creating ? 'Creando...' : 'Crear socio + código'}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <p className="text-center py-10 text-xs font-black uppercase text-slate-400 animate-pulse">Cargando socios...</p>
      ) : partners.length === 0 ? (
        <p className="text-center py-10 text-xs font-black uppercase text-slate-300">Sin socios aún</p>
      ) : (
        <div className="space-y-3">
          {partners.map(p => (
            <div key={p.id} className={`bg-white border rounded-2xl p-5 ${p.status === 'inactivo' ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
              {/* ── Vista normal ── */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  {/* Encabezado */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${p.type === 'escuela' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.type}</span>
                    <h4 className="font-black text-slate-900">{p.name}</h4>
                    {p.status === 'inactivo' && <span className="text-[10px] font-black text-red-500 uppercase">inactivo</span>}
                  </div>

                  {/* Condiciones — editables inline */}
                  {editId === p.id ? (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                      <label className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">Nombre</span>
                        <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-900" />
                      </label>
                      <label className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">Comisión %</span>
                        <input type="number" step="0.01" value={editData.commission_pct}
                          onChange={e => setEditData({ ...editData, commission_pct: e.target.value })}
                          className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-900" />
                      </label>
                      <label className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">Cupos (∞ = vacío)</span>
                        <input type="number" value={editData.free_seats_limit}
                          onChange={e => setEditData({ ...editData, free_seats_limit: e.target.value })}
                          placeholder="∞" className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-900" />
                      </label>
                      <label className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">Días gratis</span>
                        <input type="number" value={editData.free_days}
                          onChange={e => setEditData({ ...editData, free_days: e.target.value })}
                          className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-900" />
                      </label>
                      <div className="col-span-2 sm:col-span-4 flex gap-2 mt-1">
                        <button onClick={() => saveEdit(p.id)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase">Guardar cambios</button>
                        <button onClick={() => { setEditId(null); setEditData({}); }} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-black uppercase">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-xs text-slate-500 font-bold">
                        Comisión <strong className="text-slate-700">{p.commission_pct}%</strong>
                        {' · '}Cupos <strong className="text-slate-700">{p.free_seats_limit ?? '∞'}</strong> (usados {p.free_seats_used})
                        {' · '}<strong className="text-slate-700">{p.free_days}</strong> días gratis
                        {' · '}{p.member_count} miembro(s)
                      </p>
                      <button onClick={() => startEdit(p)}
                        className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-700 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-sm">edit</span>Editar condiciones
                      </button>
                    </div>
                  )}

                  {/* Códigos */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(p.codes || []).map(c => (
                      <button key={c.code} onClick={() => copy(c.code)} title="Copiar código"
                        className={`text-xs font-mono font-black px-2 py-1 rounded-lg border ${c.active ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                        {c.code}
                      </button>
                    ))}
                    <button onClick={() => addCode(p.id)} className="text-xs font-black px-2 py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-orange-600 hover:border-orange-300">+ código</button>
                  </div>

                  {/* Invitaciones */}
                  {(p.invitations || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Invitaciones enviadas</p>
                      <div className="space-y-1">
                        {p.invitations.map(inv => {
                          const expired = inv.status === 'pendiente' && inv.expires_at < new Date().toISOString();
                          const statusFinal = expired ? 'expirada' : inv.status;
                          return (
                            <div key={inv.id} className="flex items-center gap-2 text-xs">
                              <span className={`shrink-0 px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                                statusFinal === 'aceptada'  ? 'bg-emerald-100 text-emerald-700' :
                                statusFinal === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                                              'bg-slate-100 text-slate-500'
                              }`}>{statusFinal}</span>
                              <span className="font-mono text-slate-600 truncate">{inv.email}</span>
                              <span className="text-slate-400 shrink-0">({inv.role})</span>
                              {statusFinal === 'pendiente' && (
                                <span className="text-slate-300 shrink-0 text-[10px]">
                                  vence {new Date(inv.expires_at).toLocaleDateString('es-CO')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Miembros con acceso al panel */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Acceso al panel /socio</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(p.members || []).map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                          {m.name ? <span className="font-black">{m.name}</span> : null}
                          <span className="font-mono text-slate-500">{m.email || m.profile_id}</span>
                          <span className="text-slate-400">({m.role})</span>
                          <button onClick={() => removeMember(m.id)} className="text-slate-400 hover:text-red-500 ml-1"><span className="material-symbols-outlined text-xs">close</span></button>
                        </span>
                      ))}
                      {(p.members || []).length === 0 && <span className="text-xs text-slate-300 italic">Sin miembros activos</span>}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="email" placeholder="correo del usuario" value={memberEmail[p.id] || ''}
                        onChange={e => setMemberEmail({ ...memberEmail, [p.id]: e.target.value })}
                        className="flex-1 min-w-0 p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-900" />
                      <div className="flex gap-2">
                        <select value={memberRole[p.id] || 'owner'} onChange={e => setMemberRole({ ...memberRole, [p.id]: e.target.value })}
                          className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-900">
                          <option value="owner">Admin</option>
                          <option value="asesor">Asesor</option>
                        </select>
                        <button onClick={() => addMember(p.id)} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase whitespace-nowrap">Vincular</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón desactivar */}
                <button onClick={() => toggleStatus(p)}
                  className={`shrink-0 self-start px-3 py-2 rounded-lg text-xs font-black uppercase ${p.status === 'activo' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  {p.status === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
