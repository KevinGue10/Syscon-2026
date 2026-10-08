const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DollarRate, AuditLog } = require('../src/models');
const { colombiaDate, fetchDollarRate, updateDollarRate } = require('../src/services/dollarRateService');
const { nextRun, startDollarRateJob } = require('../src/jobs/dollarRateJob');
const row = { valor: '3238.88', unidad: 'COP', vigenciadesde: '2026-10-08T00:00:00.000', vigenciahasta: '2026-10-08T00:00:00.000' };
const now = new Date('2026-10-08T12:00:00Z');

test('source query requests the current Colombia date and validates the official quote', async () => {
  let query;
  const quote = await fetchDollarRate({ now, fetchImpl: async url => {
    query = url; return new Response(JSON.stringify([
      { ...row, valor: '9999', vigenciadesde: '2026-10-09', vigenciahasta: '2026-10-09' }, row,
    ]));
  } });
  assert.equal(quote.rate, 3238.88);
  assert.equal(quote.effectiveDate, '2026-10-08');
  assert.equal(query.searchParams.get('$limit'), '10');
  assert.equal(query.searchParams.get('$order'), 'vigenciadesde DESC');
  assert.equal(colombiaDate(new Date('2026-10-09T03:00:00Z')), '2026-10-08');
});

test('invalid, future, expired and failed source responses are rejected', async () => {
  for (const rows of [[], [{ ...row, valor: '0' }], [{ ...row, valor: 'NaN' }],
    [{ ...row, unidad: 'USD' }], [{ ...row, vigenciadesde: '2026-10-09' }],
    [{ ...row, vigenciahasta: '2026-10-07' }], { valor: 1 }]) {
    await assert.rejects(fetchDollarRate({ now, fetchImpl: async () => new Response(JSON.stringify(rows)) }), /No valid official/);
  }
  await assert.rejects(fetchDollarRate({ now, fetchImpl: async () => new Response('error', { status: 503 }) }), /HTTP 503/);
});

test('schedule is fixed at 06:00 and 18:00 Colombia, independent of host timezone', () => {
  for (const [input, output] of [
    ['2026-10-08T10:59:59Z', '2026-10-08T11:00:00.000Z'],
    ['2026-10-08T11:00:00Z', '2026-10-08T23:00:00.000Z'],
    ['2026-10-08T22:59:59Z', '2026-10-08T23:00:00.000Z'],
    ['2026-10-08T23:00:00Z', '2026-10-09T11:00:00.000Z'],
    ['2026-12-31T23:10:00Z', '2027-01-01T11:00:00.000Z'],
  ]) assert.equal(nextRun(new Date(input)).toISOString(), output);
});

test('scheduler runs on startup, at the next scheduled time, and can be stopped', async () => {
  const timers = [];
  let updates = 0;
  let clock = new Date('2026-10-08T10:00:00Z');
  const stop = startDollarRateJob({ enabled: true, runOnStart: true,
    now: () => clock, update: async () => { updates++; },
    schedule: (fn, delay) => { const timer = { fn, delay }; timers.push(timer); return timer; },
    cancel: timer => { if (timer) timer.cancelled = true; }, logger: { log() {}, error() {} },
  });
  await Promise.resolve();
  assert.equal(updates, 1);
  assert.equal(timers[0].delay, 3600000);
  clock = new Date('2026-10-08T11:00:00Z');
  timers[0].fn();
  await Promise.resolve();
  assert.equal(updates, 2);
  assert.equal(timers[1].delay, 12 * 3600000);
  stop();
  timers[1].fn();
  assert.equal(updates, 2);
});

test('scheduled failures retry with a limit and do not stop the next daily execution', async () => {
  const timers = [];
  const stop = startDollarRateJob({ enabled: true, runOnStart: true,
    now: () => now, update: async () => { throw new Error('offline'); },
    schedule: (fn, delay) => { const timer = { fn, delay }; timers.push(timer); return timer; },
    cancel() {}, logger: { log() {}, error() {} },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers[1].delay, 30000);
  timers[1].fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers[2].delay, 60000);
  timers[2].fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers.length, 3);
  stop();
});

test('concurrent updates share a single fetch and persist a snapshot in dollar_rates', async t => {
  const day = colombiaDate();
  let writes = 0;
  t.mock.method(global, 'fetch', async () => new Response(JSON.stringify([{ ...row, vigenciadesde: day, vigenciahasta: day }])));
  const started = Date.now();
  t.mock.method(DollarRate, 'create', async values => {
    writes++;
    assert(values.effectiveDate instanceof Date);
    assert(values.effectiveDate.getTime() >= started);
    assert(values.effectiveDate.getTime() <= Date.now());
    return { id: 10, ...values };
  });
  t.mock.method(AuditLog, 'create', async values => { assert.equal(values.entityId, '10'); assert.equal(values.action, 'update-dollar-rate'); });
  const [first, second] = await Promise.all([updateDollarRate(), updateDollarRate()]);
  assert.equal(first, second);
  assert.equal(writes, 1);
});
