const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');
const pricing = require('../src/services/pricingService');
const { Op } = require('sequelize');

test('a new bank transfer uses the latest eligible rate and does not reuse an older COP quote', async t => {
  const registration = { id: 1, userId: 7, pendingAmount: 595 };
  const oldPayment = { id: 5, amountUsd: 595, amountCop: 1900691.8 };
  let currentRate = 3218.75;
  let created;
  const wrap = values => ({ ...values, toJSON() { return { ...values }; } });
  t.mock.method(models.Registration, 'findByPk', async () => registration);
  t.mock.method(models.DollarRate, 'findOne', async options => {
    assert.deepEqual(options.order, [['effectiveDate', 'DESC'], ['id', 'DESC']]);
    assert(options.where.effectiveDate[Op.lte] instanceof Date);
    return { id: 21, rate: currentRate };
  });
  t.mock.method(models.Payment, 'findOne', async ({ where }) =>
    where.amountCop === oldPayment.amountCop ? wrap(oldPayment) : null);
  t.mock.method(models.Payment, 'create', async values => {
    created = wrap({ id: 6, ...values });
    return created;
  });
  t.mock.method(models.Payment, 'findByPk', async id => id === 5 ? wrap(oldPayment) : created);
  t.mock.method(models.AuditLog, 'create', async () => ({}));
  t.mock.method(models.PaymentStatusHistory, 'create', async () => ({}));
  t.mock.method(pricing, 'calculateRegistrationTotals', async () => ({ registration, breakdown: {} }));
  const modulePath = require.resolve('../src/services/paymentService');
  delete require.cache[modulePath];
  t.after(() => { delete require.cache[modulePath]; });
  const service = require(modulePath);
  const payload = { registrationId: 1, currency: 'USD', amountUsd: 595 };
  const result = await service.createBankTransferPayment(payload, { id: 7, role: 'user' });
  assert.equal(result.payment.id, 6);
  assert.equal(result.payment.amountCop, 1915156.25);
  assert.equal(oldPayment.amountCop, 1900691.8);

  // Identical conversion still reuses the existing payment instead of duplicating it.
  currentRate = 3194.44;
  const reused = await service.createBankTransferPayment(payload, { id: 7, role: 'user' });
  assert.equal(reused.payment.id, 5);
});
