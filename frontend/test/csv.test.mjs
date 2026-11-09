import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv } from '../src/utils/csv.js';

test('CSV preserves Unicode, commas, quotes, line breaks and leading zeroes', () => {
  const csv = buildCsv([['Name', 'Phone'], ['José, "IEEE"\nMember', '001234']]);
  assert.equal(csv, '\uFEFF"Name","Phone"\r\n"José, ""IEEE""\nMember","001234"');
});

test('participant values cannot become spreadsheet formulas', () => {
  const csv = buildCsv([['=1+1', '+123', '-1', '@SUM(A1)', '  =1', '\t=1', null]]);
  assert.equal(csv, '\uFEFF"\'=1+1","\'+123","\'-1","\'@SUM(A1)","\'  =1","\'\t=1",""');
});
