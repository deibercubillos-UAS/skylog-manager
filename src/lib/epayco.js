// Cliente ePayco — server-side only
// Endpoints verificados contra github.com/epayco/epayco-node

const BASE    = 'https://api.secure.payco.co';
const PUB_KEY = () => process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
const PRV_KEY = () => process.env.EPAYCO_PRIVATE_KEY;

// ── Auth ─────────────────────────────────────────────────────────────────────
// ePayco devuelve bearer_token (no "token")
async function getToken() {
  const res = await fetch(
    `${BASE}/v1/auth/login?public_key=${PUB_KEY()}&private_key=${PRV_KEY()}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`ePayco auth HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === false) throw new Error(`ePayco auth: ${json.message || 'credenciales inválidas'}`);
  const token = json.bearer_token || json.token;
  if (!token) throw new Error(`ePayco auth: bearer_token ausente. Respuesta: ${JSON.stringify(json)}`);
  return token;
}

// POST con bearer token
async function post(path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || json.description || `ePayco error ${res.status}`);
  }
  return json;
}

// GET sin bearer — ePayco usa apiKey en la URL para GETs de recursos
async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || `ePayco GET error ${res.status}`);
  }
  return json;
}

// ── Planes ───────────────────────────────────────────────────────────────────

// Lista todos los planes en ePayco y retorna array con { uid, id_plan, name, amount, ... }
export async function listPlans() {
  const json = await get(`/recurring/v1/plans/${PUB_KEY()}`);
  // ePayco puede devolver { data: [...] } o directamente el array
  return Array.isArray(json) ? json : (json.data ?? []);
}

// Crea un plan nuevo en ePayco
// Endpoint verificado: POST /recurring/v1/plan/create
export async function createPlan(cfg, billingKey) {
  return post('/recurring/v1/plan/create', {
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

// Actualiza un plan existente por su UID interno de ePayco
// Endpoint verificado: POST /recurring/v1/plan/edit/{uid}
export async function updatePlan(epaycoUid, { name, description, amount, trialDays, billingKey }) {
  return post(`/recurring/v1/plan/edit/${epaycoUid}`, {
    name,
    description,
    amount:         String(amount),
    currency:       'COP',
    interval:       billingKey === 'annual' ? 'year' : 'month',
    interval_count: 1,
    trial_days:     trialDays ?? 0,
    status:         1,
  });
}

// Cancela una suscripción activa
// Endpoint verificado: POST /recurring/v1/subscription/cancel
export async function cancelSubscription(uid) {
  return post('/recurring/v1/subscription/cancel', {
    id: uid,
    public_key: PUB_KEY(),
  });
}
