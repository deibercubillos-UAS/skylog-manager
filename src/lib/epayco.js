// Cliente ePayco para gestión de planes y suscripciones (server-side only)

const BASE = 'https://api.secure.payco.co';

// Obtiene token de autenticación ePayco
async function getToken() {
  const url = `${BASE}/v1/auth/login?public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}&private_key=${process.env.EPAYCO_PRIVATE_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) throw new Error(`ePayco auth HTTP ${res.status}`);

  const json = await res.json();
  // ePayco puede devolver status:false con HTTP 200
  if (json.status === false) throw new Error(`ePayco auth: ${json.message || 'credenciales inválidas'}`);

  const token = json.token || json.bearer_token;
  if (!token) throw new Error('ePayco auth: token no encontrado en respuesta');
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

  // ePayco a veces devuelve HTTP 200 con status:false cuando hay error
  if (!res.ok || json.status === false) {
    throw new Error(json.message || json.description || `ePayco error ${res.status}`);
  }

  return json;
}

// Crea o actualiza un plan en ePayco (POST es upsert por id_plan)
export async function syncPlan(planKey, billingKey, overrides = {}) {
  const { EPAYCO_PLANS } = await import('./planLimits');
  const cfg = EPAYCO_PLANS[planKey]?.[billingKey];
  if (!cfg) throw new Error(`Plan no encontrado: ${planKey}/${billingKey}`);

  const payload = {
    id_plan:        cfg.epaycoId,
    name:           overrides.name        ?? cfg.name,
    description:    overrides.description ?? cfg.description,
    amount:         String(overrides.amount ?? cfg.amount),
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     overrides.trialDays   ?? cfg.trialDays ?? 0,
    status:         1,
  };

  return epaycoFetch('/recurring/v1/plan', { method: 'POST', body: JSON.stringify(payload) });
}

// Actualiza un plan existente en ePayco.
// ePayco NO tiene PUT /plan/{id} — usa POST al mismo endpoint (upsert por id_plan).
export async function updatePlan(epaycoId, { name, description, amount, trialDays, billingKey }) {
  const payload = {
    id_plan:        epaycoId,           // clave del upsert
    name,
    description,
    amount:         String(amount),
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     trialDays ?? 0,
    status:         1,
  };

  return epaycoFetch('/recurring/v1/plan', { method: 'POST', body: JSON.stringify(payload) });
}

// Cancela una suscripción activa en ePayco
export async function cancelSubscription(epaycoSubscriptionId) {
  return epaycoFetch(`/recurring/v1/subscription/${epaycoSubscriptionId}`, { method: 'DELETE' });
}
