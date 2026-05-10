const env = require('../config/env');
const AppError = require('../utils/errors');

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const assertConfigured = () => {
  if (!env.payphone.token || !env.payphone.storeId || !env.payphone.callbackUrl) {
    throw new AppError(
      'PayPhone credentials are missing. Configure PAYPHONE_TOKEN, PAYPHONE_STORE_ID and PAYPHONE_CALLBACK_URL.',
      500
    );
  }
};

const payphoneRequest = async ({ method, path, body }) => {
  assertConfigured();

  const response = await fetch(`${env.payphone.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.payphone.token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new AppError(`PayPhone request failed for ${path}.`, 502);
  }

  return payload;
};

const createPayment = async ({ paymentId, registrationId, amountUsd, currency }) => {
  const amountInCents = Math.round(Number(amountUsd) * 100);
  const payload = await payphoneRequest({
    method: 'POST',
    path: '/button/PrepareCheckout',
    body: {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      storeId: env.payphone.storeId,
      currency: currency || env.payphone.currency,
      clientTransactionId: String(paymentId),
      reference: `registration-${registrationId}`,
      responseUrl: env.payphone.callbackUrl,
      cancellationUrl: env.payphone.cancelUrl || env.payphone.callbackUrl,
    },
  });

  return {
    providerPaymentId:
      payload.payPhoneTransactionId ||
      payload.transactionId ||
      payload.id ||
      String(paymentId),
    paymentUrl: payload.payWithCard || payload.paymentUrl || payload.checkoutUrl || null,
    raw: payload,
  };
};

const validateCallbackRequest = ({ headers, query }) => {
  if (!env.payphone.callbackToken) {
    return;
  }

  const receivedToken =
    query.token ||
    headers['x-payphone-callback-token'] ||
    headers['x-callback-token'] ||
    headers.authorization;

  if (String(receivedToken || '').replace(/^Bearer\s+/i, '') !== env.payphone.callbackToken) {
    throw new AppError('Invalid PayPhone callback token.', 401);
  }
};

const normalizeCallbackPayload = (payload = {}) => {
  const status = String(
    payload.transactionStatus ||
      payload.status ||
      payload.state ||
      payload.paymentStatus ||
      ''
  ).toLowerCase();

  return {
    paymentId: Number(payload.clientTransactionId || payload.referenceId || payload.paymentId || 0),
    providerPaymentId:
      payload.payPhoneTransactionId ||
      payload.transactionId ||
      payload.id ||
      null,
    approved: ['approved', 'paid', 'completed', 'success', 'succeeded'].includes(status),
    rejected: ['rejected', 'declined', 'failed', 'cancelled', 'canceled'].includes(status),
    reason: payload.message || payload.reason || null,
  };
};

module.exports = {
  createPayment,
  validateCallbackRequest,
  normalizeCallbackPayload,
};
