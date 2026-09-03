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

const MP_API_HOST = 'api.mercadopago.com';

export function isConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        host: MP_API_HOST,
        path,
        method,
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
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
