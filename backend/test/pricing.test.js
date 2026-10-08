const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PricingRule } = require('../src/models');
const { getPricingRule, previewRegistrationTotals } = require('../src/services/pricingService');

const rates = [
  { id: 1, name: 'IEEE Member Author', participationType: 'author', memberType: 'ieee_member', isIeeeMember: true, baseAmount: 350, startsAt: '2026-10-08', endsAt: '2026-11-03' },
  { id: 2, name: 'Non-IEEE Member Author', participationType: 'author', memberType: 'non_ieee_member', isIeeeMember: false, baseAmount: 400, startsAt: '2026-10-08', endsAt: '2026-11-03' },
];
test('membership-based rates match professional registrations and retain IEEE discrimination', async t => {
  t.mock.method(PricingRule, 'findAll', async () => rates);
  const request = { eventEditionId: 1, participantType: 'author', memberType: 'professional', isIeeeMember: true, onDate: '2026-10-08' };
  assert.equal((await getPricingRule(request)).baseAmount, 350);
  assert.equal((await getPricingRule({ ...request, isIeeeMember: false })).baseAmount, 400);
  assert.equal((await getPricingRule({ ...request, memberType: 'ieee_member' })).baseAmount, 350);
  await assert.rejects(getPricingRule({ ...request, memberType: 'student' }), /No active pricing rule/);
  await assert.rejects(getPricingRule({ ...request, onDate: '2026-10-07' }), /No active pricing rule/);
  await assert.rejects(getPricingRule({ ...request, onDate: '2026-11-04' }), /No active pricing rule/);
});
test('legacy professional rates still match; a new quote without a rate fails instead of quoting zero', async t => {
  t.mock.method(PricingRule, 'findAll', async () => [{ ...rates[0], memberType: 'professional' }]);
  assert.equal((await getPricingRule({ eventEditionId: 1, participantType: 'author', memberType: 'ieee_member', isIeeeMember: true, onDate: '2026-10-08' })).baseAmount, 350);
  t.mock.method(PricingRule, 'findAll', async () => []);
  await assert.rejects(previewRegistrationTotals({ eventEditionId: 1, participationType: 'author', memberType: 'professional', isIeeeMember: true }), /No active pricing rule/);
});

test('invoice uses 19 percent and ignores legacy tour selection', async t => {
  const { calculateTaxAmountFromGross, resolveIncludesTour } = require('../src/services/pricingService');
  t.mock.method(PricingRule, 'findAll', async () => [{ ...rates[0], startsAt: null, endsAt: null }]);
  t.mock.method(PricingRule, 'findOne', async () => null);
  const payload = {eventEditionId:1,participationType:'author',memberType:'professional',isIeeeMember:true,includesTour:true,requiresInvoice:true};
  const quote = await previewRegistrationTotals(payload);
  assert.equal(quote.breakdown.invoiceTaxAmount,66.5);
  assert.equal(quote.breakdown.totalAmount,416.5);
  assert.equal(quote.breakdown.tourAmount,0);
  assert.equal(quote.breakdown.includesTour,false);
  assert.equal(resolveIncludesTour({includesTour:true},true),false);
  assert.equal(calculateTaxAmountFromGross({amountUsd:416.5,requiresInvoice:true,includesTour:true}),66.5);
  const noInvoice = await previewRegistrationTotals({...payload,requiresInvoice:false});
  assert.equal(noInvoice.breakdown.totalAmount,350);
  assert.equal(noInvoice.breakdown.invoiceTaxAmount,0);
});
