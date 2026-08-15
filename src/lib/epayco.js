// Cliente ePayco — server-side only
// Autenticación y headers verificados contra github.com/epayco/epayco-node

const BASE    = 'https://api.secure.payco.co';
const PUB_KEY = () => process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
const PRV_KEY = () => process.env.EPAYCO_PRIVATE_KEY;

// ── Auth ─────────────────────────────────────────────────────────────────────
// El SDK usa POST con JSON body, devuelve bearer_token
//
// ⚠️ Perf real confirmado (2026-07-26): antes NO había ningún cache — cada
// llamada a headers() (osea cada GET/POST a ePayco) volvía a hacer login
// completo. `activate-pending` termina llamando a ePayco varias veces en un
// solo request (listSubscriptions + un getCustomer por cada suscripción activa
// que resolver), así que sin cache eran N+1 round-trips de login serializados
// — el usuario reportó que "confirmar el pago" tardaba mucho, esto era la
// causa. El bearer_token de ePayco dura tiempo suficiente para reutilizarlo
// dentro de la misma invocación serverless (y entre invocaciones si la
// instancia sigue caliente) — se cachea en memoria con margen de 60s.
let _tokenCache = null; // { token, expiresAt }

async function getToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now()) {
    return _tokenCache.token;
  }

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

  // El JWT de ePayco típicamente dura ~1h — se cachea 10 min para no arriesgar
  // usar un token vencido si la instancia serverless sigue caliente por más
  // tiempo del real (mejor renovar de más que fallar por token expirado).
  _tokenCache = { token, expiresAt: Date.now() + 10 * 60 * 1000 };
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
    const msg = json.message || json.error || json.error_description || `ePayco GET ${res.status}`;
    throw new Error(`${msg} (HTTP ${res.status}, path=${path})`);
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

// Obtiene un cliente por su id — GET /payment/v1/customer/{apiKey}/{uid}
// (confirmado contra el SDK oficial epayco-node, `customers.get`).
export async function getCustomer(idCustomer) {
  const json = await epaycoGet(`/payment/v1/customer/${PUB_KEY()}/${idCustomer}`);
  return json.data ?? json;
}

// ⚠️ Bug real confirmado (2026-07-26): la respuesta de
// `GET /recurring/v1/subscriptions/{apiKey}` NUNCA trae el email del cliente —
// solo un `idCustomer` opaco. Todo el código que antes intentaba leer
// `s.email`/`s.customer_data?.email`/etc. directo de la suscripción SIEMPRE
// fallaba en silencio (`email` quedaba vacío, ninguna comparación coincidía
// jamás) — afectaba por igual la reconciliación de `activate-pending`, el
// listado de Master (mostraba "—" en la columna Email para toda suscripción)
// y `cancelSubscriptionsByEmail()` (ya documentado en CLAUDE.md como
// "siempre retorna matched: 0"). `resolveSubscriptionEmail()` es la única
// fuente de verdad correcta desde ahora: resuelve el email real vía
// `getCustomer(idCustomer)`, con caché en memoria por `idCustomer` dentro de
// una misma ejecución para no repetir la llamada si varias suscripciones
// comparten cliente.
export async function resolveSubscriptionEmail(sub, cache = new Map()) {
  const direct = (
    sub.customer_data?.email ||
    sub.email ||
    sub.cliente?.email ||
    sub.subscriber?.email || ''
  ).trim();
  if (direct) return direct.toLowerCase();

  const idCustomer = sub.idCustomer || sub._raw?.idCustomer;
  if (!idCustomer) return '';

  if (cache.has(idCustomer)) return cache.get(idCustomer);

  try {
    const customer = await getCustomer(idCustomer);
    const email = (customer?.email || customer?.data?.email || '').trim().toLowerCase();
    cache.set(idCustomer, email);
    return email;
  } catch (err) {
    cache.set(idCustomer, '');
    return '';
  }
}

// Busca y cancela todas las suscripciones activas de un email.
// Se usa como fallback cuando epayco_subscription_id no está guardado.
export async function cancelSubscriptionsByEmail(email) {
  const all = await listSubscriptions();
  const normalEmail = email.trim().toLowerCase();
  const emailCache = new Map();

  // Resuelve el email real de cada suscripción (ver resolveSubscriptionEmail) —
  // antes comparaba directo contra campos que ePayco nunca envía.
  const emails = await Promise.all(all.map(s => resolveSubscriptionEmail(s, emailCache)));

  const matches = all.filter((s, i) => {
    const subEmail = emails[i];
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
