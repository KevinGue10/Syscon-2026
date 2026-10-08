const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSysconEmail } = require('../src/templates/emails/sysconEmailLayout');
const { buildPasswordResetTemplate } = require('../src/templates/emails/passwordResetTemplate');
const { buildPaymentApprovedTemplate } = require('../src/templates/emails/paymentApprovedTemplate');
const { buildPayPhoneLinkTemplate } = require('../src/templates/emails/payPhoneLinkTemplate');
test('email layout escapes participant data and excludes unsafe links', () => {
  const email = buildSysconEmail({title:'Confirmación',name:'<img src=x>',details:[{label:'Artículo',value:'A & B <script>'}],actionUrl:'javascript:alert(1)',logoUrl:'javascript:alert(1)'});
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
