const { test } = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../src/models');
const email = require('../src/services/emailService');
const bcrypt = require('bcrypt');

test('SMTP failures never replace the existing password', async t => {
  let updates = 0;
  const user = { id: 1, active: true, async update() { updates++; } };
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(bcrypt, 'hash', async () => 'new-hash');
  for (const result of [{ skipped: true }, { error: 'SMTP authentication failed' }]) {
    t.mock.method(email, 'sendPasswordResetEmail', async () => result);
    const filename = require.resolve('../src/controllers/authController');
    delete require.cache[filename];
    const { forgotPassword } = require(filename);
    const error = await new Promise(resolve => forgotPassword({ body: { email: 'user@example.test' } }, {}, resolve));
    assert.equal(error.statusCode, 503);
    assert.equal(updates, 0);
    delete require.cache[filename];
  }
});
