#!/usr/bin/env node
// scripts/etl/epayco-pendientes.mjs — recurrencias de ePayco por cancelar en el corte (decisión B) y estado de cada cliente
// frente a Wompi. Por defecto SOLO LISTA. `--cancelar` las cancela en ePayco (irreversible): úsalo el día del corte (T0), con
// v1 ya en solo lectura, y después de revisar la lista.
//
//   node --env-file=.env.local scripts/etl/epayco-pendientes.mjs               # lista → epayco-pendientes.csv
//   node --env-file=.env.local scripts/etl/epayco-pendientes.mjs --cancelar    # cancela (necesita las llaves de ePayco)
import fs from 'node:fs';
import { v2db, migratedSubscriptions } from './lib/v2db.mjs';

const BASE = 'https://api.secure.payco.co';

async function epaycoHeaders() {
  const pub = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY, prv = process.env.EPAYCO_PRIVATE_KEY;
  if (!pub || !prv) throw new Error('Faltan NEXT_PUBLIC_EPAYCO_PUBLIC_KEY y EPAYCO_PRIVATE_KEY');
  const res = await fetch(`${BASE}/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_key: pub, private_key: prv }) });
  const json = await res.json();
  const token = json.bearer_token || json.token;
  if (!token) throw new Error(`ePayco no entregó token: ${JSON.stringify(json)}`);
  return { 'Content-Type': 'application/json', Accept: 'application/json', type: 'sdk-jwt', lang: 'NODE', Authorization: `Bearer ${token}` };
}
async function cancel(id) {
  const res = await fetch(`${BASE}/recurring/v1/subscription/cancel`, { method: 'POST', headers: await epaycoHeaders(), body: JSON.stringify({ id, public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY }) });
  const json = await res.json();
  if (json.status === false) throw new Error(json.message || JSON.stringify(json));
}

async function main() {
  const doCancel = process.argv.includes('--cancelar');
  const db = v2db();
  const subs = (await migratedSubscriptions(db)).filter((s) => s.legacy_epayco_subscription_id);
  const rows = [];
  for (const s of subs) {
    const wompi = s.payment_provider === 'wompi' && !!s.wompi_payment_source_id;
    let estado = wompi ? 'ya registró tarjeta en Wompi' : 'sin tarjeta en Wompi (conserva acceso hasta el vencimiento)';
    if (doCancel) {
      try { await cancel(s.legacy_epayco_subscription_id); estado += ' · CANCELADA en ePayco'; await db.from('subscriptions').update({ legacy_epayco_subscription_id: null }).eq('organization_id', s.organization_id); }
      catch (e) { estado += ` · ERROR al cancelar: ${e.message}`; }
    }
    rows.push({ organizacion: s.company, plan: s.plan, vence: s.expires_at, epayco_subscription_id: s.legacy_epayco_subscription_id, estado });
  }
  const cols = ['organizacion', 'plan', 'vence', 'epayco_subscription_id', 'estado'];
  fs.writeFileSync('epayco-pendientes.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n') + '\n');
  console.log(`${rows.length} recurrencia(s) de ePayco${doCancel ? ' procesadas' : ' por cancelar en el corte (no se canceló nada: usa --cancelar)'} → epayco-pendientes.csv`);
}
main().catch((e) => { console.error(`epayco-pendientes detenido: ${e.message}`); process.exit(1); });
