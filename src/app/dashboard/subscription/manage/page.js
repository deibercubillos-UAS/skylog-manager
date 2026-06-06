'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ── Datos de planes ─────────────────────────────────────────────────────────

const PLANS = {
  piloto: {
    label:    'Piloto',
    color:    'slate',
    price:    '$20.000/mes',
    drones:   1,
    pilots:   1,
    batteries:'3',
    replay:   '10 vuelos · 30 días',
    roles:    '1 rol',
    features: { maintenance: true,  sms: false, authorizations: false, audit: false, checklist: false, whiteLabel: false },
  },
  escuadrilla: {
    label:    'Escuadrilla',
    color:    'orange',
    price:    '$59.000/mes',
    drones:   3,
    pilots:   4,
    batteries:'Ilimitadas',
    replay:   '50 vuelos · 90 días',
    roles:    '3 roles',
    features: { maintenance: true,  sms: 'basic', authorizations: true,  audit: false, checklist: false, whiteLabel: false },
  },
  flota: {
    label:    'Flota',
    color:    'blue',
    price:    '$159.000/mes',
    drones:   15,
    pilots:   15,
    batteries:'Ilimitadas',
    replay:   '200 vuelos · 180 días',
    roles:    '4 roles',
    features: { maintenance: 'advanced', sms: 'full', authorizations: true, audit: true, checklist: true, whiteLabel: false },
  },
  enterprise: {
    label:    'Enterprise',
    color:    'emerald',
    price:    'A consultar',
    drones:   '∞',
    pilots:   '∞',
    batteries:'Ilimitadas',
    replay:   'Ilimitado · Permanente',
    roles:    '4 roles + white-label',
    features: { maintenance: 'advanced', sms: 'full', authorizations: true, audit: true, checklist: true, whiteLabel: true },
  },
};

const PLAN_ORDER = ['piloto', 'escuadrilla', 'flota', 'enterprise'];

const EPAYCO_UIDS = {
  escuadrilla: { monthly: 'a1dea39b3836c9ee300a1b4', annual: 'a1dea83a021a7cbb106d996' },
  flota:       { monthly: 'a1deab1b8bef2c21807e912', annual: 'a1deaea5d185a11c30a7419' },
};

