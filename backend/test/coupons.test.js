const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');
const sequelize = require('../src/config/database');
const pricing = require('../src/services/pricingService');

test('coupon previews support fixed USD, percentages, balance cap and invalid values', async t => {
  let coupon = { code: 'USD50', discountType: 'fixed', fixedAmountUsd: 50, percentage: 0 };
  const registration = { id: 1, userId: 7, pendingAmount: 350 };
  t.mock.method(models.Registration, 'findByPk', async () => registration);
  t.mock.method(models.Coupon, 'findOne', async () => coupon);
  const service = require('../src/services/paymentService');
  const preview = () => service.previewCoupon({ registrationId: 1, code: 'USD50', baseAmount: 99999 }, { id: 7, role: 'user' });
  assert.equal((await preview()).couponPreview.finalAmount, 300);
  registration.pendingAmount = 30;
  assert.equal((await preview()).couponPreview.discountAmount, 30);
  assert.equal((await preview()).couponPreview.finalAmount, 0);
  coupon = { code: 'PERCENT', percentage: 10 };
  assert.equal((await preview()).couponPreview.discountAmount, 3);
  coupon = { code: 'INVALID', discountType: 'fixed', fixedAmountUsd: -50 };
  await assert.rejects(preview(), /Invalid coupon/);
});

test('partial coupon redemption records USD 50 once on the same transaction', async t => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const registration = { id: 1, userId: 7, pendingAmount: 350 };
  let created;
  let hasRedemption = false;
  t.mock.method(sequelize, 'transaction', async callback => callback(transaction));
  t.mock.method(models.Registration, 'findByPk', async (_, options) => {
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, 'UPDATE');
    return registration;
  });
  t.mock.method(models.Coupon, 'findOne', async () => ({ code: 'USD50', discountType: 'fixed', fixedAmountUsd: 50 }));
  t.mock.method(models.DollarRate, 'findOne', async () => null);
  t.mock.method(models.Payment, 'findOne', async ({ where }) => where.provider === 'coupon' && hasRedemption ? created : null);
  t.mock.method(models.Payment, 'create', async (values, options) => {
    assert.equal(options.transaction, transaction);
    created = { ...values, id: 10, toJSON: () => ({ ...values, id: 10 }) };
    hasRedemption = true;
    return created;
  });
  t.mock.method(models.Payment, 'findByPk', async () => created);
  for (const model of [models.AuditLog, models.PaymentStatusHistory]) {
    t.mock.method(model, 'create', async (_, options) => { assert.equal(options.transaction, transaction); });
  }
  t.mock.method(pricing, 'calculateRegistrationTotals', async () => ({ registration: { pendingAmount: 300 }, breakdown: { pendingAmount: 300 } }));
  const modulePath = require.resolve('../src/services/paymentService');
  delete require.cache[modulePath];
  const service = require(modulePath);
  t.after(() => { delete require.cache[modulePath]; });
  const redeem = () => service.redeemCoupon({ registrationId: 1, code: 'USD50', baseAmount: 99999 }, { id: 7, role: 'user' });
  const result = await redeem();
  assert.equal(created.amountUsd, 50);
  assert.equal(created.status, 'approved');
  assert.equal(result.registration.pendingAmount, 300);
  assert.equal(result.couponRedemption.fixedAmountUsd, 50);
  await assert.rejects(redeem(), /already been redeemed/);
});
