const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');
const sequelize = require('../src/config/database');
const { quoteAdjustment, processAdjustment } = require('../src/services/ivaAdjustmentService');
const pricing = require('../src/services/pricingService');

const original = () => ({ id: 1, userId: 2, totalAmount: 350, paidAmount: 350, pendingAmount: 0, requiresInvoice: false });
const paid = () => [{ id: 7, status: 'approved', amountUsd: 350, provider: 'manual_bank_transfer', includesTax: false }];
const confirmation = { expectedBaseAmount: 350, expectedTaxAmount: 66.5, reason: 'Participant requested invoice' };
const adjustment = { id: 'iva-1', baseAmount: 350, taxRate: 0.19, taxAmount: 66.5, totalAmount: 416.5, originalPaymentIds: [7] };

test('IVA quote uses original paid total, rounds cents and does not mutate original payments', () => {
  const payments = paid();
  assert.deepEqual(quoteAdjustment(original(), payments), {
    baseAmount: 350, taxRate: 0.19, taxAmount: 66.5, totalAmount: 416.5, originalPaymentIds: [7],
  });
  assert.equal(payments[0].amountUsd, 350);
  assert.equal(payments[0].includesTax, false);
  assert.equal(quoteAdjustment({ ...original(), totalAmount: 350.03 }, [{ ...payments[0], amountUsd: 350.03 }]).taxAmount, 66.51);
});

test('IVA rejects ambiguous balances, coupons, existing taxes and active payments', () => {
  for (const [registration, payments] of [
    [{ ...original(), ivaAdjustment: adjustment }, paid()],
    [{ ...original(), requiresInvoice: true }, paid()],
    [{ ...original(), pendingAmount: 1 }, paid()],
    [original(), [{ ...paid()[0], amountUsd: 300 }]],
    [original(), [{ ...paid()[0], provider: 'coupon' }]],
    [original(), [{ ...paid()[0], includesTax: true }]],
    ...['pending', 'pending_link', 'pending_payment', 'pending_validation'].map(status => [original(), [...paid(), { status }]]),
  ]) assert.throws(() => quoteAdjustment(registration, payments));
});

test('admin preview is read only; confirmed adjustment and audit share the locked transaction; duplicates fail', async t => {
  const reg = original();
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let updates = 0, audit = 0;
  reg.update = async (values, options) => { assert.equal(options.transaction, transaction); updates++; Object.assign(reg, values); };
  t.mock.method(sequelize, 'transaction', async callback => callback(transaction));
  t.mock.method(models.Registration, 'findByPk', async (_, options) => {
    assert.equal(options.lock, 'UPDATE'); assert.equal(options.transaction, transaction); return reg;
  });
  t.mock.method(models.Payment, 'findAll', async () => paid());
  t.mock.method(models.AuditLog, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction); assert.equal(values.action, 'add-iva-adjustment'); audit++;
  });
  await assert.rejects(processAdjustment(1, { id: 2, role: 'user' }), /Admin/);
  const preview = await processAdjustment(1, { id: 9, role: 'admin' });
  assert.equal(preview.quote.taxAmount, 66.5); assert.equal(updates, 0);
  await assert.rejects(processAdjustment(1, { id: 9, role: 'admin' }, { ...confirmation, expectedTaxAmount: 60 }), /amounts changed/);
  assert.equal(updates, 0);
  await processAdjustment(1, { id: 9, role: 'admin' }, confirmation);
  assert.equal(reg.totalAmount, 416.5); assert.equal(reg.pendingAmount, 66.5);
  assert.equal(reg.paidAmount, 350); assert.equal(reg.paymentStatus, 'partial');
  assert.equal(reg.ivaAdjustment.createdBy, 9); assert.equal(audit, 1);
  await assert.rejects(processAdjustment(1, { id: 9, role: 'admin' }, confirmation), /already exists/);
  assert.equal(updates, 1);
});

test('frozen IVA survives missing tariffs, partial payments, repeated recalculation and full settlement', async t => {
  const reg = { ...original(), ivaAdjustment: adjustment, requiresInvoice: true, totalAmount: 416.5,
    papers: [{ pages: 6, update() { throw new Error('Do not rewrite original paper charges'); } }], payments: paid(),
    async update(values) { Object.assign(this, values); } };
  t.mock.method(models.Registration, 'findByPk', async () => reg);
  t.mock.method(models.PricingRule, 'findAll', async () => { throw new Error('Do not reprice the original registration'); });
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let result = await pricing.calculateRegistrationTotals(1, { transaction });
  assert.equal(result.breakdown.pendingAmount, 66.5);
  reg.payments.push({ amountUsd: 20, status: 'approved' });
  result = await pricing.calculateRegistrationTotals(1, { transaction });
  assert.equal(result.breakdown.pendingAmount, 46.5);
  assert.equal(result.breakdown.invoiceTaxAmount, 66.5);
  const preview = await pricing.previewRegistrationTotals({ requiresInvoice: false }, { registration: reg });
  assert.equal(preview.breakdown.totalAmount, 416.5);
  reg.payments.push({ amountUsd: 46.5, status: 'approved' });
  for (let n = 0; n < 2; n++) {
    result = await pricing.calculateRegistrationTotals(1, { transaction });
    assert.equal(result.breakdown.totalAmount, 416.5);
    assert.equal(result.breakdown.pendingAmount, 0);
    assert.equal(result.breakdown.paymentStatus, 'paid');
  }
});

