const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const env = require('../src/config/env');
const models = require('../src/models');
const sequelize = require('../src/config/database');
const cobru = require('../src/services/cobruService');
const createService = require('../src/services/cobruPaymentService');

test('local HTTP is restricted to loopback, development and the Cobru sandbox', t => {
  const original = { ...env.cobru };
  const nodeEnv = env.nodeEnv;
  t.after(() => { Object.assign(env.cobru, original); env.nodeEnv = nodeEnv; });
  env.nodeEnv = 'development';
  Object.assign(env.cobru, { localTestMode: true, baseUrl: 'https://dev.cobru.co',
    apiKey: 'test-key', refreshToken: 'test-refresh', callbackToken: 'test-secret',
    returnUrl: 'http://localhost:5173/payments/success',
    callbackUrl: 'http://localhost:5000/api/payments/cobru/webhook' });
  assert.doesNotThrow(cobru.assertConfigured);
  env.cobru.callbackUrl = 'http://public.example/webhook';
  assert.throws(cobru.assertConfigured, /HTTPS/);
  env.cobru.callbackUrl = 'http://localhost:5000/api/payments/cobru/webhook';
  env.nodeEnv = 'production';
  assert.throws(cobru.assertConfigured, /only allowed in development/);
  env.nodeEnv = 'development';
  env.cobru.baseUrl = 'https://prod.cobru.co';
  assert.throws(cobru.assertConfigured, /only allowed in development/);
  env.cobru.baseUrl = 'https://dev.cobru.co';
  env.cobru.localTestMode = false;
  assert.throws(cobru.assertConfigured, /HTTPS/);
});

test('Cobru authenticated requests, serialized methods, URL, caching and failure handling', async t => {
  Object.assign(env.cobru, { apiKey: 'test-key', refreshToken: 'test-refresh', callbackToken: 'test-secret',
    returnUrl: 'https://site.example/payment-success', callbackUrl: 'https://api.example/api/payments/cobru/webhook' });
  const calls = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('/token/refresh/') ? { access: 'test-access' } :
      { pk: 27150, url: 'slug123', amount: '1950000.00', state: 0, currency_code: 'COP' }), { status: 200 });
  });
  const created = await cobru.createPayment({ paymentId: 7, registrationId: 9, amountCop: 1950000 });
  assert.equal(created.paymentUrl, 'https://dev.cobru.co/slug123');
  assert.deepEqual(JSON.parse(calls[0].options.body), { refresh: 'test-refresh' });
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-access');
  assert.equal(calls[1].options.headers['x-api-key'], 'test-key');
  const body = JSON.parse(calls[1].options.body);
  assert.equal(typeof body.payment_method_enabled, 'string');
  assert.equal(JSON.parse(body.payment_method_enabled).pse, true);
  assert.equal(body.amount, 1950000);
  assert.equal(body.client_assume_costs, false);
  assert.equal(body.iva, 0);
  assert.equal(new URL(body.callback).searchParams.get('paymentId'), '7');
  assert.equal(new URL(body.callback).searchParams.get('token'), 'test-secret');
  assert(!JSON.stringify(created).includes('test-secret'));
  await cobru.consultPayment('slug123');
  assert.equal(calls.length, 3);
  assert(calls[2].url.endsWith('/cobru_detail/slug123'));
  assert(cobru.verifyCallbackToken('test-secret'));
  assert(!cobru.verifyCallbackToken('forged'));
  assert.throws(() => cobru.consultPayment('../evil'), /Invalid.*slug/);
  t.mock.method(global, 'fetch', async () => new Response('{}', { status: 403 }));
  await assert.rejects(cobru.createPayment({ paymentId: 7, registrationId: 9, amountCop: 1950000 }), /HTTP 403/);
  t.mock.method(global, 'fetch', async () => { throw new Error('timeout'); });
  await assert.rejects(cobru.consultPayment('slug123'), /valid response/);
});

