const { test } = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/models');
const pricing = require('../src/services/pricingService');
const email = require('../src/services/emailService');
const { createAuditLog } = require('../src/services/auditService');

test('editing keeps audit on the same connection and dispatches email only after commit', async t => {
  let afterCommit;
  let sent = 0;
  const transaction = { afterCommit(callback) { afterCommit = callback; } };
  const user = { id: 1, role: 'user', active: true };
  const registration = { id: 1, userId: 1, eventEditionId: 1, pendingAmount: 350,
    membershipNumber: '123', toJSON() { return { id: this.id }; },
    async update(values, options) { assert.equal(options.transaction, transaction); Object.assign(this, values); } };
  t.mock.method(models.Registration, 'findByPk', async (_, options) => {
    assert.equal(options.transaction, transaction); return registration;
  });
  t.mock.method(models.User, 'findByPk', async (_, options) => {
    assert.equal(options.transaction, transaction); return user;
  });
  t.mock.method(models.AuditLog, 'create', async (values, options) => {
    // A separate connection would wait on the edited user's foreign-key lock.
    assert.equal(options.transaction, transaction);
    assert.equal(values.userId, 1);
  });
  t.mock.method(pricing, 'calculateRegistrationTotals', async (_, options) => {
    assert.equal(options.transaction, transaction);
    return { registration, breakdown: { totalAmount: 350 } };
  });
  t.mock.method(email, 'sendPendingPaymentReminderEmail', async () => { sent++; });
  const modulePath = require.resolve('../src/services/registrationService');
  delete require.cache[modulePath];
  t.after(() => { delete require.cache[modulePath]; });
  const service = require(modulePath);
  const result = await service.updateRegistration(1, { isIeeeMember: true }, user, { transaction });
  assert.equal(result.registration, registration);
  assert.equal(sent, 0);
  assert.equal(typeof afterCommit, 'function');
  afterCommit();
  await Promise.resolve();
  assert.equal(sent, 1);
});

test('audit errors inside a transaction propagate so the edit can roll back', async t => {
  const transaction = {};
  t.mock.method(models.AuditLog, 'create', async (_, options) => {
    assert.equal(options.transaction, transaction);
    throw new Error('database write failed');
  });
  await assert.rejects(createAuditLog({ userId: 1, action: 'update', entity: 'registration', entityId: 1 }, { transaction }), /database write failed/);
});
