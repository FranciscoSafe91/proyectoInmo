// payments.js — procesamiento de notificaciones de Mercado Pago y conciliación.
//
// Principios:
//  - Nunca se confía en el body del webhook: con el id recibido se reconsulta a la
//    API de MP, que es la fuente de verdad.
//  - El vínculo pago → inmobiliaria sale de la suscripción (preapproval) que creó
//    el backend con external_reference = id de la inmobiliaria y el monto del plan.
//  - Todo es idempotente: el mismo pago se puede notificar N veces y se acredita una.

import * as db from './db.js';
import * as mercadopago from './mercadopago.js';
import * as mail from './mail.js';

// ---------------------------------------------------------------------------
// Control de suscripción activa
// ---------------------------------------------------------------------------
// Se activa con ENFORCE_SUBSCRIPTION=true. Queda apagado por defecto porque, si
// se prende antes de que Mercado Pago esté operativo, las agencias con la prueba
// vencida quedarían bloqueadas sin forma de pagar.
export function isSubscriptionEnforced() {
  return process.env.ENFORCE_SUBSCRIPTION === 'true';
}

export async function hasActiveSubscription(agencyId) {
  if (!isSubscriptionEnforced()) return true;
  const status = db.effectiveSubscriptionStatus(await db.getSubscriptionByAgency(agencyId));
  return status === 'activa' || status === 'trial';
}

// Estados de MP que revierten un pago ya acreditado.
const REVERSAL_STATUS = {
  refunded: 'reembolsado',
  charged_back: 'contracargo',
  cancelled: 'cancelado',
};

const AMOUNT_TOLERANCE = 0.01;

/**
 * Acredita un pago aprobado si se puede vincular a una suscripción nuestra.
 * Devuelve un string con el resultado (para logs).
 */
async function creditApprovedPayment(payment, preapprovalId) {
  if (!preapprovalId) return 'ignorado: pago sin suscripción asociada';

  const preapproval = await mercadopago.getPreapproval(preapprovalId);
  const agencyId = preapproval && preapproval.external_reference;
  if (!agencyId) return 'ignorado: suscripción sin external_reference';

  const agency = await db.getAgency(agencyId);
  if (!agency) return `ignorado: inmobiliaria ${agencyId} inexistente`;

  const expected = Number(preapproval.auto_recurring && preapproval.auto_recurring.transaction_amount);
  const paid = Number(payment.transaction_amount);
  if (payment.currency_id !== 'ARS') return `rechazado: moneda ${payment.currency_id}`;
  if (!(expected > 0) || !(paid + AMOUNT_TOLERANCE >= expected)) {
    console.error(`[pagos] Monto inválido en pago ${payment.id}: pagado ${paid}, esperado ${expected}`);
    return 'rechazado: monto menor al de la suscripción';
  }

  const result = await db.applySuccessfulPayment(agency.id, {
    amount: paid,
    currency: 'ARS',
    method: 'mercadopago',
    mpPaymentId: String(payment.id),
  });
  if (result && result.duplicate) return 'ya procesado';

  const card = payment.card || {};
  await db.updateSubscription(agency.id, {
    mpPreapprovalId: String(preapprovalId),
    ...(card.last_four_digits ? { cardLastFour: String(card.last_four_digits).slice(-4) } : {}),
    ...(payment.payment_method_id ? { cardBrand: String(payment.payment_method_id).slice(0, 40) } : {}),
  });
  await audit(agency.id, 'pago.acreditado', { mpPaymentId: String(payment.id), amount: paid });
  notifyBilling(agency, 'Recibimos tu pago', [
    `Se acreditó un pago de $${paid.toLocaleString('es-AR')} a tu suscripción.`,
    card.last_four_digits ? `Tarjeta terminada en ${String(card.last_four_digits).slice(-4)}.` : '',
  ]);
  return `acreditado a ${agency.id}`;
}

// La auditoría nunca debe romper el procesamiento de un pago.
async function audit(agencyId, action, details) {
  try {
    await db.createAuditLog({ agencyId, action, ip: 'mercadopago', details });
  } catch (e) {
    console.error(`[auditoría] No se pudo registrar ${action}:`, e.message);
  }
}

