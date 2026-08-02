'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getOrgContext } from '@/lib/apiAuth';

// Plan/vigencia/ePayco de la cuenta para su organización activa — vía
// organization_members (fuente real), no profiles directo. `orgId` ya
// resuelto (getOrgContext) para no repetir esa resolución en cada poll.
async function fetchSubscriptionState(userId, orgId) {
  if (!orgId) return null;
  const { data } = await supabase
    .from('organization_members')
    .select('subscription_plan, subscription_expires_at, epayco_subscription_id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();
  return data;
}

const FEATURE_LABELS = {
  maintenance:    { icon: 'build',        label: 'Mantenimiento' },
  sms:            { icon: 'crisis_alert', label: 'SMS — Seguridad operacional' },
  authorizations: { icon: 'gavel',        label: 'Autorizaciones Aerocivil' },
  audit:          { icon: 'fact_check',   label: 'Auditoría de compliance' },
  checklist:      { icon: 'checklist',    label: 'Checklists personalizados' },
  whiteLabel:     { icon: 'domain',       label: 'White-label / marca propia' },
};

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
    price:    '$238.000/mes',
    drones:   3,
    pilots:   5,
    batteries:'Ilimitadas',
    replay:   '50 vuelos · 90 días',
    roles:    '4 roles',
    features: { maintenance: 'advanced', sms: 'full', authorizations: true, audit: true, checklist: true, whiteLabel: false },
  },
  flota: {
    label:    'Flota',
    color:    'blue',
    price:    '$476.000/mes',
    drones:   10,
    pilots:   10,
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
  const [usage, setUsage]               = useState(null);
  const [addons, setAddons]             = useState(null);
  const [billing, setBilling]           = useState('monthly');
  const [partnerCode, setPartnerCode]   = useState('');   // código de escuela/asesor (opcional)
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

  // ── Estado "Verificar pago pendiente" ────────────────────────────────────
  const [pendingRef,     setPendingRef]     = useState('');
  const [verifying,      setVerifying]      = useState(false);
  const [verifyResult,   setVerifyResult]   = useState(null);   // { activated, planName, reason }
  const [showVerify,     setShowVerify]     = useState(false);

  // ── Refs para el polling del pago (no provocan re-render) ──────────────────
  const pollRef         = useRef(null);  // interval de polling del perfil
  const winWatchRef     = useRef(null);  // interval que vigila el cierre del popup
  const payWindowRef    = useRef(null);  // referencia a la pestaña de ePayco
  const orgIdRef        = useRef(null);  // organización activa (resuelta una vez en load())
  const baselinePlanRef = useRef(null);  // plan antes de iniciar el pago
  const pollDeadlineRef = useRef(null);  // timestamp límite del polling

  useEffect(() => {
    async function load() {
      const ctx = await getOrgContext(supabase);
      if (ctx.user) {
        orgIdRef.current = ctx.orgId;
        const data = await fetchSubscriptionState(ctx.user.id, ctx.orgId);
        setProfile(data ? { ...data, email: ctx.user.email } : null);
      }
      setLoading(false);

      // Medidores de uso (aeronaves/pilotos/vuelos del mes) — no bloquea el render principal
      fetch('/api/subscription').then(r => r.json()).then(d => { if (d.usage) setUsage(d.usage); if (d.addons) setAddons(d.addons); }).catch(() => {});

      // Detectar referencia guardada desde la página de retorno de ePayco
      try {
        const storedRef = sessionStorage.getItem('epayco_pending_ref');
        if (storedRef) {
          setPendingRef(storedRef);
          setShowVerify(true);
        }
      } catch {}
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

  // Refresca los medidores de uso (límites cambian al subir/bajar de plan)
  function refreshUsage() {
    fetch('/api/subscription').then(r => r.json()).then(d => { if (d.usage) setUsage(d.usage); }).catch(() => {});
  }

  // Marca un upgrade como exitoso y limpia el estado de polling
  function markActivated({ newPlan, newPlanName, expiresAt }) {
    setProfile(p => ({
      ...p,
      subscription_plan:       newPlan,
      subscription_expires_at: expiresAt || p?.subscription_expires_at || null,
    }));
    setVerifyResult({ activated: true, planName: newPlanName || PLANS[newPlan]?.label || newPlan });
    setUpgrading(null);
    refreshUsage();
    stopPolling();
    try { sessionStorage.removeItem('epayco_pending_ref'); } catch {}
  }

  function stopPolling() {
    if (pollRef.current)     { clearInterval(pollRef.current);   pollRef.current = null; }
    if (winWatchRef.current) { clearInterval(winWatchRef.current); winWatchRef.current = null; }
    payWindowRef.current   = null;
    baselinePlanRef.current = null;
    pollDeadlineRef.current = null;
  }

  // Consulta el perfil; si el plan ya es pago (distinto del baseline) → activado
  async function pollProfileOnce() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const data = await fetchSubscriptionState(user.id, orgIdRef.current);
      if (!data) return false;
      const base = baselinePlanRef.current;
      const isPaidNow = data.subscription_plan && data.subscription_plan !== 'piloto';
      if (isPaidNow && data.subscription_plan !== base) {
        markActivated({
          newPlan:   data.subscription_plan,
          expiresAt: data.subscription_expires_at,
        });
        return true;
      }
    } catch { /* reintentar en el próximo tick */ }
    return false;
  }

  // ── Escuchar mensaje de activación desde la pestaña de ePayco ───────────
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'BITAFLY_PLAN_ACTIVATED') return;
      const { planKey: newPlan, planName: newPlanName, expiresAt } = e.data;
      markActivated({ newPlan, newPlanName, expiresAt });
    }
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); stopPolling(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upgrade handler ────────────────────────────────────────────────────────
  async function handleUpgrade(targetPlan) {
    setUpgrading(targetPlan);
    setVerifyResult(null);
    try {
      if (targetPlan === 'enterprise') {
        window.open('mailto:hola@bitafly.com?subject=Plan%20Enterprise', '_blank');
        setUpgrading(null);
        return;
      }
      const res = await fetch('/api/epayco/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: targetPlan, billing, partnerCode }),
      });
      const json = await res.json();
      if (!json.url) throw new Error(json.error || 'No se pudo iniciar el pago');

      // Abrir ePayco en nueva pestaña (sin noopener: necesitamos la referencia
      // para detectar el cierre y recibir el postMessage de retorno).
      const win = window.open(json.url, '_blank');
      payWindowRef.current    = win;
      baselinePlanRef.current = planKey; // plan antes del pago
      pollDeadlineRef.current = Date.now() + 1000 * 60 * 10; // hasta 10 min

      // Polling del perfil: el webhook de ePayco activa el plan server-side,
      // así detectamos el cambio aunque ePayco no redirija a nuestra página.
      stopPolling();
      pollRef.current = setInterval(() => {
        if (Date.now() > pollDeadlineRef.current) {
          stopPolling();
          setUpgrading(null);
          setShowVerify(true); // ofrecer verificación manual como último recurso
          return;
        }
        pollProfileOnce();
      }, 4000);

      // Vigilar el cierre de la ventana de pago: al cerrarse, hacemos un
      // barrido extra de verificación durante ~40s antes de rendirnos.
      if (win) {
        winWatchRef.current = setInterval(async () => {
          if (win.closed) {
            clearInterval(winWatchRef.current);
            winWatchRef.current = null;
            // Extender el polling unos segundos por si el webhook tarda
            const grace = Date.now() + 40000;
            if (pollDeadlineRef.current > grace) pollDeadlineRef.current = grace;
            const ok = await pollProfileOnce();
            if (!ok) setShowVerify(true);
          }
        }, 1500);
      }
    } catch (e) {
      alert('Error al iniciar pago: ' + e.message);
      setUpgrading(null);
      stopPolling();
    }
  }

  // ── Verificar pago pendiente ───────────────────────────────────────────────
  async function handleVerifyPending() {
    const ref = pendingRef.trim();
    if (!ref) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no disponible — vuelve a iniciar sesión');
      const res  = await fetch('/api/epayco/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ ref_payco: ref }),
      });
      const json = await res.json();
      setVerifyResult(json);
      if (json.activated) {
        try { sessionStorage.removeItem('epayco_pending_ref'); } catch {}
        // Refrescar perfil para mostrar el nuevo plan
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const data = await fetchSubscriptionState(user.id, orgIdRef.current);
          setProfile(data ? { ...data, email: user.email } : null);
        }
      }
    } catch (e) {
      setVerifyResult({ activated: false, reason: e.message });
    } finally {
      setVerifying(false);
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
      refreshUsage();
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

  const nextPlan = nextPlans[0] ? PLANS[nextPlans[0]] : null;
  const includedFeatures = Object.entries(plan.features)
    .filter(([, v]) => v === true || v === 'basic' || v === 'advanced' || v === 'full')
    .map(([k]) => FEATURE_LABELS[k]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-28 animate-in fade-in duration-500">

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

      {/* HERO — plan actual, vigencia, cancelar/mejorar */}
      <div className="bg-[#1A202C] rounded-[2rem] px-6 py-6 md:px-9 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Plan actual</p>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{plan.label}</h2>
            {isPaid && <span className="text-[13px] font-bold text-slate-400">{plan.price}</span>}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {expiresAt && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span className="material-symbols-outlined text-sm text-emerald-400">event_available</span>
                {profile?.epayco_subscription_id ? `Renueva el ${expiresAt}` : `Vence el ${expiresAt}`}
              </span>
            )}
            {!isPaid && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span className="material-symbols-outlined text-sm">info</span>
                Plan gratuito — actualiza para desbloquear funciones
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {isPaid && !cancelDone && (
            <button type="button" onClick={() => setShowRetention(true)}
              className="text-[11px] font-black text-slate-400 hover:text-red-400 uppercase tracking-wide transition-colors">
              Cancelar plan
            </button>
          )}
          {nextPlan && (
            <button
              type="button"
              onClick={() => handleUpgrade(nextPlans[0])}
              disabled={!!upgrading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
              {upgrading === nextPlans[0] ? (
                <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Esperando pago...</>
              ) : (
                <><span className="material-symbols-outlined text-base">rocket_launch</span>Mejorar a {nextPlan.label}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* USAGE METERS */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'drones', label: 'Aeronaves', icon: 'precision_manufacturing', ...usage.drones },
            { key: 'pilots', label: 'Pilotos',   icon: 'group',                  ...usage.pilots },
            { key: 'flightsMonth', label: 'Vuelos este mes', icon: 'flight_takeoff', ...usage.flightsMonth },
          ].map(u => {
            const unlimited = u.limit === null || u.limit === Infinity;
            const pct = unlimited ? null : Math.min(100, u.limit > 0 ? Math.round((u.current / u.limit) * 100) : 100);
            return (
              <div key={u.key} className="bg-white border border-slate-200 rounded-2xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{u.label}</span>
                  <span className="material-symbols-outlined text-base text-slate-400">{u.icon}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">{u.current}</span>
                  <span className="text-xs font-bold text-slate-400">/ {unlimited ? 'Ilimitado' : u.limit}</span>
                </div>
                {!unlimited && (
                  <div className="h-1.5 rounded-full bg-slate-100 mt-2.5 overflow-hidden">
                    <div className="h-full rounded-full bg-orange-600" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RECURSOS ADICIONALES — piloto/dron extra, sin importar el plan.
          Sin checkout self-service todavía (ver CLAUDE.md) — el CTA escribe a
          soporte; mientras tanto Master puede registrar la venta manualmente. */}
      {addons && (
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Recursos adicionales</p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {addons.pilot > 0 || addons.drone > 0
                ? `Tienes ${addons.pilot} piloto(s) y ${addons.drone} dron(es) adicional(es) activos.`
                : 'Puedes agregar pilotos o drones adicionales sin importar tu plan.'}
              {' '}Piloto adicional ${addons.pricing.pilot.monthly.toLocaleString('es-CO')}/mes · Dron adicional ${addons.pricing.drone.monthly.toLocaleString('es-CO')}/mes.
            </p>
          </div>
          <a href="mailto:soporte@bitafly.com?subject=Quiero%20agregar%20recursos%20adicionales"
            className="shrink-0 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wide text-center transition-all">
            Solicitar
          </a>
        </div>
      )}

      {/* INCLUIDO EN TU PLAN + GESTIÓN DE PAGO / HISTORIAL DE FACTURACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Incluido en {plan.label}</p>
            {includedFeatures.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">Este plan no incluye módulos adicionales — actualiza para desbloquearlos.</p>
            ) : includedFeatures.map(f => (
              <div key={f.label} className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                <span className="text-[13px] font-semibold text-slate-600">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-3">Gestión de pago</p>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {isPaid
                ? 'ePayco procesa el cobro recurrente de tu suscripción de forma segura. Para actualizar tu tarjeta o resolver un problema con un cobro, contáctanos.'
                : 'Aún no tienes un método de pago activo — se configura al actualizar a un plan pago.'}
            </p>
            <a href="mailto:hola@bitafly.com?subject=Método%20de%20pago%20BitaFly"
              className="inline-flex items-center gap-1.5 text-[11px] font-black text-orange-600 hover:text-orange-800">
              <span className="material-symbols-outlined text-sm">mail</span>
              Contactar soporte
            </a>
          </div>
        </div>

        <BillingHistory />
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-8">
      {/* ── Upgrade section ──────────────────────────────────────────────── */}
      {nextPlans.length > 0 && (
        <section aria-label="Opciones de actualización">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Actualizar plan</h4>
            <div className="flex items-center gap-3">
            {upgrading && (
              <button
                onClick={() => { stopPolling(); setUpgrading(null); }}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">close</span>
                Cancelar espera
              </button>
            )}
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
          </div>

          {/* Aviso mientras se espera la confirmación del pago */}
          {upgrading && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
                 role="status" aria-live="polite">
              <span className="material-symbols-outlined text-orange-500 animate-spin mt-0.5">progress_activity</span>
              <div>
                <p className="text-sm font-black text-orange-800">Esperando confirmación del pago…</p>
                <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
                  Completa el pago en la pestaña de ePayco. Tu plan se activará aquí automáticamente
                  en cuanto el pago sea aprobado — no cierres esta página.
                </p>
              </div>
            </div>
          )}

          {/* Código de escuela / asesor (opcional) */}
          <div className="mb-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código de escuela / asesor (opcional)</label>
            <input value={partnerCode} onChange={e => setPartnerCode(e.target.value.toUpperCase())}
              placeholder="Ej: EAC-XB12"
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-sm font-mono font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <div className={`grid gap-4 ${nextPlans.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {nextPlans.map(pk => {
              const np     = PLANS[pk];
              const nc     = COLOR[np.color];
              const isEnt  = pk === 'enterprise';
              const prices = { escuadrilla: { monthly: '$238.000/mes', annual: '$214.200/mes' },
                               flota:       { monthly: '$476.000/mes', annual: '$428.400/mes' } };
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
                    disabled={!!upgrading}
                    aria-label={`Actualizar a plan ${np.label}`}
                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all
                      ${nc.btn} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                    {upgrading === pk ? (
                      <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Esperando pago...</>
                    ) : isEnt ? (
                      <><span className="material-symbols-outlined text-sm">mail</span>Contactar ventas</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">open_in_new</span>Actualizar a {np.label}</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Verificar pago pendiente ─────────────────────────────────────── */}
      {(showVerify || !isPaid) && !verifyResult?.activated && (
        <section aria-label="Verificar pago pendiente"
                 className={`border rounded-2xl p-6 space-y-4 ${showVerify ? 'border-orange-300 bg-orange-50/60' : 'border-slate-200 bg-slate-50/40'}`}>
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-600 text-xl" aria-hidden="true">receipt_long</span>
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                {showVerify ? '¡Pago detectado! Activar plan' : '¿Ya pagaste? Verificar pago'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {showVerify
                  ? 'Encontramos una referencia de pago reciente. Haz clic para activar tu plan ahora.'
                  : 'Si realizaste un pago y tu plan no se actualizó, ingresa la referencia de la transacción (visible en el correo de confirmación de ePayco).'}
              </p>
            </div>
            {!showVerify && (
              <button onClick={() => setShowVerify(true)}
                      className="text-xs font-black text-orange-600 hover:text-orange-700 underline shrink-0">
                Verificar
              </button>
            )}
          </div>

          {showVerify && (
            <div className="flex gap-2">
              <input
                type="text"
                value={pendingRef}
                onChange={e => { setPendingRef(e.target.value); setVerifyResult(null); }}
                placeholder="Referencia ePayco (ej. bitafly_escuadrilla_monthly_...)"
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-orange-400 focus:outline-none transition-colors font-mono"
                disabled={verifying}
                aria-label="Referencia de transacción ePayco"
              />
              <button
                onClick={handleVerifyPending}
                disabled={verifying || !pendingRef.trim()}
                className="px-5 py-3 bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {verifying
                  ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-sm">verified</span>}
                {verifying ? 'Verificando...' : 'Activar'}
              </button>
            </div>
          )}

          {verifyResult && !verifyResult.activated && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3" role="alert">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>
                {verifyResult.reason === 'no_encontrada'   && 'Referencia no encontrada en ePayco. Verifica que sea la correcta.'}
                {verifyResult.reason === 'no_aprobada'     && `Pago no aprobado (estado: ${verifyResult.state || 'desconocido'}).`}
                {verifyResult.reason === 'no_coincide_usuario' && 'El pago no coincide con tu cuenta. Contacta soporte.'}
                {verifyResult.reason === 'plan_no_resuelto' && 'No se pudo determinar el plan. Contacta soporte con tu referencia.'}
                {verifyResult.reason === 'sin_referencia'  && 'Ingresa la referencia del pago.'}
                {!['no_encontrada','no_aprobada','no_coincide_usuario','plan_no_resuelto','sin_referencia'].includes(verifyResult.reason)
                  && (verifyResult.reason || 'Error inesperado. Contacta soporte en hola@bitafly.com.')}
              </span>
            </div>
          )}
        </section>
      )}

      {verifyResult?.activated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3 animate-in fade-in duration-500"
             role="status" aria-live="polite">
          <span className="material-symbols-outlined text-emerald-500 text-2xl shrink-0">check_circle</span>
          <div>
            <p className="text-sm font-black text-emerald-800">
              ¡Plan {verifyResult.planName || ''} activado correctamente!
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">Tu suscripción está activa. La página se actualizó con tu nuevo plan.</p>
          </div>
        </div>
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

      </div>

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

// ── Historial de facturación (comprobante informativo, Fase 5.d) ─────────────
function BillingHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch('/api/billing-history')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setPending(!!d.pending); })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  // Defensivo: si la tabla llegara a faltar en otro entorno, no mostrar nada.
  if (pending) return null;

  const fmt = (n, cur) => {
    const v = Number(n || 0);
    try { return v.toLocaleString('es-CO', { style: 'currency', currency: cur || 'COP', maximumFractionDigits: 0 }); }
    catch { return `$${v.toLocaleString('es-CO')}`; }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Historial de facturación</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Comprobantes informativos de tus pagos</p>
        </div>
      </div>
      {loading ? (
        <p className="py-10 text-center text-xs font-black text-slate-300 uppercase">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="py-10 px-6 text-center text-xs font-semibold text-slate-400">
          Aún no hay pagos registrados — aparecerán aquí después de tu primer cobro.
        </p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-xs font-black uppercase text-slate-400 tracking-widest">
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Ciclo</th>
              <th className="px-6 py-3">Monto</th>
              <th className="px-6 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {entries.map(e => (
              <tr key={e.id}>
                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{new Date(e.created_at).toLocaleDateString('es-CO')}</td>
                <td className="px-6 py-3 font-bold text-slate-900 capitalize">{e.plan_key || '—'}</td>
                <td className="px-6 py-3 text-slate-500 text-xs uppercase">{e.billing === 'annual' ? 'Anual' : 'Mensual'}</td>
                <td className="px-6 py-3 font-black text-slate-900 tabular-nums">{fmt(e.amount, e.currency)}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-600">
                    <span className="material-symbols-outlined text-sm">check_circle</span>{e.status || 'pagada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
