const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');

test('admin user list includes latest registration membership and attendance, even without payments', async t => {
  // Spreadsheet exports are unrelated to the user-list endpoint.
  const exportPath = require.resolve('../src/services/exportService');
  const previousExport = require.cache[exportPath];
  require.cache[exportPath] = { id: exportPath, filename: exportPath, loaded: true, exports: {} };
  const { listUsers } = require('../src/controllers/adminController');
  t.after(() => {
    if (previousExport) require.cache[exportPath] = previousExport;
    else delete require.cache[exportPath];
    delete require.cache[require.resolve('../src/controllers/adminController')];
  });
  const registration = {
    id: 10, isIeeeMember: true, membershipNumber: '12345678', attendanceType: 'in_person',
  };
  t.mock.method(models.User, 'findAll', async options => {
    const association = options.include.find(item => item.association === 'registrations');
    assert(association, 'The list must load registrations instead of defaulting IEEE membership to false');
    assert.equal(association.required, false);
    assert.equal(association.separate, true);
    assert.deepEqual(association.order, [['createdAt', 'DESC'], ['id', 'DESC']]);
    assert(options.attributes.exclude.includes('passwordHash'));
    return [
      { id: 6, toJSON: () => ({ id: 6, registrations: [registration] }) },
      { id: 7, toJSON: () => ({ id: 7, registrations: [] }) },
    ];
  });
  t.mock.method(models.Payment, 'findAll', async () => []);
  let response;
  const res = { status(code) { assert.equal(code, 200); return this; }, json(body) { response = body; } };
  await listUsers({ query: {} }, res, error => { throw error; });
  const [member, unregistered] = response.data.users;
  assert.equal(member.registrations[0].isIeeeMember, true);
  assert.equal(member.registrations[0].membershipNumber, '12345678');
  assert.equal(member.registrations[0].attendanceType, 'in_person');
  assert.equal(member.latestPaymentStatus, null);
  assert.deepEqual(unregistered.registrations, []);

  const approved = { id: 1, status: 'approved', createdAt: '2026-11-01T12:00:00Z',
    amountUsd: 350, amountCop: 1100000, includesTax: true, registration: { userId: 6 } };
  t.mock.method(models.Payment, 'findAll', async () => [
    { id: 2, status: 'pending_payment', createdAt: '2026-11-16T12:00:00Z', registration: { userId: 6 } },
    approved,
  ]);
  await listUsers({ query: {} }, res, error => { throw error; });
  assert.equal(response.data.users[0].latestPaymentStatus, 'approved');
  assert.equal(response.data.users[0].exportPayment.id, approved.id);
  assert.equal(response.data.users[0].exportPayment.amountUsd, 350);
  assert.equal(response.data.users[0].exportPayment.includesTax, true);
  assert.equal(response.data.users[1].latestPaymentStatus, null);
  approved.includesTax = false;
  await listUsers({ query: {} }, res, error => { throw error; });
  assert.equal(response.data.users[0].exportPayment.includesTax, false);
  t.mock.method(models.Payment, 'findAll', async () => [
    { id: 107, status: 'approved', provider: 'coupon', amountUsd: 50, registration: { userId: 6 } },
    { id: 108, status: 'pending_payment', provider: 'cobru', amountUsd: 350, registration: { userId: 6 } },
  ]);
  await listUsers({ query: {} }, res, error => { throw error; });
  assert.equal(response.data.users[0].latestPaymentStatus, 'pending_payment');
  assert.equal(response.data.users[0].exportPayment.id, 108);
  assert.equal(response.data.users[0].couponDiscountUsd, 50);
  t.mock.method(models.Payment, 'findAll', async () => [
    { id: 139, status: 'approved', provider: 'cobru', amountUsd: '1500.00', amountCop: '5438860.00', registration: { userId: 6 } },
    { id: 138, status: 'approved', provider: 'cobru', amountUsd: '350.00', amountCop: '1278286.50', registration: { userId: 6 } },
    { id: 137, status: 'approved', provider: 'coupon', amountUsd: '50.00', amountCop: '180000.00', registration: { userId: 6 } },
  ]);
  await listUsers({ query: {} }, res, error => { throw error; });
  assert.deepEqual(response.data.users[0].approvedPaymentTotals, { amountUsd: 1850, amountCop: 6717146.5, count: 2, missingCopCount: 0 });
  assert.equal(response.data.users[0].couponDiscountUsd, 50);
});
