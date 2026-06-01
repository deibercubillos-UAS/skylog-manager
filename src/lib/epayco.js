// Cliente ePayco para gestión de planes y suscripciones (server-side only)
import { EPAYCO_PLANS } from './planLimits';

const BASE = 'https://api.secure.payco.co';

// Obtiene token de autenticación ePayco (válido ~30 min)
async function getToken() {
  const res = await fetch(
    `${BASE}/v1/auth/login?public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}&private_key=${process.env.EPAYCO_PRIVATE_KEY}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('ePayco auth failed: ' + res.status);
  const { token } = await res.json();
  return token;
}

async function epaycoFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `ePayco error ${res.status}`);
  return json;
}

// Crea un plan de suscripción en ePayco (idempotente — usa id_plan como clave)
export async function syncPlan(planKey, billingKey) {
  const cfg = EPAYCO_PLANS[planKey]?.[billingKey];
  if (!cfg) throw new Error(`Plan no encontrado: ${planKey}/${billingKey}`);

  return epaycoFetch('/recurring/v1/plan', {
    method: 'POST',
    body: JSON.stringify({
      id_plan:        cfg.epaycoId,
      name:           cfg.name,
      description:    cfg.description,
      amount:         String(cfg.amount),
      currency:       'COP',
      interval:       billingKey === 'annual' ? 'year' : 'month',
      interval_count: 1,
      trial_days:     cfg.trialDays ?? 0,
      status:         1,
    }),
  });
}

// Actualiza un plan existente en ePayco
export async function updatePlan(epaycoId, { name, description, amount, trialDays, billingKey }) {
  const taxBase = Math.floor(amount / 1.19);
  return epaycoFetch(`/recurring/v1/plan/${encodeURIComponent(epaycoId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name,
      description,
      amount:         String(amount),
      currency:       'COP',
      interval:       billingKey === 'annual' ? 'year' : 'month',
      interval_count: 1,
      trial_days:     trialDays ?? 0,
      status:         1,
    }),
  });
}

// Cancela una suscripción activa en ePayco
export async function cancelSubscription(epaycoSubscriptionId) {
  return epaycoFetch(`/recurring/v1/subscription/${epaycoSubscriptionId}`, {
    method: 'DELETE',
  });
}
