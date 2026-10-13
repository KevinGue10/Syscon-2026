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
});
