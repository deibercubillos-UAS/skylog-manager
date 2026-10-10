'use client';

// Skylog V2.0 — Suscripción: panel informativo + gestión manual del plan,
// a pedido explícito del usuario ("toca diseñar la sección de
// suscripciones"), confirmado con el usuario (AskUserQuestion) — SIN
// checkout ni ePayco (50-hoja-de-ruta.md: "No tocar el flujo de pagos
// ePayco. Es lo más sensible de producción"). El plan se asigna a mano
// desde aquí, sin ningún cobro real detrás todavía.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import PaymentHistory from './_PaymentHistory';
import { PLANS, PLAN_LABELS, PLAN_LIMITS, PLAN_PRICING } from '@/lib/v2/planLimits';

// Carga el script del Widget de Wompi una sola vez (idempotente si ya está en
// el DOM) — mismo patrón portado de v1 (`dashboard/subscription/page.js`,
// commit b6dab97b): el overlay de pago se abre en la misma página, la
// tarjeta nunca pasa por nuestro servidor.
function loadWompiWidgetScript() {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) { resolve(); return; }
    const existing = document.getElementById('wompi-widget-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'wompi-widget-script';
    script.src = 'https://checkout.wompi.co/widget.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el widget de pago'));
    document.body.appendChild(script);
  });
}

function formatCOP(amount) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

const PLAN_ICON = { piloto: 'flight', escuadrilla: 'groups', flota: 'apartment', enterprise: 'workspace_premium' };
const PLAN_TILE = {
  piloto: 'bg-blue-500 text-white',
  escuadrilla: 'bg-violet-500 text-white',
  flota: 'bg-primary text-white',
  enterprise: 'bg-navy text-white',
};

function limitLabel(limit) {
  return limit == null ? '∞' : limit;
}

function usageColor(usage) {
  if (usage.limit == null) return 'emerald';
  if (usage.count >= usage.limit) return 'red';
  if (usage.count / usage.limit >= 0.8) return 'amber';
  return 'emerald';
}

function expiryStatus(expiresAt) {
  if (!expiresAt) return { label: 'Sin vencimiento', badge: 'bg-navy-50 text-navy-400' };
  const days = Math.ceil((new Date(`${expiresAt}T00:00:00`) - new Date()) / 86_400_000);
  if (days < 0) return { label: 'Vencido', badge: 'bg-red-50 text-red-700' };
  if (days <= 15) return { label: `Vence en ${days} día(s)`, badge: 'bg-amber-50 text-amber-700' };
  return { label: 'Vigente', badge: 'bg-emerald-50 text-emerald-700' };
}

