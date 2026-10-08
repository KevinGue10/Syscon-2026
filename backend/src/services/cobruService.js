const env = require('../config/env');
const AppError = require('../utils/errors');
const crypto = require('crypto');

let cachedToken;
let tokenExpiresAt = 0;
let tokenRequest;
const slugPattern = /^[A-Za-z0-9_-]{1,150}$/;

const assertConfigured = () => {
  if (!env.cobru.apiKey || !env.cobru.refreshToken || !env.cobru.callbackToken) {
    throw new AppError('Configure COBRU_API_KEY, COBRU_REFRESH_TOKEN and COBRU_CALLBACK_TOKEN.', 503);
  }
  for (const value of [env.cobru.baseUrl, env.cobru.returnUrl, env.cobru.callbackUrl]) {
    let url;
    try { url = new URL(value); } catch { throw new AppError('Configure valid Cobru API, return and callback URLs.', 503); }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new AppError('Cobru URLs must use HTTPS without embedded credentials.', 503);
    }
  }
  if (!Number.isInteger(env.cobru.expirationDays) || env.cobru.expirationDays < 1 ||
      !Number.isFinite(env.cobru.timeoutMs) || env.cobru.timeoutMs < 1000) {
    throw new AppError('Invalid Cobru expiration or timeout configuration.', 503);
  }
};

const request = async (pathname, { method = 'GET', body, token } = {}) => {
  let response;
  let payload;
  try {
    response = await fetch(`${env.cobru.baseUrl.replace(/\/$/, '')}${pathname}`, {
      method,
      headers: {
        'x-api-key': env.cobru.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(env.cobru.timeoutMs),
      redirect: 'error',
    });
    payload = await response.json();
  } catch {
    throw new AppError('Cobru did not return a valid response. Reconcile before retrying payment creation.', 502);
  }
  if (!response.ok) {
    const error = new AppError(`Cobru request failed (HTTP ${response.status}).`, 502);
    error.providerStatus = response.status;
    throw error;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Invalid Cobru response.', 502);
  }
  return payload;
};

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  if (!tokenRequest) {
    tokenRequest = request('/token/refresh/', { method: 'POST', body: { refresh: env.cobru.refreshToken } })
      .then(payload => {
        if (typeof payload.access !== 'string' || !payload.access) throw new AppError('Invalid Cobru access token.', 502);
        cachedToken = payload.access;
        tokenExpiresAt = Date.now() + 50 * 60 * 1000;
        return cachedToken;
      }).finally(() => { tokenRequest = null; });
  }
  return tokenRequest;
};

const authenticatedRequest = async (pathname, options = {}) => {
  assertConfigured();
  try {
    return await request(pathname, { ...options, token: await getAccessToken() });
  } catch (error) {
    // Only retry reads; never automatically repeat creation of a financial object.
    if (error.providerStatus !== 401) throw error;
    cachedToken = null;
    if (options.method === 'POST') throw error;
    return request(pathname, { ...options, token: await getAccessToken() });
  }
};

const createPayment = async ({ paymentId, registrationId, amountCop }) => {
  assertConfigured();
  const callback = new URL(env.cobru.callbackUrl);
  callback.searchParams.set('token', env.cobru.callbackToken);
  callback.searchParams.set('paymentId', String(paymentId));
  const redirect = new URL(env.cobru.returnUrl);
  redirect.searchParams.set('paymentId', String(paymentId));
  const raw = await authenticatedRequest('/cobru/', {
    method: 'POST',
    body: {
      amount: amountCop,
      description: `SYSCON registration ${registrationId} / payment ${paymentId}`,
      expiration_days: env.cobru.expirationDays,
      client_assume_costs: false,
      // Taxes already form part of the locally calculated amount; do not charge twice.
      iva: 0,
      payment_method_enabled: JSON.stringify(env.cobru.paymentMethods),
      payer_redirect_url: redirect.toString(),
      callback: callback.toString(),
    },
  });
  if (!slugPattern.test(raw.url || '') || !/^\d+$/.test(String(raw.pk || '')) ||
      !Number.isFinite(Number(raw.amount)) || Math.abs(Number(raw.amount) - amountCop) > 0.005 ||
      (raw.currency_code && raw.currency_code !== 'COP')) {
    throw new AppError('Cobru returned an invalid identity, amount or currency. Reconcile this payment.', 502);
  }
  // Persist only payment fields, never echoed callback URLs or credential-bearing payloads.
  return {
    pk: String(raw.pk), slug: raw.url,
    paymentUrl: `${env.cobru.baseUrl.replace(/\/$/, '')}/${raw.url}`,
    snapshot: { pk: raw.pk, url: raw.url, amount: raw.amount, state: raw.state, currency_code: raw.currency_code || 'COP' },
  };
};

const consultPayment = (slug) => {
  if (!slugPattern.test(slug || '')) throw new AppError('Invalid Cobru payment slug.', 400);
  return authenticatedRequest(`/cobru_detail/${encodeURIComponent(slug)}`);
};

const verifyCallbackToken = (token) => {
  const expected = env.cobru.callbackToken;
  if (!expected || typeof token !== 'string') return false;
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

module.exports = { assertConfigured, createPayment, consultPayment, verifyCallbackToken };
