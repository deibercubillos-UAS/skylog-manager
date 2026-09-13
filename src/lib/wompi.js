// Wrapper de la API de Wompi (Colombia) — reemplaza src/lib/epayco.js.
//
// Modelo de Wompi (distinto de ePayco, ver docs/wompi-migration.md):
// no existe un "plan recurrente hospedado" — el primer cobro se hace con el
// Widget de Wompi (checkout.wompi.co/widget.js, embebido client-side, nunca
// vemos el número de tarjeta) configurado con `payment_source_id_recurrent`
// para que Wompi tokenice la tarjeta como fuente de pago reutilizable. Los
// cobros siguientes (mensual/anual) los dispara ESTA app (cron de
// recurrencia) llamando createRecurringTransaction() con ese payment_source_id
// guardado — sin que el cliente vuelva a entrar.
//
// Todas las llaves vienen de variables de entorno (nunca hardcodeadas):
//   WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET,
//   WOMPI_INTEGRITY_SECRET, WOMPI_API_BASE (default producción)
import crypto from 'crypto';

const API_BASE = process.env.WOMPI_API_BASE || 'https://production.wompi.co/v1';

function assertEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} no configurada en las variables de entorno`);
  return v;
}

async function wompiFetch(path, { method = 'GET', body, auth = 'private' } = {}) {
  const key = auth === 'public' ? assertEnv('WOMPI_PUBLIC_KEY') : assertEnv('WOMPI_PRIVATE_KEY');
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.reason || json?.error?.messages ? JSON.stringify(json.error) : `Wompi ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/**
 * Token de aceptación de términos/política de datos — requerido por Wompi en
 * cualquier transacción o fuente de pago nueva. Se obtiene del propio
 * comercio (llave pública), no del cliente final.
 */
export async function getAcceptanceToken() {
  const key = assertEnv('WOMPI_PUBLIC_KEY');
  const res = await fetch(`${API_BASE}/merchants/${key}`);
  const json = await res.json();
  if (!res.ok) throw new Error('No se pudo obtener el acceptance_token de Wompi');
  return {
    acceptanceToken: json.data.presigned_acceptance.acceptance_token,
    personalDataAuthToken: json.data.presigned_personal_data_auth?.acceptance_token || null,
  };
}

/**
 * Firma de integridad requerida por el Widget/Web Checkout de Wompi para que
 * el monto/referencia no se puedan alterar desde el navegador.
 * SHA-256(reference + amountInCents + currency + integritySecret)
 */
export function buildIntegritySignature({ reference, amountInCents, currency = 'COP' }) {
  const secret = assertEnv('WOMPI_INTEGRITY_SECRET');
  const raw = `${reference}${amountInCents}${currency}${secret}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Verifica el checksum de un evento de webhook. Wompi firma
 * SHA-256(valores de signature.properties en orden + timestamp + events_secret).
 * Nunca hardcodear `properties` — viene dinámico en cada evento.
 */
export function verifyWebhookChecksum(eventBody) {
  const secret = assertEnv('WOMPI_EVENTS_SECRET');
  const { data, signature, timestamp } = eventBody || {};
  if (!signature?.properties?.length || !signature?.checksum || !timestamp) return false;

  const concatenated = signature.properties
    .map((path) => {
      // path tipo "transaction.id" → data.transaction.id, o "transaction.amount_in_cents"
      const parts = path.split('.').slice(1); // quita el prefijo "transaction"
      let value = data?.transaction;
      for (const p of parts) value = value?.[p];
      return value ?? '';
    })
    .join('');

  const raw = `${concatenated}${timestamp}${secret}`;
  const expected = crypto.createHash('sha256').update(raw).digest('hex');
  return expected === String(signature.checksum).toLowerCase();
}

/**
 * Consulta el estado real de una transacción por su ID — usado por
 * /api/wompi/verify (red de seguridad si el webhook no llega) y por el
 * webhook mismo para confirmar antes de activar.
 */
export async function getTransaction(transactionId) {
  const json = await wompiFetch(`/transactions/${transactionId}`, { auth: 'public' });
  return json.data;
}

/**
 * Cobro recurrente server-to-server usando una fuente de pago ya tokenizada
 * (payment_source_id guardado en la primera compra). Sin intervención del
 * cliente — puede ser declinado si el emisor de la tarjeta exige
 * reautenticación (ver docs/wompi-migration.md, limitación 3RI/Mastercard);
 * el llamador (cron de recurrencia) debe manejar ese caso como "declinado",
 * no como error fatal.
 */
export async function createRecurringTransaction({
  paymentSourceId, amountInCents, currency = 'COP', customerEmail, reference, taxInCents,
}) {
  const { acceptanceToken } = await getAcceptanceToken();
  const body = {
    acceptance_token: acceptanceToken,
    amount_in_cents: amountInCents,
    currency,
    customer_email: customerEmail,
    payment_method: { installments: 1 },
    payment_source_id: paymentSourceId,
    reference,
  };
  if (taxInCents) {
    body.taxes = [{ type: 'VAT', amount_in_cents: taxInCents }];
  }
  return wompiFetch('/transactions', { method: 'POST', body, auth: 'private' });
}
