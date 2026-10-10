// Pruebas de integración de la API de Skylog V2 (node:test, sin dependencias).
//   1. Barrido: ninguna ruta responde 2xx ni 5xx a una petición SIN sesión (salvo las públicas a propósito).
//   2. Los crons exigen CRON_SECRET.
//   3. Aislamiento entre organizaciones y permisos por rol.
// Uso: levantar `next dev` (o `next start`) contra la rama de desarrollo y correr `npm run test:integration`.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertDevDatabase, call, createOwner, joinAsPilot, deleteAccount, env, uniq } from './helpers.mjs';

const ROOTS = ['src/app/(v2)/api', 'src/app/api'];
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// Rutas públicas A PROPÓSITO (sin sesión). Cualquier ruta nueva que responda 2xx sin sesión hace fallar el barrido:
// hay que revisarla y, si es pública de verdad, agregarla aquí.
const PUBLIC = new Set([
  'GET /api/alta/organizacion', 'GET /api/alta/regalo', 'POST /api/alta/unirse', 'GET /api/alta/unirse',
  'GET /api/public/sms-report/:token', 'POST /api/public/sms-report/:token',
  'GET /api/app/version', 'GET /api/app/releases', 'GET /api/plans/public', 'POST /api/contact', 'POST /api/leads',
  'POST /api/auth/reset-request', 'GET /api/socio/invite-info', 'GET /api/suscripcion/wompi/webhook', 'POST /api/suscripcion/wompi/webhook',
  'GET /api/invitaciones/:token',
]);

function listRoutes() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'route.js') out.push(p);
    }
  };
  ROOTS.forEach((r) => fs.existsSync(r) && walk(r));
  return out.map((file) => {
    const src = fs.readFileSync(file, 'utf8');
    const methods = [...src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const rel = file.replace(/^src\/app\/(\(v2\)\/)?/, '').replace(/\/route\.js$/, '');
    const template = '/' + rel.replace(/\[(\w+)\]/g, ':$1');
    const real = '/' + rel.replace(/\[(\w+)\]/g, ZERO_UUID);
    return { template, real, methods };
  });
}

before(() => assertDevDatabase());

describe('barrido sin sesión', () => {
  const routes = listRoutes().filter((r) => !r.template.startsWith('/api/cron/'));
  test('hay rutas que probar', () => assert.ok(routes.length > 100, `solo ${routes.length} rutas`));
  for (const r of routes) {
    for (const m of r.methods) {
      const key = `${m} ${r.template}`;
      test(key, async () => {
        const res = await call(m, r.real, m === 'GET' || m === 'DELETE' ? {} : { body: {} });
        // 503 = servicio sin configurar en este entorno (p. ej. almacenamiento): no es un fallo del código.
        assert.ok(res.status < 500 || res.status === 503, `${key} respondió ${res.status} (error del servidor) sin sesión`);
        if (!PUBLIC.has(key)) assert.ok(res.status >= 300, `${key} respondió ${res.status} sin sesión: ¿es pública a propósito? Si sí, agrégala a PUBLIC`);
      });
    }
  }
});

describe('crons', () => {
  const crons = listRoutes().filter((r) => r.template.startsWith('/api/cron/'));
  for (const c of crons) {
    test(`${c.template} rechaza sin secreto`, async () => {
      const res = await call('GET', c.real);
      assert.ok([401, 403].includes(res.status), `respondió ${res.status}`);
    });
    test(`${c.template} rechaza un secreto incorrecto`, async () => {
      const res = await call('GET', c.real, { headers: { authorization: 'Bearer incorrecto' } });
      assert.ok([401, 403].includes(res.status), `respondió ${res.status}`);
    });
  }
});