test('access-token expiry retries reads once and never automatically repeats creation', async t => {
  let reads = 0, refreshes = 0, creates = 0;
  t.mock.method(global, 'fetch', async (url) => {
    if (url.endsWith('/token/refresh/')) {
      refreshes++;
      return new Response(JSON.stringify({ access: 'renewed-access' }), { status: 200 });
    }
    if (url.endsWith('/cobru/')) { creates++; return new Response('{}', { status: 401 }); }
    reads++;
    return new Response(JSON.stringify(reads === 1 ? {} : { url: 'slug123', amount: 1, state: 0 }), { status: reads === 1 ? 401 : 200 });
  });
  await cobru.consultPayment('slug123');
  assert.equal(reads, 2);
  assert.equal(refreshes, 1);
  await assert.rejects(cobru.createPayment({ paymentId: 7, registrationId: 9, amountCop: 1 }), /HTTP 401/);
  assert.equal(creates, 1);
});

const fixture = t => {
  const registration = { id: 9, userId: 1, pendingAmount: 400, includesTour: false, requiresInvoice: false };
  const payment = { id: 7, registrationId: 9, registration, provider: 'cobru', amountUsd: 400, amountCop: 1560000,
    includesTour: false, includesTax: false, status: 'pending_payment', providerPaymentId: '27150',
    paymentUrl: 'https://dev.cobru.co/slug123', providerResponseJson: { cobruSlug: 'slug123', exchangeRate: 3900 },
    async update(values) { Object.assign(this, values); } };
  let detail = { url: 'slug123', pk: 27150, amount: '1560000.00', state: 3, currency_code: 'COP' };
  let changes = 0, emails = 0, totals = 0, remoteCreates = 0, createdInput;
  t.mock.method(sequelize, 'transaction', async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(models.Payment, 'findOne', async () => payment);
  t.mock.method(models.Payment, 'findByPk', async () => payment);
  t.mock.method(models.Payment, 'update', async () => [1]);
  t.mock.method(models.Registration, 'findByPk', async () => registration);
  t.mock.method(models.DollarRate, 'findOne', async () => ({ id: 2, rate: 3900 }));
  t.mock.method(models.AuditLog, 'create', async () => ({}));
  t.mock.method(cobru, 'assertConfigured', () => {});
  t.mock.method(cobru, 'consultPayment', async () => detail);
  t.mock.method(cobru, 'createPayment', async () => { remoteCreates++; return { pk: '27150', slug: 'slug123', paymentUrl: 'https://dev.cobru.co/slug123', snapshot: {} }; });
  const service = createService({
    assertRegistrationAccess: (r, user) => { if (r.userId !== user.id) throw new Error('access denied'); },
    syncRegistrationPaymentPreferences: async () => {},
    createPaymentRecord: async input => { createdInput = input; Object.assign(payment, input.amounts, { status: input.status, providerResponseJson: input.providerResponseJson }); return payment; },
    updatePaymentStatus: async ({ payment: p, status, providerResponseJson, transaction }) => {
      assert(transaction);
      const didChange = p.status !== status;
      Object.assign(p, { status, providerResponseJson });
      if (didChange) changes++;
      return { payment: p, didChange };
    },
    buildPaymentResponse: async p => ({ payment: p }),
    calculateRegistrationTotals: async (_, { transaction }) => { assert(transaction); totals++; },
    maybeSendApprovalEmail: async () => { emails++; },
  });
  return { service, payment, registration, setDetail: value => { detail = value; },
    stats: () => ({ changes, emails, totals, remoteCreates, createdInput }) };
};

test('verified callbacks are idempotent, ignore forged states and handle refunds', async t => {
  const f = fixture(t);
  const callback = { query: { token: 'test-secret', paymentId: '7' }, body: { state: 3 } };
  f.setDetail({ url: 'slug123', amount: 1560000, state: 0 });
  await f.service.handleCobruWebhook(callback);
  assert.equal(f.payment.status, 'pending_payment');
  f.setDetail({ url: 'slug123', amount: 1560000, state: 3 });
  await f.service.handleCobruWebhook(callback);
  await f.service.handleCobruWebhook(callback);
  assert.equal(f.payment.status, 'approved');
  assert.equal(f.stats().changes, 1);
  assert.equal(f.stats().emails, 1);
  f.setDetail({ url: 'slug123', amount: 1560000, state: 1 });
  await f.service.handleCobruWebhook(callback);
  assert.equal(f.payment.status, 'approved');
  f.setDetail({ url: 'slug123', amount: 1560000, state: 4 });
  await f.service.handleCobruWebhook(callback);
  assert.equal(f.payment.status, 'refunded');
  assert.equal(f.stats().totals, 2);
  f.setDetail({ url: 'slug123', amount: 1560000, state: 3 });
  await f.service.handleCobruWebhook(callback);
  assert.equal(f.payment.status, 'refunded');
  await assert.rejects(f.service.handleCobruWebhook({ ...callback, query: { ...callback.query, token: 'forged' } }), /Invalid.*token/);
});

test('reconciliation rejects mismatched amounts, identities, currency and unknown states', async t => {
  const f = fixture(t);
  for (const override of [{ amount: 1 }, { url: 'other' }, { pk: 1 }, { currency_code: 'USD' }, { state: 99 }]) {
    f.setDetail({ url: 'slug123', pk: 27150, amount: 1560000, state: 3, currency_code: 'COP', ...override });
    await assert.rejects(f.service.refreshCobruPayment(7, { id: 1 }));
  }
  await assert.rejects(f.service.refreshCobruPayment(7, { id: 2 }), /access denied/);
  assert.equal(f.stats().changes, 0);
});

test('creation derives amounts from balance, reuses checkout and blocks uncertain retries', async t => {
  const f = fixture(t);
  t.mock.method(models.Payment, 'findOne', async () => null);
  f.payment.paymentUrl = null;
  await f.service.createCobruPayment({ registrationId: 9, amountUsd: 1, amountCop: 1 }, { id: 1 });
  assert.equal(f.stats().createdInput.amounts.amountUsd, 400);
  assert.equal(f.stats().createdInput.amounts.amountCop, 1560000);
  assert.equal(f.stats().remoteCreates, 1);
  t.mock.method(models.Payment, 'findOne', async () => f.payment);
  await f.service.createCobruPayment({ registrationId: 9 }, { id: 1 });
  assert.equal(f.stats().remoteCreates, 1);
  f.payment.paymentUrl = null;
  f.payment.status = 'pending_link';
  t.mock.method(models.Payment, 'update', async () => [0]);
  await assert.rejects(f.service.createCobruPayment({ registrationId: 9 }, { id: 1 }), /reconciliation/);
  assert.equal(f.stats().remoteCreates, 1);
});

test('creation rejects missing rates and user-supplied amounts at the API boundary', async t => {
  const f = fixture(t);
  t.mock.method(models.Payment, 'findOne', async () => null);
  t.mock.method(models.DollarRate, 'findOne', async () => null);
  await assert.rejects(f.service.createCobruPayment({ registrationId: 9 }, { id: 1 }), /valid USD\/COP rate/);
  const { cobruCreatePaymentValidation } = require('../src/validations/paymentValidations');
  const req = { body: { registrationId: 9, amountUsd: 1 } };
  for (const validation of cobruCreatePaymentValidation) await validation.run(req);
  assert(!validationResult(req).isEmpty());
  const valid = { body: { registrationId: 9 } };
  for (const validation of cobruCreatePaymentValidation) await validation.run(valid);
  assert(validationResult(valid).isEmpty());
});

test('rejected and expired Cobru states update local status without crediting balance', async t => {
  const f = fixture(t);
  for (const [state, expected] of [[2, 'rejected'], [5, 'cancelled']]) {
    f.setDetail({ url: 'slug123', amount: 1560000, state });
    await f.service.refreshCobruPayment(7, { id: 1 });
    assert.equal(f.payment.status, expected);
  }
  assert.equal(f.stats().emails, 0);
});

test('failed remote creation retains the reservation and prevents another charge', async t => {
  const f = fixture(t);
  f.payment.paymentUrl = null;
  f.payment.status = 'pending_link';
  let claims = 0, attempts = 0;
  t.mock.method(models.Payment, 'update', async () => [claims++ === 0 ? 1 : 0]);
  t.mock.method(cobru, 'createPayment', async () => { attempts++; throw new Error('timeout'); });
  await assert.rejects(f.service.createCobruPayment({ registrationId: 9 }, { id: 1 }), /timeout/);
  assert.equal(f.payment.status, 'pending_link');
  await assert.rejects(f.service.createCobruPayment({ registrationId: 9 }, { id: 1 }), /reconciliation/);
  assert.equal(attempts, 1);
});
