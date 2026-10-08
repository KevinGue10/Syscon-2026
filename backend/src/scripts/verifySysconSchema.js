const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { initModels, PricingRule, Registration } = require('../models');
const sequelize = require('../config/database');
const { getPricingRule, previewRegistrationTotals } = require('../services/pricingService');

const verify = async () => {
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (entry.name.endsWith('.js')) new vm.Script(fs.readFileSync(filename, 'utf8'), { filename });
    }
  };
  walk(path.resolve(__dirname, '..'));
  initModels();
  assert.equal(Registration.rawAttributes.isTems, undefined);
  assert.equal(PricingRule.rawAttributes.isTems, undefined);
  const ddl = fs.readFileSync(path.resolve(__dirname, '../../sql/01-create-syscon2026.sql'), 'utf8');
  assert.equal((ddl.match(/CREATE TABLE IF NOT EXISTS/g) || []).length, 14);
  assert.doesNotMatch(ddl, /is_tems|includes_taxes/);
  const created = new Set();
  for (const statement of ddl.split(';').filter(sql => sql.includes('CREATE TABLE'))) {
    for (const reference of statement.matchAll(/REFERENCES `([^`]+)`/g)) assert(created.has(reference[1]));
    created.add(statement.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/)[1]);
  }
  for (const model of Object.values(sequelize.models)) {
    const statement = ddl.split(';').find(sql => sql.includes(`CREATE TABLE IF NOT EXISTS \`${model.tableName}\``));
    for (const attribute of Object.values(model.rawAttributes)) {
      if (attribute.type.key !== 'VIRTUAL') assert(statement.includes(`\`${attribute.field}\``));
    }
  }
  const base = { eventEditionId: 1, participationType: 'author', memberType: 'professional', isIeeeMember: true, startsAt: null, endsAt: null };
  const rules = [
    { ...base, id: 1, name: 'IEEE author', baseAmount: 400 },
    { ...base, id: 2, name: 'Non IEEE author', isIeeeMember: false, baseAmount: 450 },
    { ...base, id: 3, name: 'Expired', endsAt: '2026-01-01', baseAmount: 300 },
    { ...base, id: 4, name: 'Additional Paper', baseAmount: 150 },
    { ...base, id: 5, name: 'Additional Page', baseAmount: 80 },
  ];
  const originalFindAll = PricingRule.findAll;
  const originalFindOne = PricingRule.findOne;
  try {
    PricingRule.findAll = async () => rules;
    PricingRule.findOne = async ({ where }) => rules.find(rule => rule.name === where.name);
    const input = { eventEditionId: 1, participantType: 'author', memberType: 'professional', isIeeeMember: true, onDate: '2026-10-06' };
    assert.equal((await getPricingRule(input)).id, 1);
    assert.equal((await getPricingRule({ ...input, isIeeeMember: false })).id, 2);
    const preview = await previewRegistrationTotals({ ...input, participationType: 'author', includesTour: true, requiresInvoice: true, papers: [{ pages: 7 }, { pages: 6 }] });
    // 400 base + 150 second paper + 80 extra page + 94.50 tax + 10 tour.
    assert.equal(preview.breakdown.totalAmount, 734.5);
    PricingRule.findAll = async () => [];
    await assert.rejects(getPricingRule(input), /No active pricing rule/);
  } finally {
    PricingRule.findAll = originalFindAll;
    PricingRule.findOne = originalFindOne;
  }
  console.log('Verified JS syntax, 14 tables, model columns, FK order and pricing without TEMS. No database connection.');
};
verify().catch(error => { console.error(error); process.exitCode = 1; });
