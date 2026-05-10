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
  if (!env.paypal.clientId || !env.paypal.clientSecret) {
    throw new AppError('PayPal credentials are missing. Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.', 500);
  }
};

const requestAccessToken = async () => {
  assertConfigured();

  const credentials = Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString('base64');
  const response = await fetch(`${env.paypal.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new AppError('Unable to authenticate with PayPal.', 502);
  }

  return payload.access_token;
};

const paypalRequest = async ({ method, path, body, headers = {} }) => {
  const accessToken = await requestAccessToken();
  const response = await fetch(`${env.paypal.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new AppError(`PayPal request failed for ${path}.`, 502);
  }

  return payload;
};

const createOrder = async ({ paymentId, registrationId, amountUsd, currency }) => {
  const payload = await paypalRequest({
    method: 'POST',
    path: '/v2/checkout/orders',
    headers: {
      Prefer: 'return=representation',
    },
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `registration-${registrationId}`,
          custom_id: String(paymentId),
          description: `IEEE conference registration ${registrationId}`,
          amount: {
            currency_code: currency,
            value: Number(amountUsd).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: env.paypal.brandName,
        return_url: env.paypal.returnUrl || `${env.app.baseUrl}/payments/paypal/return`,
        cancel_url: env.paypal.cancelUrl || `${env.app.baseUrl}/payments/paypal/cancel`,
        user_action: 'PAY_NOW',
      },
    },
  });

  const approvalLink = Array.isArray(payload.links)
    ? payload.links.find((item) => ['approve', 'payer-action'].includes(item.rel))?.href || null
    : null;

  return {
    id: payload.id,
    status: payload.status,
    approvalUrl: approvalLink,
    raw: payload,
  };
};

const captureOrder = async (orderId) => {
  const payload = await paypalRequest({
    method: 'POST',
    path: `/v2/checkout/orders/${orderId}/capture`,
    headers: {
      Prefer: 'return=representation',
    },
    body: {},
  });

  return {
    id: payload.id,
    status: payload.status,
    raw: payload,
  };
};

const verifyWebhook = async ({ headers, body }) => {
  if (!env.paypal.webhookId) {
    throw new AppError('PAYPAL_WEBHOOK_ID is required to validate PayPal webhooks.', 500);
  }

  const payload = await paypalRequest({
    method: 'POST',
    path: '/v1/notifications/verify-webhook-signature',
    body: {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: env.paypal.webhookId,
      webhook_event: body,
    },
  });

  return payload.verification_status === 'SUCCESS';
};

module.exports = {
  createOrder,
  captureOrder,
  verifyWebhook,
};
