/**
 * Script temporal: cancela una suscripción ePayco por email o por _id.
 *
 * Uso:
 *   node scripts/cancel-epayco-sub.mjs --email piloto1@hotmail.com
 *   node scripts/cancel-epayco-sub.mjs --id a23a464a0d4ad356909f4c2...
 *
 * Lee las claves desde .env.local automáticamente.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Cargar .env.local manualmente ────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of envLines) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
}

const BASE    = 'https://api.secure.payco.co';
const PUB_KEY = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
const PRV_KEY = process.env.EPAYCO_PRIVATE_KEY;

if (!PUB_KEY || !PRV_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_EPAYCO_PUBLIC_KEY o EPAYCO_PRIVATE_KEY en .env.local');
  process.exit(1);
}

async function getToken() {
  const res  = await fetch(`${BASE}/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ public_key: PUB_KEY, private_key: PRV_KEY }),
  });
  const json = await res.json();
  const token = json.bearer_token || json.token;
  if (!token) throw new Error('No se obtuvo token: ' + JSON.stringify(json));
  return token;
}

async function epaycoHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'type':         'sdk-jwt',
    'lang':         'NODE',
    'Authorization': `Bearer ${await getToken()}`,
  };
}

async function listSubscriptions() {
  const res  = await fetch(`${BASE}/recurring/v1/subscriptions/${PUB_KEY}`, { headers: await epaycoHeaders() });
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.subscriptions ?? []);
}

async function cancelById(uid) {
  const res  = await fetch(`${BASE}/recurring/v1/subscription/cancel`, {
    method:  'POST',
    headers: await epaycoHeaders(),
    body:    JSON.stringify({ id: uid, public_key: PUB_KEY }),
  });
  const json = await res.json();
  if (json.status === false) throw new Error(json.message || JSON.stringify(json));
  return json;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const byId   = args[args.indexOf('--id')   + 1] || null;
const byEmail = args[args.indexOf('--email') + 1] || null;

if (!byId && !byEmail) {
  console.log('Uso:');
  console.log('  node scripts/cancel-epayco-sub.mjs --email piloto1@hotmail.com');
  console.log('  node scripts/cancel-epayco-sub.mjs --id <subscription_id>');
  process.exit(0);
}

try {
  if (byId) {
    console.log(`Cancelando suscripción _id=${byId} ...`);
    const result = await cancelById(byId);
    console.log('✅ Cancelada:', JSON.stringify(result, null, 2));

  } else {
    console.log(`Buscando suscripciones de ${byEmail} ...`);
    const all     = await listSubscriptions();
    console.log(`Total suscripciones en ePayco: ${all.length}`);

    const target  = byEmail.trim().toLowerCase();
    const matches = all.filter(s => {
      const em = (s.customer_data?.email || s.email || s.cliente?.email || s.subscriber?.email || '').trim().toLowerCase();
      return em === target;
    });

    if (!matches.length) {
      console.log('⚠️  No se encontraron suscripciones para ese email.');
      console.log('Primeras 5 entradas del listado para inspección:');
      console.log(JSON.stringify(all.slice(0, 5), null, 2));
      process.exit(0);
    }

    for (const s of matches) {
      const uid = s.id || s.uid || s._id || s.subscription_id;
      console.log(`  → Cancelando uid=${uid} status=${s.status} ...`);
      try {
        const r = await cancelById(uid);
        console.log(`  ✅ OK:`, JSON.stringify(r));
      } catch (e) {
        console.error(`  ❌ Error:`, e.message);
      }
    }
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