describe('organizaciones y roles', () => {
  let A, B, pilotA;
  let stock;
  before(async () => {
    A = await createOwner('intA');
    B = await createOwner('intB');
    pilotA = await joinAsPilot(A, 'pilA');
  });
  after(async () => {
    for (const w of [pilotA, A, B]) await deleteAccount(w).catch(() => {});
  });

  test('el gestor crea una existencia de equipo en su organización', async () => {
    const r = await call('POST', '/api/flota/equipo', { cookie: A.cookie, body: { organizationId: A.organizationId, name: uniq('Extintor'), quantity: 2 } });
    assert.equal(r.status, 200, r.text);
    stock = r.json.item;
  });

  test('un miembro de la misma organización la ve', async () => {
    const r = await call('GET', `/api/flota/equipo?organizationId=${A.organizationId}`, { cookie: pilotA.cookie });
    assert.equal(r.status, 200);
    assert.ok(r.json.items.some((i) => i.id === stock.id));
    assert.equal(r.json.isManager, false);
  });

  test('otra organización no puede listarla', async () => {
    const r = await call('GET', `/api/flota/equipo?organizationId=${A.organizationId}`, { cookie: B.cookie });
    assert.equal(r.status, 400);
  });

  test('otra organización no puede modificarla ni borrarla', async () => {
    const p = await call('PATCH', `/api/flota/equipo/${stock.id}`, { cookie: B.cookie, body: { name: 'hack', quantity: 99 } });
    assert.ok([403, 404].includes(p.status), `PATCH ${p.status}`);
    const d = await call('DELETE', `/api/flota/equipo/${stock.id}`, { cookie: B.cookie });
    assert.ok([403, 404].includes(d.status), `DELETE ${d.status}`);
  });

  test('otra organización no puede crear datos dentro de la mía', async () => {
    const r = await call('POST', '/api/flota/equipo', { cookie: B.cookie, body: { organizationId: A.organizationId, name: 'intruso', quantity: 1 } });
    assert.equal(r.status, 403);
  });

  test('un piloto no puede crear ni editar existencias', async () => {
    const c = await call('POST', '/api/flota/equipo', { cookie: pilotA.cookie, body: { organizationId: A.organizationId, name: 'x', quantity: 1 } });
    assert.equal(c.status, 403);
    const p = await call('PATCH', `/api/flota/equipo/${stock.id}`, { cookie: pilotA.cookie, body: { name: 'x', quantity: 5 } });
    assert.equal(p.status, 403);
  });

  test('un piloto no accede a lo exclusivo de gestores', async () => {
    const q = `?organizationId=${A.organizationId}`;
    for (const url of [`/api/audit${q}`, `/api/suscripcion/historial${q}`]) {
      const r = await call('GET', url, { cookie: pilotA.cookie });
      assert.ok([400, 403].includes(r.status), `${url} respondió ${r.status} a un piloto`);
    }
    const imp = await call('POST', '/api/organizacion/importar', { cookie: pilotA.cookie, body: {} });
    assert.ok([400, 403, 415].includes(imp.status), `importar respondió ${imp.status} a un piloto`);
  });

  test('el gestor sí ve el registro de acciones y la suscripción', async () => {
    const a = await call('GET', `/api/audit?organizationId=${A.organizationId}`, { cookie: A.cookie });
    assert.equal(a.status, 200, a.text);
    assert.ok(a.json.entries?.some((e) => e.module === 'Equipo') ?? true);
    const s = await call('GET', `/api/suscripcion/historial?organizationId=${A.organizationId}`, { cookie: A.cookie });
    assert.equal(s.status, 200, s.text);
  });

  test('las notificaciones son privadas de cada persona', async () => {
    const mine = await call('GET', `/api/notificaciones?organizationId=${A.organizationId}`, { cookie: A.cookie });
    assert.equal(mine.status, 200);
    // B pidiendo las notificaciones de la organización de A no recibe ninguna de A.
    const other = await call('GET', `/api/notificaciones?organizationId=${A.organizationId}`, { cookie: B.cookie });
    assert.equal(other.status, 200);
    assert.equal(other.json.notifications.length, 0);
    const del = await call('DELETE', `/api/notificaciones/${ZERO_UUID}`, { cookie: B.cookie });
    assert.ok(del.status < 500);
  });

  test('exportar mis datos solo devuelve los míos', async () => {
    const r = await call('GET', '/api/perfil/exportar', { cookie: B.cookie });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes(A.email), 'la exportación de B contiene datos de A');
  });
});

test('cron con secreto correcto responde', { skip: !env.cronSecret }, async () => {
  const res = await call('GET', '/api/cron/notifications-daily', { headers: { authorization: `Bearer ${env.cronSecret}` } });
  assert.ok(res.status < 500, `respondió ${res.status}`);
});
