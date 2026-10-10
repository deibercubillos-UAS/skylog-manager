// Pruebas de integración de Skylog V2 — utilidades. Corren contra un servidor ya levantado (BASE_URL, por defecto
// http://localhost:3000) conectado a la rama de DESARROLLO de Supabase. Se niegan a correr contra cualquier otra base.
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEV_REF = 'bqimtkwzayewwubgsaji';
export const PASSWORD = 'Prueba-Integracion-2026!';
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Mismo orden que Next en desarrollo: .env.development.local gana sobre .env.local.
function loadEnv() {
  for (const name of ['.env.development.local', '.env.local']) {
    const file = path.resolve(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

export const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cronSecret: process.env.CRON_SECRET,
};

export function assertDevDatabase() {
  if (!env.url?.includes(DEV_REF)) {
    throw new Error(`Las pruebas de integración solo corren contra la rama de desarrollo (${DEV_REF}). URL actual: ${env.url}`);
  }
  if (!env.service || !env.anon) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
}

export const admin = () => createClient(env.url, env.service, { auth: { persistSession: false } });

const stamp = Date.now().toString(36);
export const uniq = (p) => `${p}-${stamp}-${Math.random().toString(36).slice(2, 6)}`;

/** Crea un usuario de Auth (correo @skylog-test.local, ya confirmado). */
export async function createAuthUser(email) {
  const { data, error } = await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  return data.user;
}

/** Cookie de sesión equivalente a la que deja el navegador tras iniciar sesión. */
export async function sessionCookie(email) {
  const c = createClient(env.url, env.anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  const ref = new URL(env.url).hostname.split('.')[0];
  const b64 = Buffer.from(JSON.stringify(data.session)).toString('base64url');
  return `sb-${ref}-auth-token=base64-${b64}`;
}

export async function call(method, url, { cookie, body, headers = {} } = {}) {
  const res = await fetch(BASE_URL + url, {
    method,
    redirect: 'manual',
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* no JSON */ }
  return { status: res.status, json, text };
}

/** Dueño de una organización nueva (prueba de 15 días) — usa la misma función atómica que el registro real. */
export async function createOwner(label) {
  const email = `${uniq(label)}@skylog-test.local`;
  const user = await createAuthUser(email);
  const nit = String(9_000_000_000 + Math.floor(Math.random() * 999_999_999));
  const { data, error } = await admin().rpc('v2_register_explotador', {
    p: { auth_user_id: user.id, full_name: `Dueño ${label}`, email, phone: '3001112233', company_name: `Org ${label} ${stamp}`, nit, nit_type: 'NIT', trial_days: 15, attribution: null },
  });
  if (error) throw error;
  return { email, user, nit, organizationId: data.organization_id, personId: data.person_id, cookie: await sessionCookie(email) };
}

/** Piloto que se une a la organización por la función atómica del registro. */
export async function joinAsPilot(owner, label) {
  const email = `${uniq(label)}@skylog-test.local`;
  const user = await createAuthUser(email);
  const { error } = await admin().rpc('v2_join_organization', {
    p: { auth_user_id: user.id, organization_id: owner.organizationId, role: 'piloto', full_name: `Piloto ${label}`, email, phone: '3002223344', attribution: null },
  });
  if (error) throw error;
  return { email, user, organizationId: owner.organizationId, cookie: await sessionCookie(email) };
}

/** Borra la cuenta con el propio endpoint de «eliminar mi cuenta» (borra también la organización si queda sola). */
export async function deleteAccount(who) {
  if (!who?.cookie) return;
  await call('DELETE', '/api/perfil/cuenta', { cookie: who.cookie, body: { confirmEmail: who.email } });
}
