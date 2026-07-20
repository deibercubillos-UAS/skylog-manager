'use client';
import { useState, useEffect } from 'react';

const ROLES = [
  { value: 'admin',        label: 'Gerente General' },
  { value: 'jefe_pilotos', label: 'Jefe de Pilotos' },
  { value: 'gerente_sms',  label: 'Gerente SMS' },
  { value: 'piloto',       label: 'Piloto' },
];

const PLANS = [
  { value: '',             label: 'Sin plan sugerido',             price: null,            desc: null },
  { value: 'piloto',       label: 'Piloto',                        price: 'Gratis',        desc: '1 drone · 1 piloto · bitácora digital' },
  { value: 'escuadrilla',  label: 'Escuadrilla',                   price: '$59.000/mes',   desc: '3 drones · 4 pilotos · reportes SMS' },
  { value: 'flota',        label: 'Flota',                         price: '$159.000/mes',  desc: '10 drones · 10 pilotos · todas las funciones' },
  { value: 'enterprise',   label: 'Enterprise',                    price: 'A convenir',    desc: 'Ilimitado · soporte dedicado · API' },
];

export default function InvitacionesTab() {
  const [orgs, setOrgs]       = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgSearch, setOrgSearch]     = useState('');
  const [showOrgList, setShowOrgList] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null); // { id, company_name, tax_id }

  const [form, setForm] = useState({ email: '', name: '', role: 'piloto', plan: '', message: '', freeDays: 90 });
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null); // { ok, msg }

  useEffect(() => {
    fetch('/api/admin/master/invite')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setOrgs(d); })
      .finally(() => setLoadingOrgs(false));
  }, []);

  const filteredOrgs = orgs.filter(o =>
    !orgSearch ||
    o.company_name?.toLowerCase().includes(orgSearch.toLowerCase()) ||
    o.tax_id?.includes(orgSearch)
  );

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setSending(true);
    setResult(null);
    try {
      const body = { email: form.email, role: form.role, plan: form.plan || undefined, name: form.name || undefined, message: form.message || undefined };
      if (selectedOrg) body.orgId = selectedOrg.id;
      else body.freeDays = form.freeDays || 90;
      const res  = await fetch('/api/admin/master/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      const grantMsg = data.grantDays ? ` (${data.grantDays} días de acceso gratis, sin tarjeta)` : '';
      const planMsg = data.activatedPlan
        ? ` — Plan "${PLANS.find(p => p.value === data.activatedPlan)?.label || data.activatedPlan}" activado sin pago. Define la fecha de vencimiento desde el tab Usuarios.`
        : '';
      setResult({ ok: true, msg: `Invitación enviada a ${form.email}${data.orgName ? ` → ${data.orgName}` : ''}${data.isExistingUser ? ' (usuario ya registrado — verá banner en su dashboard)' : ''}${grantMsg}${planMsg}` });
      setForm({ email: '', name: '', role: 'piloto', plan: '', message: '', freeDays: 90 });
      setSelectedOrg(null);
      setOrgSearch('');
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Enviar invitación</h2>
        <p className="text-slate-500 text-xs font-bold uppercase mt-1">
          Invita a un cliente a unirse a BitaFly — con o sin organización existente.
        </p>
      </div>

      <form onSubmit={handleSend} className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 space-y-6">

        {/* Email + Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
              Correo electrónico <span className="text-orange-500">*</span>
            </label>
            <input
              type="email" required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="cliente@empresa.com"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder:text-slate-600 outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Nombre (opcional)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Juan Pérez"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder:text-slate-600 outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Rol */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Rol asignado</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLES.map(r => (
              <button
                key={r.value} type="button"
                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
                  form.role === r.value
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan sugerido */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
            Plan ofrecido <span className="text-slate-600 font-normal normal-case">(opcional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLANS.map(p => (
              <button
                key={p.value} type="button"
                onClick={() => setForm(f => ({ ...f, plan: p.value }))}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  form.plan === p.value
                    ? 'bg-orange-600/20 border-orange-500/60 text-white'
                    : 'bg-slate-800 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black uppercase ${form.plan === p.value ? 'text-orange-400' : 'text-slate-300'}`}>
                    {p.label}
                  </p>
                  {p.price && <p className="text-xs font-bold text-slate-400 mt-0.5">{p.price}</p>}
                  {p.desc  && <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{p.desc}</p>}
                </div>
                {form.plan === p.value && (
                  <span className="material-symbols-outlined text-orange-400 text-base shrink-0 mt-0.5">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Organización */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
            Vincular a organización <span className="text-slate-600 font-normal normal-case">(opcional)</span>
          </label>

          {selectedOrg ? (
            <div className="flex items-center gap-3 bg-slate-800 border border-orange-500/30 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-orange-400 text-base">business</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{selectedOrg.company_name}</p>
                {selectedOrg.tax_id && <p className="text-xs text-slate-500 font-mono">NIT {selectedOrg.tax_id}</p>}
              </div>
              <button type="button" onClick={() => { setSelectedOrg(null); setOrgSearch(''); }}
                className="text-slate-500 hover:text-red-400 transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">search</span>
              <input
                type="text"
                value={orgSearch}
                onChange={e => { setOrgSearch(e.target.value); setShowOrgList(true); }}
                onFocus={() => setShowOrgList(true)}
                placeholder={loadingOrgs ? 'Cargando organizaciones...' : 'Buscar organización por nombre o NIT...'}
                disabled={loadingOrgs}
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white font-medium placeholder:text-slate-600 outline-none focus:border-orange-500/60 transition-colors disabled:opacity-50"
              />
              {showOrgList && orgSearch && filteredOrgs.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                  {filteredOrgs.slice(0, 12).map(org => (
                    <button
                      key={org.id} type="button"
                      onClick={() => { setSelectedOrg(org); setOrgSearch(''); setShowOrgList(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <span className="material-symbols-outlined text-slate-500 text-base shrink-0">business</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{org.company_name}</p>
                        {org.tax_id && <p className="text-xs text-slate-500 font-mono">NIT {org.tax_id}</p>}
                      </div>
                    </button>
                  ))}
                  {filteredOrgs.length > 12 && (
                    <p className="px-4 py-2 text-xs text-slate-600 font-bold text-center">
                      {filteredOrgs.length - 12} más — refina la búsqueda
                    </p>
                  )}
                </div>
              )}
              {showOrgList && orgSearch && filteredOrgs.length === 0 && !loadingOrgs && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 font-bold text-center uppercase">Sin resultados</p>
                </div>
              )}
            </div>
          )}

          {!selectedOrg && (
            <p className="text-xs text-slate-600 font-bold">
              Sin organización → el cliente crea su propia cuenta independiente.
            </p>
          )}
        </div>

        {/* Días de acceso gratis — solo para prospecto nuevo sin organización.
            Con organización ya es gratis (hereda el plan de la empresa), sin
            necesidad de regalo. */}
        {!selectedOrg && (
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
              Días de acceso gratis
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={365}
                value={form.freeDays}
                onChange={e => setForm(f => ({ ...f, freeDays: e.target.value }))}
                className="w-28 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-black outline-none focus:border-orange-500/60 transition-colors"
              />
              <p className="text-xs text-slate-600 font-bold flex-1">
                Entra directo, sin elegir plan ni tarjeta — mismo mecanismo que el regalo de socios.
              </p>
            </div>
          </div>
        )}

        {/* Mensaje personalizado */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
            Mensaje personalizado <span className="text-slate-600 font-normal normal-case">(opcional)</span>
          </label>
          <textarea
            rows={3}
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Ej: Te esperamos en BitaFly para gestionar tu flota de drones con cumplimiento RAC 100..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder:text-slate-600 outline-none focus:border-orange-500/60 transition-colors resize-none"
          />
        </div>

        {/* Preview resumen */}
        <div className="bg-black/30 border border-white/5 rounded-xl px-5 py-4 space-y-1.5">
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2">Resumen del correo</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-base text-slate-600">mail</span>
            <span className="font-bold text-white">{form.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-base text-slate-600">badge</span>
            <span>{ROLES.find(r => r.value === form.role)?.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-base text-slate-600">sell</span>
            <span>{PLANS.find(p => p.value === form.plan)?.label || 'Sin plan sugerido'}{form.plan && PLANS.find(p => p.value === form.plan)?.price ? ` · ${PLANS.find(p => p.value === form.plan).price}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-base text-slate-600">business</span>
            <span>{selectedOrg ? selectedOrg.company_name : 'Cuenta independiente (sin org)'}</span>
          </div>
          {!selectedOrg && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-symbols-outlined text-base text-slate-600">redeem</span>
              <span>{form.freeDays || 90} días de acceso gratis, sin plan ni tarjeta</span>
            </div>
          )}
        </div>

        {/* Feedback */}
        {result && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
            result.ok ? 'bg-emerald-900/30 border border-emerald-500/20 text-emerald-400' : 'bg-red-900/30 border border-red-500/20 text-red-400'
          }`}>
            <span className="material-symbols-outlined text-base shrink-0">
              {result.ok ? 'check_circle' : 'error'}
            </span>
            {result.msg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit" disabled={sending || !form.email}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[.99]"
        >
          {sending
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>
            : <><span className="material-symbols-outlined text-base">send</span>Enviar invitación</>
          }
        </button>
      </form>

      {/* Tip */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 flex gap-4 items-start">
        <span className="material-symbols-outlined text-orange-400 text-xl shrink-0 mt-0.5">info</span>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase text-slate-400">Comportamiento según el destinatario</p>
          <ul className="text-xs text-slate-500 space-y-1 font-medium">
            <li>· <strong className="text-slate-400">Usuario nuevo + sin org</strong> — entra directo con acceso gratis por los días indicados, sin elegir plan ni tarjeta. Puedes reenviar/renovar este acceso al mismo correo las veces que quieras desde este panel — a diferencia del regalo de socios, que sigue siendo único por correo.</li>
            <li>· <strong className="text-slate-400">Usuario nuevo + con org</strong> — recibe link a registro que lo une a esa org con el rol elegido, gratis (hereda el plan de la org).</li>
            <li>· <strong className="text-slate-400">Usuario existente + con org</strong> — recibe aviso y ve la invitación como banner en su dashboard.</li>
            <li>· <strong className="text-slate-400">Usuario existente + plan elegido</strong> — el plan se activa de una vez, sin pasar por ePayco ni pedir tarjeta. La fecha de vencimiento queda sin definir — ajústala luego desde el tab Usuarios.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
