const { DollarRate } = require('../models');
const { createAuditLog } = require('./auditService');
const env = require('../config/env');

const SOURCE_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json';
const colombiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const fetchDollarRate = async ({ now = new Date(), fetchImpl = fetch } = {}) => {
  const effectiveDate = colombiaDate(now);
  const url = new URL(SOURCE_URL);
  url.searchParams.set('$order', 'vigenciadesde DESC');
  // Retrieve recent published rates and select validity locally: the public
  // source can fail on date-filtered queries and may already publish tomorrow.
  url.searchParams.set('$limit', '10');
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(env.dollarRate.timeoutMs),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`TRM source returned HTTP ${response.status}.`);
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows.find(item =>
    String(item?.vigenciadesde || '').slice(0, 10) <= effectiveDate &&
    String(item?.vigenciahasta || '').slice(0, 10) >= effectiveDate
  ) : null;
  const rate = Number(row?.valor);
  const validFrom = String(row?.vigenciadesde || '').slice(0, 10);
  const validTo = String(row?.vigenciahasta || '').slice(0, 10);
  if (row?.unidad !== 'COP' || !Number.isFinite(rate) || rate <= 0 || rate > 99999999.9999 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(validTo) ||
      validFrom > effectiveDate || validTo < effectiveDate) {
    throw new Error(`No valid official USD/COP TRM for ${effectiveDate}. Previous stored rates were not changed.`);
  }
  return { rate: Number(rate.toFixed(4)), effectiveDate, validFrom, validTo, source: SOURCE_URL };
};

let running;
const updateDollarRate = () => {
  // Multiple callers in the same process share a single request and insertion.
  if (running) return running;
  running = (async () => {
    const quote = await fetchDollarRate();
    const collectedAt = new Date();
    const record = await DollarRate.create({ rate: quote.rate, effectiveDate: collectedAt });
    await createAuditLog({ userId: null, action: 'update-dollar-rate', entity: 'dollar_rate', entityId: record.id,
      newValue: { ...quote, collectedAt: collectedAt.toISOString() } });
    console.log(`[TRM] Saved ${quote.rate} COP/USD for ${quote.effectiveDate} (record ${record.id}).`);
    return record;
  })().finally(() => { running = null; });
  return running;
};

module.exports = { colombiaDate, fetchDollarRate, updateDollarRate };
