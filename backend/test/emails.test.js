const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSysconEmail } = require('../src/templates/emails/sysconEmailLayout');
const { buildPasswordResetTemplate } = require('../src/templates/emails/passwordResetTemplate');
const { buildPaymentApprovedTemplate } = require('../src/templates/emails/paymentApprovedTemplate');
const { buildPayPhoneLinkTemplate } = require('../src/templates/emails/payPhoneLinkTemplate');
const { buildWelcomeTemplate } = require('../src/templates/emails/welcomeTemplate');
const { buildRegistrationConfirmationTemplate, buildPaperRegistrationTemplate, buildPendingPaymentReminderTemplate } = require('../src/templates/emails/notificationTemplates');

test('all seven email templates use English in HTML and plain text', () => {
  const builders = [buildWelcomeTemplate, buildPasswordResetTemplate, buildPaymentApprovedTemplate, buildPayPhoneLinkTemplate, buildRegistrationConfirmationTemplate, buildPaperRegistrationTemplate, buildPendingPaymentReminderTemplate];
  for (const build of builders) {
    const email = build({ firstName: 'Alex', registration: { id: 1, status: 'submitted', pendingAmount: 100 }, paper: { title: 'Systems', paperCode: 'ART-1' }, amountUsd: 100, appBaseUrl: 'https://ieeeconference2026.org', paymentLink: 'https://example.com/pay' });
    assert.ok(email.html.includes('lang="en"'));
    assert.ok(email.html.includes('Hello'));
    assert.ok(email.text.includes('Hello'));
    assert.ok(!/Hola|Contraseña|Inscripción|Si el botón|Mensaje automático/.test(email.html + email.text + email.subject));
  }
});
test('email layout escapes participant data and excludes unsafe links', () => {
  const email = buildSysconEmail({title:'Confirmación',name:'<img src=x>',details:[{label:"Paper",value:'A & B <script>'}],actionUrl:'javascript:alert(1)',logoUrl:'javascript:alert(1)'});
  assert.ok(email.html.includes('&lt;img src=x&gt;'));
  assert.ok(email.html.includes('A &amp; B &lt;script&gt;'));
  assert.ok(!email.html.includes('javascript:'));
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.text.includes('A & B <script>'));
});
test('password and payment information is retained in both email alternatives', () => {
  const password = buildPasswordResetTemplate({provisionalPassword:'A&B<123>',appBaseUrl:'https://example.com'});
  assert.ok(password.text.includes('A&B<123>'));
  assert.ok(password.html.includes('A&amp;B&lt;123&gt;'));
  const paid = buildPaymentApprovedTemplate({amountUsd:400,transactionReference:'REF-001',paymentMethod:'cobru'});
  for (const content of [paid.html,paid.text]) { assert.ok(content.includes('$400.00 USD')); assert.ok(content.includes('REF-001')); assert.ok(content.includes('Cobru')); }
  const link = buildPayPhoneLinkTemplate({amountUsd:200,paymentLink:'https://example.com/pay?id=1&token=demo'});
  assert.ok(link.html.includes('href="https://example.com/pay?id=1&amp;token=demo"'));
  assert.ok(link.text.includes('https://example.com/pay?id=1&token=demo'));
});
