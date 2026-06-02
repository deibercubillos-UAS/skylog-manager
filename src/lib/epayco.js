// Cliente ePayco — server-side only
// Autenticación y headers verificados contra github.com/epayco/epayco-node

const BASE    = 'https://api.secure.payco.co';
const PUB_KEY = () => process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
const PRV_KEY = () => process.env.EPAYCO_PRIVATE_KEY;

// ── Auth ─────────────────────────────────────────────────────────────────────
// El SDK usa POST con JSON body, devuelve bearer_token
async function getToken() {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ public_key: PUB_KEY(), private_key: PRV_KEY() }),
    cache:   'no-store',
  });

  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(`ePayco auth: ${json.message || json.error || res.status}`);
  }

  const token = json.bearer_token || json.token;
  if (!token) throw new Error(`ePayco auth: bearer_token ausente. Resp: ${JSON.stringify(json)}`);
  return token;
}

// Headers estándar del SDK (type: sdk-jwt y lang: NODE son requeridos)
async function headers() {
  return {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'type':         'sdk-jwt',
    'lang':         'NODE',
    'Authorization': `Bearer ${await getToken()}`,
  };
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function epaycoGet(path) {
  const res  = await fetch(`${BASE}${path}`, { headers: await headers(), cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || json.error || json.error_description || `ePayco GET ${res.status}`);
  }
  return json;
}

// POST para endpoints de PAGOS — incluye extras_epayco requerido por ePayco
async function epaycoPost(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: await headers(),
    body:    JSON.stringify({ ...body, extras_epayco: { extra5: 'P44' } }),
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || json.error || json.error_description || `ePayco POST ${res.status}`);
  }
  return json;
}

// POST para endpoints de PLANES/SUSCRIPCIONES — sin extras_epayco ni campos de pago
async function epaycoRecurringPost(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: await headers(),
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || json.error || json.error_description || `ePayco POST ${res.status}`);
  }
  return json;
}

// ── Planes ───────────────────────────────────────────────────────────────────

// Lista todos los planes — GET /recurring/v1/plans/{apiKey}
export async function listPlans() {
  const json = await epaycoGet(`/recurring/v1/plans/${PUB_KEY()}`);
  return Array.isArray(json) ? json : (json.data ?? []);
}

// Crea un plan — POST /recurring/v1/plan/create
export async function createPlan(cfg, billingKey) {
  return epaycoRecurringPost('/recurring/v1/plan/create', {
    id_plan:        cfg.epaycoId,
    name:           cfg.name,
    description:    cfg.description,
    amount:         String(cfg.amount),
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     cfg.trialDays ?? 0,
    status:         1,
  });
}

// Actualiza un plan — POST /recurring/v1/plan/edit/{id_plan}
// El endpoint usa id_plan como identificador en la URL (NO el _id de MongoDB)
export async function updatePlan(epaycoId, { name, description, amount, trialDays, billingKey, redirectUrl }) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';
  return epaycoRecurringPost(`/recurring/v1/plan/edit/${epaycoId}`, {
    public_key:     PUB_KEY(),
    id_plan:        epaycoId,
    name,
    description,
    amount:         Number(amount),
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     Number(trialDays ?? 0),
    redirect_url:   redirectUrl || `${SITE}/dashboard/subscription/response`,
  });
}

// Lista todas las suscripciones — GET /recurring/v1/subscriptions/{apiKey}
export async function listSubscriptions() {
  const json = await epaycoGet(`/recurring/v1/subscriptions/${PUB_KEY()}`);
  return Array.isArray(json) ? json : (json.data ?? json.subscriptions ?? []);
}

// Cancela una suscripción — POST /recurring/v1/subscription/cancel
export async function cancelSubscription(uid) {
  return epaycoRecurringPost('/recurring/v1/subscription/cancel', {
    id:         uid,
    public_key: PUB_KEY(),
  });
}

// Busca y cancela todas las suscripciones activas de un email.
// Se usa como fallback cuando epayco_subscription_id no está guardado.
export async function cancelSubscriptionsByEmail(email) {
  const all = await listSubscriptions();
  const normalEmail = email.trim().toLowerCase();

  // Los campos de email varían según la respuesta de ePayco
  const matches = all.filter(s => {
    const subEmail = (
      s.customer_data?.email ||
      s.email ||
      s.cliente?.email ||
      s.subscriber?.email || ''
    ).trim().toLowerCase();
    const isActive = !s.status || ['active', '1', 'activa', 'activo'].includes(
      String(s.status).toLowerCase()
    );
    return subEmail === normalEmail && isActive;
  });

  const results = [];
  for (const s of matches) {
    const uid = s.id || s.uid || s._id || s.subscription_id;
    if (!uid) { results.push({ status: 'no_uid', raw: s }); continue; }
    try {
      await cancelSubscription(uid);
      results.push({ uid, status: 'cancelled' });
    } catch (err) {
      results.push({ uid, status: 'error', error: err.message });
    }
  }

  return { matched: matches.length, results };
}