test('confirmed IVA prevents changing pricing, disabling IVA or adding/removing papers', async t => {
  const reg = { ...original(), ivaAdjustment: adjustment, requiresInvoice: true, participationType: 'author',
    isIeeeMember: true, memberType: 'professional', eventEditionId: 1 };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(models.Registration, 'findByPk', async () => reg);
  t.mock.method(models.Paper, 'findByPk', async () => ({ registration: reg, registrationId: 1 }));
  const service = require('../src/services/registrationService');
  const user = { id: 2, role: 'user', active: true };
  for (const payload of [{ requiresInvoice: false }, { includesTaxes: false }, { participationType: 'attendee' }, { eventEditionId: 2 }]) {
    await assert.rejects(service.updateRegistration(1, payload, user, { transaction }), /locked/);
  }
  await assert.rejects(service.addPaperToRegistration(1, { pages: 6 }, user, { transaction }), /Papers are locked/);
  await assert.rejects(service.removePaper(7, user, { transaction }), /Papers are locked/);
});

test('concurrent IVA confirmations create only one adjustment under the registration lock', async t => {
  const reg = original();
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let queue = Promise.resolve();
  let writes = 0;
  // Simulate the registration row lock while exercising the real confirmation checks.
  t.mock.method(sequelize, 'transaction', callback => {
    const result = queue.then(() => callback(transaction));
    queue = result.catch(() => {});
    return result;
  });
  t.mock.method(models.Registration, 'findByPk', async () => reg);
  t.mock.method(models.Payment, 'findAll', async () => paid());
  t.mock.method(models.AuditLog, 'create', async () => ({}));
  reg.update = async values => { writes++; Object.assign(reg, values); };
  const results = await Promise.allSettled([1, 2].map(() => processAdjustment(1, { id: 9, role: 'admin' }, confirmation)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(writes, 1);
  assert.equal(reg.totalAmount, 416.5);
});

test('new IVA bank payment stores all USD as tax, references the adjustment and ignores client COP and tax amounts', async t => {
  const reg = { ...original(), ivaAdjustment: adjustment, requiresInvoice: true, pendingAmount: 66.5 };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let created;
  t.mock.method(sequelize, 'transaction', async cb => cb(transaction));
  t.mock.method(models.Registration, 'findByPk', async () => reg);
  t.mock.method(models.DollarRate, 'findOne', async () => ({ rate: 4000 }));
  t.mock.method(models.Payment, 'findOne', async () => null);
  t.mock.method(models.Payment, 'findAll', async () => paid());
  t.mock.method(models.Payment, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction);
    created = { ...values, id: 8, toJSON: () => ({ ...values, id: 8 }),
      async update(changes) { Object.assign(this, changes); } }; return created;
  });
  t.mock.method(models.Payment, 'findByPk', async () => created);
  for (const model of [models.AuditLog, models.PaymentStatusHistory]) t.mock.method(model, 'create', async () => ({}));
  t.mock.method(pricing, 'calculateRegistrationTotals', async () => ({ registration: reg, breakdown: {} }));
  const modulePath = require.resolve('../src/services/paymentService');
  delete require.cache[modulePath];
  t.after(() => { delete require.cache[modulePath]; });
  const service = require(modulePath);
  const payload = { registrationId: 1, currency: 'USD', amountUsd: 66.5, amountCop: 1, taxAmount: 1 };
  const result = await service.createBankTransferPayment(payload, { id: 2, role: 'user' });
  assert.equal(result.payment.amountUsd, 66.5); assert.equal(result.payment.amountCop, 266000);
  assert.equal(result.payment.taxAmount, 66.5); assert.equal(result.payment.includesTax, true);
  assert.equal(result.payment.providerResponseJson.purpose, 'iva_adjustment');
  assert.equal(result.payment.providerResponseJson.adjustmentId, 'iva-1');
  await assert.rejects(service.createBankTransferPayment({ ...payload, amountUsd: 67 }, { id: 2 }), /cannot exceed/);
  await assert.rejects(service.previewCoupon({ registrationId: 1, code: 'X' }, { id: 2 }), /Coupons cannot/);

  const cobru = require('../src/services/cobruService');
  t.mock.method(cobru, 'assertConfigured', () => {});
  t.mock.method(cobru, 'createPayment', async input => {
    assert.equal(input.amountCop, 266000);
    return { pk: '99', slug: 'iva-checkout', paymentUrl: 'https://dev.cobru.co/iva-checkout', snapshot: {} };
  });
  t.mock.method(models.User, 'findByPk', async () => ({ firstName: 'Test', lastName: 'User' }));
  t.mock.method(models.Payment, 'update', async () => [1]);
  const checkout = await service.createCobruPayment({ registrationId: 1 }, { id: 2, role: 'user' });
  assert.equal(checkout.payment.amountUsd, 66.5);
  assert.equal(checkout.payment.taxAmount, 66.5);
  assert.equal(checkout.payment.providerResponseJson.adjustmentId, 'iva-1');

  t.mock.method(models.Payment, 'findAll', async () => []);
  await assert.rejects(service.createBankTransferPayment(payload, { id: 2 }), /accounting review/);
});
