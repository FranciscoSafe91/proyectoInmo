// mercadopago.js — integración con la API de Suscripciones (Preapproval) de
// Mercado Pago, implementada con llamadas HTTPS crudas (node:https), sin el
// SDK oficial, para no depender de `npm install`.
//
// Documentación de referencia: https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview
//
// MODO SIMULADO: si no hay MP_ACCESS_TOKEN configurado como variable de
// entorno, este módulo no llama a la API real — server.js detecta esto con
// isConfigured() y usa un flujo de pago simulado en su lugar. Así el
// prototipo se puede probar de punta a punta sin credenciales reales.

import https from 'node:https';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

const MP_API_HOST = 'api.mercadopago.com';

// Hacen falta las dos: sin la clave del webhook las notificaciones se rechazan y
// un usuario podría pagar sin que se le acredite la suscripción.
export function isConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_WEBHOOK_SECRET);
}

// El pago simulado tiene que pedirse explícitamente y nunca corre en producción:
// si falta MP_ACCESS_TOKEN por un error de configuración, el sistema NO debe
// regalar suscripciones (fail-closed).
export function simulatedPaymentsAllowed() {
  return !isConfigured()
    && process.env.PAYMENTS_SIMULATED === 'true'
    && process.env.NODE_ENV !== 'production';
}

// Valida la firma de una notificación (header x-signature) según la doc de MP:
//   x-signature: "ts=1704908010,v1=<hmac-sha256 hex>"
//   manifest:    "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// La clave es la "clave secreta" del webhook (panel de MP → Tus integraciones →
// Webhooks), configurada como MP_WEBHOOK_SECRET.
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
export function verifyWebhookSignature({ xSignature, xRequestId, dataId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !xSignature) return false;

  const parts = Object.fromEntries(
    String(xSignature).split(',').map(p => p.split('=').map(s => s.trim())).filter(kv => kv.length === 2)
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;

  // Si data.id es alfanumérico, MP lo firma en minúsculas.
  const id = dataId ? String(dataId).toLowerCase() : '';
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        host: MP_API_HOST,
        path,
        method,
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          // Evita cobros/creaciones duplicadas si se reintenta el mismo POST.
          ...(method === 'POST' ? { 'X-Idempotency-Key': randomUUID() } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            /* respuesta no-JSON, se devuelve tal cual en rawBody */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Mercado Pago API ${method} ${path} → ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`Mercado Pago API ${method} ${path} → timeout`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Crea una suscripción (preapproval) y devuelve el link de pago (init_point)
// al que hay que redirigir al usuario para que complete el primer pago.
export async function createPreapproval({ reason, payerEmail, amount, externalReference, backUrl }) {
  const body = {
    reason,
    external_reference: externalReference,
    payer_email: payerEmail,
    back_url: backUrl,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'ARS',
    },
    status: 'pending',
  };
  return request('POST', '/preapproval', body);
}

export async function getPreapproval(preapprovalId) {
  return request('GET', `/preapproval/${encodeURIComponent(preapprovalId)}`);
}

export async function getPayment(paymentId) {
  return request('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);
}

// Cobro recurrente de una suscripción (tópico subscription_authorized_payment).
// Devuelve, entre otros: preapproval_id, transaction_amount, currency_id y
// payment: { id, status }.
export async function getAuthorizedPayment(authorizedPaymentId) {
  return request('GET', `/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`);
}

export async function searchAuthorizedPayments(preapprovalId) {
  return request('GET', `/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}&limit=50`);
}
