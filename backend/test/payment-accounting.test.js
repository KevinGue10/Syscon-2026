const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');
const { approvedPaymentAccounting, cashPaymentWhere, approvedPaymentTotals } = require('../src/utils/paymentAccounting');

test('USD 50 discount is not cash before or after USD 350 is received', () => {
  const coupon = { status: 'approved', provider: 'coupon', amountUsd: 50 };
  const payment = { status: 'pending_payment', provider: 'cobru', amountUsd: 350 };
  assert.deepEqual(approvedPaymentAccounting([coupon, payment]), { cashPaidUsd: 0, discountUsd: 50 });
  assert.deepEqual(approvedPaymentAccounting([coupon, { ...payment, status: 'approved' }]), { cashPaidUsd: 350, discountUsd: 50 });
  assert.deepEqual(approvedPaymentAccounting([{ ...coupon, provider: null, paymentMethod: 'coupon' }]), { cashPaidUsd: 0, discountUsd: 50 });
});

test('CSV and review totals sum approved payments at their stored exchange rates, excluding coupons and other states', async () => {
  const payments = [
    { id: 139, status: 'approved', provider: 'cobru', amountUsd: '1500.00', amountCop: '5438860.00' },
    { id: 138, status: 'approved', provider: 'cobru', amountUsd: '350.00', amountCop: '1278286.50' },
    { status: 'approved', provider: 'coupon', amountUsd: 50, amountCop: 180000 },
    ...['pending_payment', 'pending_validation', 'cancelled', 'refunded', 'rejected'].map(status => ({ status, amountUsd: 100, amountCop: 400000 })),
  ];
  assert.deepEqual(approvedPaymentTotals(payments), { amountUsd: 1850, amountCop: 6717146.5, count: 2, missingCopCount: 0 });
  const frontend = await import('../../frontend/src/utils/paymentAccounting.js');
  assert.equal(frontend.paymentAccounting(payments).cashPaidCop, 6717146.5);
  assert.equal(frontend.paymentAccounting(payments).cashPaidUsd, 1850);
  assert(frontend.formatApprovedMoneyReceived(payments).includes('6,717,146.50'));
  payments[0].amountCop = null;
  assert.equal(approvedPaymentTotals(payments).amountCop, null, 'Never present an incomplete COP sum as the total');
  assert.equal(approvedPaymentTotals(payments).missingCopCount, 1);
  assert.equal(frontend.paymentAccounting(payments).cashPaidCop, null);
});

test('both dashboard revenue totals and financial export exclude coupon payments', async t => {
  const exportPath = require.resolve('../src/services/exportService');
  const previous = require.cache[exportPath];
  let workbook;
  require.cache[exportPath] = { id: exportPath, filename: exportPath, loaded: true,
    exports: { buildWorkbook: async data => { workbook = data; return Buffer.from('test'); } } };
  const modulePath = require.resolve('../src/controllers/adminController');
  delete require.cache[modulePath];
  const controller = require(modulePath);
  t.after(() => {
    if (previous) require.cache[exportPath] = previous; else delete require.cache[exportPath];
    delete require.cache[modulePath];
  });
  t.mock.method(models.User, 'count', async () => 1);
  t.mock.method(models.Registration, 'count', async () => 1);
  const balances = [{ active: true, pendingAmount: 350 }, { active: false, pendingAmount: 900 }];
  t.mock.method(models.Registration, 'sum', async (field, options) => {
    assert.equal(field, 'pendingAmount');
    assert.deepEqual(options.include, [{ association: 'user', attributes: [], required: true, where: { active: true } }]);
    return balances.filter(row => row.active).reduce((sum, row) => sum + row.pendingAmount, 0) || null;
  });
  t.mock.method(models.Registration, 'findAll', async () => []);
  t.mock.method(models.Paper, 'count', async () => 0);
  let revenueCalls = 0;
  t.mock.method(models.Payment, 'sum', async (field, options) => {
    assert.equal(field, 'amountUsd');
    assert.deepEqual(options.where, cashPaymentWhere({ status: 'approved' }));
    revenueCalls++;
    return 350;
  });
  let response;
  const res = { status() { return this; }, json(data) { response = data; }, setHeader() {}, send() {} };
  const next = error => { throw error; };
  await controller.getDashboard({}, res, next);
  assert.equal(revenueCalls, 2);
  assert.equal(response.data.metrics.approvedPaymentsTotal, 350);
  assert.equal(response.data.summary.revenueCollected, 350);
  assert.equal(response.data.summary.pendingBalances, 350);
  balances[0].active = false;
  await controller.getDashboardSummary({}, res, next);
  assert.equal(response.data.summary.pendingBalances, 0);
  balances[0].active = true;
  await controller.getDashboardSummary({}, res, next);
  assert.equal(response.data.summary.pendingBalances, 350);
  t.mock.method(models.Payment, 'findAll', async options => {
    assert.deepEqual(options.where, cashPaymentWhere());
    return [];
  });
  await controller.exportPayments({}, res, next);
  assert.deepEqual(workbook.rows, []);
});