function notifyBilling(agency, title, lines) {
  if (!agency || !agency.email || !mail.isConfigured()) return;
  mail.sendBillingNotice(agency.email, { title, lines: lines.filter(Boolean) })
    .catch(e => console.error('[pagos] No se pudo enviar el aviso por email:', e.message));
}

async function handlePaymentState(payment, preapprovalId) {
  if (payment.status === 'approved') return creditApprovedPayment(payment, preapprovalId);
  const reversal = REVERSAL_STATUS[payment.status];
  if (reversal) {
    const reverted = await db.revertPayment(String(payment.id), reversal);
    if (!reverted) return 'nada que revertir';
    await audit(reverted.agencyId, 'pago.revertido', { mpPaymentId: String(payment.id), estado: reversal });
    notifyBilling(await db.getAgency(reverted.agencyId), 'Se revirtió un pago', [
      `El pago ${payment.id} figura como ${reversal} en Mercado Pago.`,
      'Se descontó de tu suscripción el período que ese pago cubría.',
    ]);
    return `revertido (${reversal}) en ${reverted.agencyId}`;
  }
  return `sin acción (estado ${payment.status})`;
}

// Tópico "payment": el id es de /v1/payments.
export async function processPayment(paymentId) {
  const payment = await mercadopago.getPayment(paymentId);
  if (!payment) return 'ignorado: pago inexistente';
  const preapprovalId =
    (payment.metadata && (payment.metadata.preapproval_id || payment.metadata.preapprovalId)) ||
    (payment.point_of_interaction && payment.point_of_interaction.transaction_data &&
      payment.point_of_interaction.transaction_data.subscription_id) ||
    null;
  return handlePaymentState(payment, preapprovalId);
}

// Tópico "subscription_authorized_payment": el id es de /authorized_payments y
// trae el preapproval_id y el id del pago real.
export async function processAuthorizedPayment(authorizedPaymentId) {
  const ap = await mercadopago.getAuthorizedPayment(authorizedPaymentId);
  const paymentId = ap && ap.payment && ap.payment.id;
  if (!paymentId) return `sin pago todavía (estado ${ap && ap.status})`;
  const payment = await mercadopago.getPayment(paymentId);
  return handlePaymentState(payment, ap.preapproval_id);
}

/**
 * Procesa una notificación. Lanza error si algo falló de forma transitoria
 * (API de MP o base de datos) para que el webhook responda 500 y MP reintente.
 */
export async function processNotification(type, dataId) {
  if (!dataId) return 'ignorado: sin id';
  switch (type) {
    case 'payment':
      return processPayment(dataId);
    case 'subscription_authorized_payment':
      return processAuthorizedPayment(dataId);
    case 'subscription_preapproval':
      // Alta/cancelación de la suscripción. No cambia el acceso: lo pagado sigue
      // vigente hasta current_period_end y, si se canceló, no llegan más cobros.
      return 'sin acción (cambio de estado de la suscripción)';
    default:
      return `ignorado: tópico ${type}`;
  }
}

/**
 * Conciliación: recorre los cobros de cada suscripción en MP y acredita los que
 * no hayan llegado por webhook (caídas del server, notificaciones perdidas).
 * Es seguro correrlo las veces que sea: todo es idempotente.
 */
export async function reconcile() {
  if (!mercadopago.isConfigured()) return;
  const subs = await db.listSubscriptionsWithPreapproval();
  let processed = 0;
  for (const sub of subs) {
    try {
      const res = await mercadopago.searchAuthorizedPayments(sub.mpPreapprovalId);
      for (const ap of (res && res.results) || []) {
        if (!ap.payment || !ap.payment.id) continue;
        const payment = await mercadopago.getPayment(ap.payment.id);
        const outcome = await handlePaymentState(payment, ap.preapproval_id || sub.mpPreapprovalId);
        if (outcome.startsWith('acreditado') || outcome.startsWith('revertido')) {
          console.log(`[conciliación] pago ${payment.id}: ${outcome}`);
          processed += 1;
        }
      }
    } catch (e) {
      console.error(`[conciliación] Error con la suscripción ${sub.mpPreapprovalId}:`, e.message);
    }
  }
  if (processed) console.log(`[conciliación] ${processed} pago(s) corregidos.`);
}
