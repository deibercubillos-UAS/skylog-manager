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

async function epaycoPost(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: await headers(),
    // El SDK agrega extras_epayco en POSTs
    body:    JSON.stringify({ ...body, extras_epayco: { extra5: 'P44' } }),
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
  return epaycoPost('/recurring/v1/plan/create', {
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

// Actualiza un plan — POST /recurring/v1/plan/edit/{uid}
// uid = UID interno de ePayco (_id del listPlans)
export async function updatePlan(epaycoUid, { epaycoId, name, description, amount, trialDays, billingKey }) {
  return epaycoPost(`/recurring/v1/plan/edit/${epaycoUid}`, {
    id_plan:        epaycoId,           // requerido por ePayco en el body
    name,
    description,
    amount:         Number(amount),     // ePayco espera número, no string
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     Number(trialDays ?? 0),
    status:         1,
  });
}

// Cancela una suscripción — POST /recurring/v1/subscription/cancel
export async function cancelSubscription(uid) {
  return epaycoPost('/recurring/v1/subscription/cancel', {
    id:         uid,
    public_key: PUB_KEY(),
  });
}
