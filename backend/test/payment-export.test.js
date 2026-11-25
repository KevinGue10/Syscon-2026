const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectExportPayment } = require('../src/utils/paymentExport');
const payment = (id, status, createdAt = '2026-11-09T12:00:00Z') => ({ id, status, createdAt, amountUsd: '100.00', amountCop: '400000.00' });

test('successful payments outrank newer pending payments, preserving their amounts', () => {
  const approved = payment(1, 'approved', '2026-11-01T12:00:00Z');
  assert.equal(selectExportPayment([payment(2, 'pending'), approved]), approved);
  assert.equal(selectExportPayment([payment(2, 'pending'), payment(1, 'paid')]).id, 1);
});

test('each priority group selects the newest creation time, then ID', () => {
  for (const status of ['approved', 'pending', 'pending_link', 'pending_payment', 'pending_validation']) {
    assert.equal(selectExportPayment([payment(99, status, '2026-11-01T12:00:00Z'), payment(1, status), payment(2, status)]).id, 2);
  }
  assert.equal(selectExportPayment([payment(3, 'cancelled'), payment(1, 'pending_validation')]).id, 1);
});

test('no payment differs from recorded rejected, cancelled or refunded payments', () => {
  assert.equal(selectExportPayment([]), null);
  assert.equal(selectExportPayment([payment(1, 'rejected'), payment(2, 'refunded'), payment(3, 'cancelled')]).status, 'cancelled');
});

test('bank receipt awaiting review outranks newer unused payment attempts', () => {
  const receipt = { ...payment(10, 'pending_validation', '2026-11-01T12:00:00Z'), paymentMethod: 'bank_transfer' };
  for (const status of ['pending', 'pending_link', 'pending_payment', 'cancelled', 'rejected']) {
    assert.equal(selectExportPayment([payment(20, status), receipt]), receipt);
  }
  const approved = payment(1, 'approved', '2026-10-01T12:00:00Z');
  assert.equal(selectExportPayment([receipt, approved]), approved);
});

test('coupon credits never represent a monetary payment or hide a pending real payment', () => {
  const coupon = { ...payment(107, 'approved'), provider: 'coupon', amountUsd: 50 };
  const pending = { ...payment(108, 'pending_payment'), provider: 'cobru', amountUsd: 350 };
  assert.equal(selectExportPayment([coupon, pending]), pending);
  assert.equal(selectExportPayment([coupon]), null);
  assert.equal(selectExportPayment([{ ...coupon, provider: null, paymentMethod: 'coupon' }]), null);
  const approved = { ...pending, status: 'approved' };
  assert.equal(selectExportPayment([coupon, approved]), approved);
});