export default function SuscripcionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({ plan: 'piloto', expiresAt: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [payPlan, setPayPlan] = useState('piloto');
  const [payBilling, setPayBilling] = useState('monthly');
  const [partnerCode, setPartnerCode] = useState('');
  const [notice, setNotice] = useState(null); // aviso de suscripción (p. ej. «activa tu pago» si viene de ePayco)
  // Llegar desde el aviso del panel: el plan y el ciclo que ya tenía vienen preseleccionados.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (PLANS.includes(q.get('plan')) && q.get('plan') !== 'enterprise') setPayPlan(q.get('plan'));
    if (['monthly', 'annual'].includes(q.get('billing'))) setPayBilling(q.get('billing'));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    fetch(`/api/suscripcion/aviso?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotice(d && d.notice?.level !== 'none' ? d.notice : null))
      .catch(() => {});
  }, [organizationId, subscription?.payment_provider]);

  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);

  const cancelAutoRenew = async () => {
    setCancelBusy(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/suscripcion/cancelar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cancelar');
      setCancelConfirm(false);
      await load(organizationId);
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelBusy(false);
    }
  };

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/suscripcion?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) {
      setSubscription(data.subscription);
      setUsage(data.usage);
      setIsAdmin(data.isAdmin);
      setForm({ plan: data.subscription?.plan || 'piloto', expiresAt: data.subscription?.expires_at || '', notes: data.subscription?.notes || '' });
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/suscripcion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, plan: form.plan, expiresAt: form.expiresAt || null, notes: form.notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el plan');
      await load(organizationId);
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayWithWompi() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/suscripcion/wompi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, plan: payPlan, billing: payBilling, partnerCode: partnerCode.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.widget) throw new Error(json.error || 'No se pudo iniciar el pago');

      await loadWompiWidgetScript();
      const checkout = new window.WidgetCheckout(json.widget);
      checkout.open(async (result) => {
        const tx = result?.transaction;
        if (!tx?.id) { setPaying(false); return; }
        try {
          const verifyRes = await fetch('/api/suscripcion/wompi/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: tx.id }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.status === 'completed') {
            await load(organizationId);
          } else {
            setPayError(verifyJson.message || 'El pago no se confirmó todavía.');
          }
        } catch (e) {
          setPayError(e.message);
        } finally {
          setPaying(false);
        }
      });
    } catch (e) {
      setPayError(e.message);
      setPaying(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Cuenta" title="Suscripción" description="Plan de la organización y uso frente a sus límites." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const status = expiryStatus(subscription?.expires_at);
  const plan = subscription?.plan || 'piloto';

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Cuenta"
        title="Suscripción"
        description={`Plan de ${currentOrg?.name || 'la organización'} y uso frente a sus límites.`}
        metric={{ value: PLAN_LABELS[plan], label: 'Plan actual' }}
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {notice && (
        <div className={`rounded-xl px-4 py-3 border ${notice.level === 'expired' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
          <p className="text-sm font-bold">{notice.title}</p>
          <p className="text-xs mt-1">{notice.message}</p>
        </div>
      )}

      {subscription?.payment_provider !== 'wompi' && !notice && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-500 text-lg shrink-0">info</span>
          <p className="text-xs text-amber-700">
            Este plan se asignó manualmente desde el panel — no tiene un pago real detrás todavía. Para activar cobro automático, paga con tarjeta abajo.
          </p>
        </div>
      )}

      {isAdmin && plan !== 'enterprise' && (
        <div className="bg-white rounded-2xl border border-navy-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">credit_card</span>
            <p className="text-sm font-bold text-navy">Pagar con tarjeta (Wompi)</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-navy-400 mb-1">Plan</span>
              <select value={payPlan} onChange={(e) => setPayPlan(e.target.value)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm">
                {PLANS.filter((p) => p !== 'enterprise').map((p) => (
                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-navy-400 mb-1">Ciclo</span>
              <select value={payBilling} onChange={(e) => setPayBilling(e.target.value)} className="px-3 py-2 rounded-lg border border-navy-200 text-sm">
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-navy-400 mb-1">Código de socio (opcional)</span>
              <input value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} placeholder="ABC-1234" autoCapitalize="characters" className="w-36 min-h-[44px] md:min-h-0 px-3 py-2 rounded-lg border border-navy-200 text-base md:text-sm uppercase" />
            </label>
            <p className="text-lg font-bold text-navy pb-2">
              {PLAN_PRICING[payPlan]?.[payBilling] ? formatCOP(PLAN_PRICING[payPlan][payBilling].amount) : '—'}
            </p>
            <Button type="button" onClick={handlePayWithWompi} disabled={paying}>
              {paying ? 'Abriendo pago…' : 'Pagar ahora'}
            </Button>
          </div>
          {payError && <p className="text-sm text-red-600">{payError}</p>}
        </div>
      )}

      {usage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon="flight" color={usageColor(usage.aircraft)} label="Aeronaves" value={`${usage.aircraft.count} / ${limitLabel(usage.aircraft.limit)}`} />
          <StatCard icon="groups" color={usageColor(usage.pilots)} label="Pilotos" value={`${usage.pilots.count} / ${limitLabel(usage.pilots.limit)}`} />
          <StatCard icon="battery_full" color={usageColor(usage.batteries)} label="Baterías" value={`${usage.batteries.count} / ${limitLabel(usage.batteries.limit)}`} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-navy-50">
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${PLAN_TILE[plan]}`}>
              <span className="material-symbols-outlined text-xl">{PLAN_ICON[plan]}</span>
            </span>
            <div>
              <p className="text-sm font-bold text-navy">Plan {PLAN_LABELS[plan]}</p>
              <p className="text-xs text-navy-400">
                {subscription?.expires_at
                  ? `${subscription.payment_provider === 'wompi' && subscription.wompi_payment_source_id ? 'Renueva' : 'Vence'} el ${new Date(`${subscription.expires_at}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`
                  : 'Sin fecha de vencimiento'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.badge}`}>{status.label}</span>
        </div>

        {isAdmin && subscription?.payment_provider === 'wompi' && (subscription?.wompi_payment_source_id || subscription?.canceled_at) && (
          <div className="px-5 py-4 border-b border-navy-50">
            {subscription.wompi_payment_source_id ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-navy">Renovación automática activa</p>
                  <p className="text-xs text-navy-400">Se cobra la tarjeta guardada al vencer cada ciclo.</p>
                </div>
                {!cancelConfirm && (
                  <button type="button" onClick={() => setCancelConfirm(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    Cancelar renovación
                  </button>
                )}
                {cancelConfirm && (
                  <div className="w-full rounded-xl border border-red-200 bg-red-50/60 p-3 space-y-2">
                    <p className="text-sm text-navy">
                      Dejaremos de cobrar tu tarjeta y borraremos su referencia. <b>Tu plan sigue activo hasta {subscription.expires_at ? new Date(`${subscription.expires_at}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'su vencimiento'}</b>; después no se renueva. Puedes volver a pagar cuando quieras.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelAutoRenew} disabled={cancelBusy} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50">
                        {cancelBusy ? 'Cancelando…' : 'Sí, cancelar la renovación'}
                      </button>
                      <button type="button" onClick={() => setCancelConfirm(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy-200 text-navy">Volver</button>
                    </div>
                    {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-navy">Renovación automática cancelada</p>
                <p className="text-xs text-navy-400">
                  No se volverá a cobrar. Tu plan sigue activo hasta {subscription.expires_at ? new Date(`${subscription.expires_at}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'su vencimiento'}. Para reactivarla, paga de nuevo con tarjeta más abajo.
                </p>
              </div>
            )}
          </div>
        )}

        {isAdmin ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-navy-400 mb-2">Elegir plan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, plan: p }))}
                    className={`text-left rounded-xl border p-3 transition-colors ${form.plan === p ? 'border-primary bg-primary/5' : 'border-navy-100 hover:border-navy-200'}`}
                  >
                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${PLAN_TILE[p]}`}>
                      <span className="material-symbols-outlined text-base">{PLAN_ICON[p]}</span>
                    </span>
                    <p className="text-sm font-semibold text-navy">{PLAN_LABELS[p]}</p>
                    <p className="text-[11px] text-navy-400 mt-0.5">
                      {limitLabel(PLAN_LIMITS[p].aircraft)} aeronave(s) · {limitLabel(PLAN_LIMITS[p].pilots)} piloto(s) · {limitLabel(PLAN_LIMITS[p].batteries)} batería(s)
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <label className="block mb-3">
                <span className="block text-xs font-medium text-navy-400 mb-1">Fecha de vencimiento (opcional)</span>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </label>
              <label className="block mb-3">
                <span className="block text-xs font-medium text-navy-400 mb-1">Notas internas (opcional)</span>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ej. Pagado por transferencia el 15/09"
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </label>
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saved && !saveError && <p className="text-sm text-emerald-600">Plan actualizado.</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar plan'}
            </Button>
          </form>
        ) : (
          <div className="p-5">
            <p className="text-sm text-navy-400">Solo el Gerente General puede cambiar el plan de la organización.</p>
          </div>
        )}
      </div>

      {isAdmin && <PaymentHistory organizationId={organizationId} />}
    </div>
  );
}