// ── Colores por plan ─────────────────────────────────────────────────────────
const COLOR = {
  slate:   { badge: 'bg-slate-100 text-slate-700',   ring: 'ring-slate-200',   btn: 'bg-slate-700 hover:bg-slate-600',   text: 'text-slate-700'   },
  orange:  { badge: 'bg-orange-100 text-orange-700', ring: 'ring-orange-300',  btn: 'bg-[#ec5b13] hover:bg-orange-600', text: 'text-[#ec5b13]'   },
  blue:    { badge: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-300',    btn: 'bg-blue-600 hover:bg-blue-500',    text: 'text-blue-600'    },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-500', text: 'text-emerald-600' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function FeatureRow({ icon, label, value }) {
  const ok = value === true || value === 'basic' || value === 'advanced' || value === 'full';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
        {label}
      </div>
      <span className={`text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded-lg ${
        ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
      }`}>
        {value === true || value === 'full'     ? 'Incluido'
         : value === 'basic'                   ? 'Básico'
         : value === 'advanced'                ? 'Avanzado'
         : value === false                     ? 'No incluido'
         : value}
      </span>
    </div>
  );
}

// ── Roles disponibles para unirse ────────────────────────────────────────────
const JOIN_ROLES = [
  { value: 'piloto',       label: 'Piloto',        hint: 'Registra vuelos y opera aeronaves' },
  { value: 'jefe_pilotos', label: 'Jefe de Pilotos', hint: 'Gestiona pilotos y aprueba vuelos' },
  { value: 'gerente_sms',  label: 'Gerente SMS',   hint: 'Gestiona seguridad operacional' },
];

// ── Componente principal ─────────────────────────────────────────────────────
export default function ManageSubscriptionPage() {
  const router = useRouter();

  const [loading, setLoading]           = useState(true);
  const [profile, setProfile]           = useState(null);
  const [billing, setBilling]           = useState('monthly');
  const [upgrading, setUpgrading]       = useState(null);   // planKey being checked out
  const [showRetention, setShowRetention] = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [cancelDone, setCancelDone]     = useState(false);
  const [cancelError, setCancelError]   = useState('');
  const retentionRef = useRef(null);

  // ── Estado "Unirme a organización" ────────────────────────────────────────
  const [joinNit,        setJoinNit]        = useState('');
  const [joinSearching,  setJoinSearching]  = useState(false);
  const [joinOrg,        setJoinOrg]        = useState(null);   // { orgId, orgName, plan }
  const [joinOrgError,   setJoinOrgError]   = useState('');
  const [joinRole,       setJoinRole]       = useState('piloto');
  const [joinConfirming, setJoinConfirming] = useState(false);  // modal visible
  const [joining,        setJoining]        = useState(false);
  const [joinDone,       setJoinDone]       = useState(false);
  const [joinError,      setJoinError]      = useState('');
  const joinConfirmRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_expires_at, epayco_subscription_id, email')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Auto-focus retention modal
  useEffect(() => {
    if (showRetention && retentionRef.current) retentionRef.current.focus();
  }, [showRetention]);

  const planKey   = profile?.subscription_plan || 'piloto';
  const plan      = PLANS[planKey] || PLANS.piloto;
  const colors    = COLOR[plan.color];
  const isPaid    = planKey !== 'piloto';
  const expiresAt = formatDate(profile?.subscription_expires_at);
  const nextPlans = PLAN_ORDER.slice(PLAN_ORDER.indexOf(planKey) + 1);

  // ── Upgrade handler ────────────────────────────────────────────────────────
  async function handleUpgrade(targetPlan) {
    setUpgrading(targetPlan);
    try {
      if (targetPlan === 'enterprise') {
        window.open('mailto:hola@bitafly.com?subject=Plan%20Enterprise', '_blank');
        setUpgrading(null);
        return;
      }
      const res = await fetch('/api/epayco/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: targetPlan, billing }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else throw new Error(json.error || 'No se pudo iniciar el pago');
    } catch (e) {
      alert('Error al iniciar pago: ' + e.message);
    } finally {
      setUpgrading(null);
    }
  }

  // ── Cancel handler ─────────────────────────────────────────────────────────
  async function handleCancel() {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cancelar');
      setCancelDone(true);
      setProfile(p => ({ ...p, subscription_plan: 'piloto', subscription_expires_at: null, epayco_subscription_id: null }));
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  // Auto-focus modal de confirmación de unirse
  useEffect(() => {
    if (joinConfirming && joinConfirmRef.current) joinConfirmRef.current.focus();
  }, [joinConfirming]);

  // ── Buscar org por NIT ─────────────────────────────────────────────────────
  async function handleSearchOrg(e) {
    e.preventDefault();
    const nit = joinNit.trim();
    if (!nit) return;
    setJoinSearching(true);
    setJoinOrg(null);
    setJoinOrgError('');
    try {
      const res  = await fetch(`/api/auth/validate-join?nit=${encodeURIComponent(nit)}`);
      const json = await res.json();
      if (!json.valid) throw new Error(json.error || 'NIT no encontrado');
      setJoinOrg({ orgId: json.orgId, orgName: json.orgName, plan: json.plan });
    } catch (e) {
      setJoinOrgError(e.message);
    } finally {
      setJoinSearching(false);
    }
  }

  // ── Confirmar unión ────────────────────────────────────────────────────────
  async function handleJoinOrg() {
    setJoining(true);
    setJoinError('');
    try {
      const res  = await fetch('/api/auth/join-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nit: joinNit.trim(), role: joinRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al unirse');
      setJoinDone(true);
      setJoinConfirming(false);
      // Recargar la sesión para reflejar el nuevo org/rol
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (e) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="p-20 text-center" role="status" aria-label="Cargando suscripción">
        <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
        <p className="text-slate-400 text-sm font-medium mt-3">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mi Suscripción</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Gestión de membresía · BitaFly</p>
      </header>

      {/* ── Cancel done banner ───────────────────────────────────────────── */}
      {cancelDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
             role="status" aria-live="polite">
          <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
          <div>
            <p className="text-sm font-black text-amber-800">Suscripción cancelada</p>
            <p className="text-xs text-amber-700 mt-0.5">Tu plan fue degradado a Piloto. Gracias por usar BitaFly.</p>
          </div>
        </div>
      )}

      {/* ── Plan card ────────────────────────────────────────────────────── */}
      <section aria-label="Plan actual" className={`bg-[#1A202C] text-white rounded-[2rem] shadow-2xl overflow-hidden ring-4 ${colors.ring}`}>
        <div className="p-8 md:p-10 relative">
          {/* background glyph */}
          <span className="absolute top-6 right-6 material-symbols-outlined text-[8rem] opacity-[0.07] select-none pointer-events-none"
                aria-hidden="true">verified</span>

          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${colors.text}`}>Plan Actual</span>
              <h3 className="text-5xl font-black uppercase tracking-tighter mt-1">{plan.label}</h3>
              {expiresAt && (
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  Válido hasta {expiresAt}
                </p>
              )}
              {!isPaid && (
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Plan gratuito — actualiza para desbloquear funciones
                </p>
              )}
            </div>

            {/* Limits chips */}
            <div className="flex flex-wrap gap-2 md:justify-end">
              {[
                { icon: 'flight', label: `${plan.drones} aeronave${plan.drones === 1 ? '' : 's'}` },
                { icon: 'person', label: `${plan.pilots} piloto${plan.pilots === 1 ? '' : 's'}` },
                { icon: 'battery_full', label: plan.batteries },
                { icon: 'replay', label: plan.replay },
              ].map(chip => (
                <div key={chip.icon}
                     className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{chip.icon}</span>
                  {chip.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="bg-white px-8 md:px-10 py-4 rounded-b-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Incluido en tu plan</p>
          <FeatureRow icon="build"           label="Mantenimiento"              value={plan.features.maintenance} />
          <FeatureRow icon="crisis_alert"    label="SMS — Seguridad operacional" value={plan.features.sms} />
          <FeatureRow icon="gavel"           label="Autorizaciones Aerocivil"   value={plan.features.authorizations} />
          <FeatureRow icon="fact_check"      label="Auditoría de compliance"    value={plan.features.audit} />
          <FeatureRow icon="checklist"       label="Checklists personalizados"  value={plan.features.checklist} />
          <FeatureRow icon="domain"          label="White-label / marca propia" value={plan.features.whiteLabel} />
        </div>
      </section>

      {/* ── Upgrade section ──────────────────────────────────────────────── */}
      {nextPlans.length > 0 && (
        <section aria-label="Opciones de actualización">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Actualizar plan</h4>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1" role="group" aria-label="Ciclo de facturación">
              {['monthly', 'annual'].map(b => (
                <button key={b}
                        onClick={() => setBilling(b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all
                          ${billing === b ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        aria-pressed={billing === b}>
                  {b === 'monthly' ? 'Mensual' : 'Anual'}
                  {b === 'annual' && <span className="ml-1 text-emerald-600">−17%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid gap-4 ${nextPlans.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {nextPlans.map(pk => {
              const np     = PLANS[pk];
              const nc     = COLOR[np.color];
              const isEnt  = pk === 'enterprise';
              const prices = { escuadrilla: { monthly: '$59.000/mes', annual: '$49.000/mes' },
                               flota:       { monthly: '$159.000/mes', annual: '$132.000/mes' } };
              const priceLabel = isEnt ? 'A consultar' : (prices[pk]?.[billing] || np.price);

              return (
                <div key={pk}
                     className={`bg-white border-2 rounded-2xl p-6 flex flex-col gap-4 ring-1 ${nc.ring} hover:shadow-lg transition-shadow`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${nc.text}`}>
                        {isEnt ? 'Para grandes flotas' : pk === 'flota' ? 'Más popular' : 'Ideal para equipos'}
                      </span>
                      <h5 className="text-2xl font-black uppercase tracking-tighter mt-0.5">{np.label}</h5>
                    </div>
                    <span className="text-lg font-black text-slate-800">{priceLabel}</span>
                  </div>

                  {/* Key upgrades vs current plan */}
                  <ul className="space-y-1.5" aria-label={`Beneficios del plan ${np.label}`}>
                    {[
                      typeof np.drones === 'number' && np.drones > (PLANS[planKey]?.drones || 0)
                        ? `Hasta ${np.drones} aeronaves` : null,
                      typeof np.pilots === 'number' && np.pilots > (PLANS[planKey]?.pilots || 0)
                        ? `Hasta ${np.pilots} pilotos` : null,
                      np.features.sms && !plan.features.sms     ? 'SMS de Seguridad Operacional'       : null,
                      np.features.audit && !plan.features.audit  ? 'Auditoría de compliance'             : null,
                      np.features.checklist && !plan.features.checklist ? 'Checklists personalizados'   : null,
                      np.features.whiteLabel                     ? 'White-label + marca propia'          : null,
                      isEnt                                      ? 'Flotas ilimitadas + soporte dedicado' : null,
                    ].filter(Boolean).slice(0, 4).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="material-symbols-outlined text-sm text-emerald-500" aria-hidden="true">check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(pk)}
                    disabled={upgrading === pk}
                    aria-label={`Actualizar a plan ${np.label}`}
                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all
                      ${nc.btn} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                    {upgrading === pk ? (
                      <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Redirigiendo...</>
                    ) : isEnt ? (
                      <><span className="material-symbols-outlined text-sm">mail</span>Contactar ventas</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">upgrade</span>Actualizar a {np.label}</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Unirse a organización (solo plan piloto) ──────────────────────── */}
      {planKey === 'piloto' && !joinDone && (
        <section aria-label="Unirme a una organización"
                 className="border border-slate-200 rounded-2xl p-6 bg-slate-50/60 space-y-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-600 text-xl" aria-hidden="true">corporate_fare</span>
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Unirme a una organización</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Si perteneces a una empresa que ya usa BitaFly, ingresa su NIT para transferir
                toda tu bitácora y flota a esa organización.
              </p>
            </div>
          </div>

          {/* Buscador de NIT */}
          <form onSubmit={handleSearchOrg} className="flex gap-2">
            <input
              type="text"
              value={joinNit}
              onChange={e => { setJoinNit(e.target.value); setJoinOrg(null); setJoinOrgError(''); }}
              placeholder="NIT de la organización (ej. 900123456)"
              className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors"
              disabled={joinSearching}
              aria-label="NIT de la organización destino"
            />
            <button
              type="submit"
              disabled={joinSearching || !joinNit.trim()}
              className="px-5 py-3 bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {joinSearching
                ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-sm">search</span>}
              {joinSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {/* Error de búsqueda */}
          {joinOrgError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3" role="alert">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              {joinOrgError}
            </div>
          )}

          {/* Org encontrada → selección de rol */}
          {joinOrg && (
            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                <div>
                  <p className="text-sm font-black text-slate-800">{joinOrg.orgName}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Plan {joinOrg.plan} · NIT {joinNit.trim()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">¿Con qué rol te unirás?</p>
                <div className="grid gap-2">
                  {JOIN_ROLES.map(r => (
                    <label key={r.value}
                           className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                             joinRole === r.value
                               ? 'border-orange-400 bg-orange-50'
                               : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                           }`}>
                      <input
                        type="radio"
                        name="joinRole"
                        value={r.value}
                        checked={joinRole === r.value}
                        onChange={() => setJoinRole(r.value)}
                        className="accent-orange-500"
                      />
                      <div>
                        <p className="text-sm font-black text-slate-800">{r.label}</p>
                        <p className="text-xs text-slate-500">{r.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setJoinConfirming(true)}
                className="w-full py-3 bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">transit_enterexit</span>
                Unirme a {joinOrg.orgName}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Banner éxito unión ────────────────────────────────────────────── */}
      {joinDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3 animate-in fade-in duration-500"
             role="status" aria-live="polite">
          <span className="material-symbols-outlined text-emerald-500 text-2xl shrink-0">check_circle</span>
          <div>
            <p className="text-sm font-black text-emerald-800">¡Te uniste exitosamente!</p>
            <p className="text-xs text-emerald-700 mt-0.5">Tu bitácora y flota han sido transferidas. Redirigiendo al dashboard...</p>
          </div>
        </div>
      )}

      {/* ── Danger zone (cancel) ─────────────────────────────────────────── */}
      {isPaid && !cancelDone && (
        <section aria-label="Zona de cancelación"
                 className="border border-red-200 rounded-2xl p-6 bg-red-50/50">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-red-400 text-3xl mt-0.5" aria-hidden="true">warning</span>
            <div className="flex-1">
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Cancelar suscripción</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Al cancelar perderás acceso a todas las funciones de tu plan actual. Tu cuenta pasará al Plan Piloto (1 aeronave, 1 piloto).
              </p>
              <button
                onClick={() => setShowRetention(true)}
                className="mt-4 px-5 py-2 rounded-xl border border-red-300 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                Cancelar suscripción
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Modal confirmación de unirse ─────────────────────────────────── */}
      {joinConfirming && joinOrg && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             role="dialog" aria-modal="true" aria-labelledby="join-title"
             onClick={e => { if (e.target === e.currentTarget && !joining) setJoinConfirming(false); }}>
          <div ref={joinConfirmRef} tabIndex={-1}
               className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 outline-none">

            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-orange-600" aria-hidden="true">corporate_fare</span>
              </div>
              <div>
                <h3 id="join-title" className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  ¿Confirmas la unión?
                </h3>
                <p className="text-xs text-slate-500 mt-1">Esta acción transferirá toda tu data y no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">warning</span>
                Lo que ocurrirá
              </p>
              <ul className="space-y-1.5">
                {[
                  `Tu rol cambiará a: ${JOIN_ROLES.find(r => r.value === joinRole)?.label}`,
                  `Tu flota y baterías pasarán a ${joinOrg.orgName}`,
                  'Tu bitácora completa de vuelos se transferirá',
                  'Tu planeaciones de vuelo se transferirán',
                  'Tu cuenta de piloto independiente quedará inactiva',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                    <span className="material-symbols-outlined text-xs mt-0.5 shrink-0">arrow_right</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {joinError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">{joinError}</p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleJoinOrg}
                disabled={joining}
                className="w-full py-3.5 rounded-xl bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {joining
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Transfiriendo...</>
                  : <><span className="material-symbols-outlined text-sm">transit_enterexit</span>Confirmar unión</>}
              </button>
              <button
                onClick={() => { setJoinConfirming(false); setJoinError(''); }}
                disabled={joining}
                className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Retention modal ──────────────────────────────────────────────── */}
      {showRetention && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             role="dialog" aria-modal="true" aria-labelledby="retention-title"
             onClick={e => { if (e.target === e.currentTarget) setShowRetention(false); }}>
          <div ref={retentionRef} tabIndex={-1}
               className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 outline-none">

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-500" aria-hidden="true">sentiment_dissatisfied</span>
              </div>
              <div>
                <h3 id="retention-title" className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  ¿Seguro que quieres cancelar?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Perderás estas funciones inmediatamente:
                </p>
              </div>
            </div>

            {/* Loss list */}
            <ul className="space-y-3" aria-label="Funciones que perderás al cancelar">
              {[
                { icon: 'flight',       text: `Reducción a 1 aeronave (ahora tienes hasta ${plan.drones})` },
                { icon: 'person',       text: `Reducción a 1 piloto (ahora tienes hasta ${plan.pilots})` },
                plan.features.sms        && { icon: 'crisis_alert', text: 'SMS — Reportes de Seguridad Operacional' },
                plan.features.authorizations && { icon: 'gavel',   text: 'Autorizaciones de vuelo Aerocivil' },
                plan.features.audit      && { icon: 'fact_check',  text: 'Auditoría de compliance operacional' },
                { icon: 'replay',       text: `Replay de vuelo reducido a 10 vuelos (30 días)` },
              ].filter(Boolean).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="size-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm text-red-400" aria-hidden="true">{item.icon}</span>
                  </div>
                  <span className="text-sm text-slate-700">{item.text}</span>
                </li>
              ))}
            </ul>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">{cancelError}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <a href="mailto:hola@bitafly.com?subject=Quiero%20seguir%20en%20BitaFly"
                 className="w-full py-3.5 rounded-xl bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest text-center hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">support_agent</span>
                Hablar con soporte
              </a>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 rounded-xl border border-red-300 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {cancelling
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Cancelando...</>
                  : 'Confirmar cancelación'}
              </button>
              <button
                onClick={() => { setShowRetention(false); setCancelError(''); }}
                className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
