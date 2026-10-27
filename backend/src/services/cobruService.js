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
  if (env.cobru.localTestMode &&
      (env.nodeEnv !== 'development' || env.cobru.baseUrl.replace(/\/$/, '') !== 'https://dev.cobru.co')) {
    throw new AppError('COBRU_LOCAL_TEST_MODE is only allowed in development with the Cobru sandbox.', 503);
  }
  for (const [kind, value] of Object.entries({ api: env.cobru.baseUrl, return: env.cobru.returnUrl, callback: env.cobru.callbackUrl })) {
    let url;
    try { url = new URL(value); } catch { throw new AppError('Configure valid Cobru API, return and callback URLs.', 503); }
    const localHttp = env.cobru.localTestMode && kind !== 'api' &&
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
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
    // Keep provider validation diagnostics server-side; never log request bodies
    // or credential-bearing callback URLs echoed by the provider.
    const redact = value => {
      let result = String(value);
      for (const secret of [env.cobru.apiKey, env.cobru.refreshToken, env.cobru.callbackToken, token, body?.description]) {
        if (secret) result = result.split(secret).join('[redacted]');
      }
      return result.replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').slice(0, 500);
    };
    const allowedFields = ['detail', 'message', 'error', 'code', 'non_field_errors',
      'amount', 'description', 'expiration_days', 'client_assume_costs', 'iva',
      'payment_method_enabled', 'payer_redirect_url', 'callback', 'refresh'];
    const providerErrors = {};
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      for (const field of allowedFields) {
        const value = payload[field];
        if (typeof value === 'string') providerErrors[field] = redact(value);
        else if (Array.isArray(value)) providerErrors[field] = value.filter(item => typeof item === 'string').slice(0, 5).map(redact);
      }
    }
    console.error('[COBRU ERROR]', { endpoint: pathname, status: response.status,
      ...(pathname === '/cobru/' ? { amountCop: body?.amount } : {}), providerErrors });
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

const createPayment = async ({ paymentId, registrationId, amountCop, participantName }) => {
  assertConfigured();
  if (!Number.isSafeInteger(amountCop) || amountCop <= 0) {
    throw new AppError('Cobru requires a positive integer amount in COP. Reconcile existing fractional payment quotes before retrying.', 409);
  }
  const callback = new URL(env.cobru.callbackUrl);
  callback.searchParams.set('token', env.cobru.callbackToken);
  callback.searchParams.set('paymentId', String(paymentId));
  const redirect = new URL(env.cobru.returnUrl);
  redirect.searchParams.set('paymentId', String(paymentId));
  const raw = await authenticatedRequest('/cobru/', {
    method: 'POST',
    body: {
      amount: amountCop,
      description: `SYSCON LATAM 2026 - ${String(participantName || '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Conference registration'}`,
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
