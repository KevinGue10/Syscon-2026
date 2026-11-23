const crypto = require('crypto');
const { Registration, Payment } = require('../models');
const sequelize = require('../config/database');
const { USER_ROLES } = require('../constants/enums');
const AppError = require('../utils/errors');
const { createAuditLog } = require('./auditService');

const cents = value => Math.round(Number(value) * 100);
const activeStatuses = ['pending', 'pending_link', 'pending_payment', 'pending_validation'];

const quoteAdjustment = (registration, payments) => {
  if (registration.ivaAdjustment) throw new AppError('An IVA adjustment already exists for this registration.', 409);
  if (registration.requiresInvoice) throw new AppError('This registration already includes IVA.', 409);
  if (payments.some(p => activeStatuses.includes(p.status))) {
    throw new AppError('Cancel or expire and reconcile pending payments before adding IVA.', 409);
  }
  const approved = payments.filter(p => p.status === 'approved');
  if (approved.some(p => p.provider === 'coupon' || p.paymentMethod === 'coupon')) {
    throw new AppError('Registrations with coupons require an accounting review before adding IVA.', 409);
  }
  if (approved.some(p => p.includesTax || Number(p.taxAmount) > 0)) {
    throw new AppError('An approved payment already includes IVA.', 409);
  }
  const baseCents = cents(registration.totalAmount);
  const paidCents = approved.reduce((sum, p) => sum + cents(p.amountUsd), 0);
  if (!Number.isSafeInteger(baseCents) || baseCents <= 0 || paidCents !== baseCents || cents(registration.pendingAmount) !== 0) {
    throw new AppError('The original registration must be fully paid with no outstanding balance.', 409);
  }
  const taxCents = Math.round(baseCents * 19 / 100);
  if (taxCents <= 0 || baseCents + taxCents > 9999999999) throw new AppError('IVA amount is outside the supported range.', 409);
  return { baseAmount: baseCents / 100, taxRate: 0.19, taxAmount: taxCents / 100,
    totalAmount: (baseCents + taxCents) / 100, originalPaymentIds: approved.map(p => p.id).sort((a, b) => a - b) };
};

const processAdjustment = async (registrationId, currentUser, confirmation = null) => {
  if (currentUser?.role !== USER_ROLES.ADMIN) throw new AppError('Admin access required.', 403);
  return sequelize.transaction(async transaction => {
    const registration = await Registration.findByPk(registrationId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!registration) throw new AppError('Registration not found.', 404);
    const payments = await Payment.findAll({ where: { registrationId: registration.id }, transaction });
    const quote = quoteAdjustment(registration, payments);
    if (!confirmation) return { quote };
    if (cents(confirmation.expectedBaseAmount) !== cents(quote.baseAmount) ||
        cents(confirmation.expectedTaxAmount) !== cents(quote.taxAmount)) {
      throw new AppError('The amounts changed. Review the IVA quote again before confirming.', 409);
    }
    const reason = String(confirmation.reason || '').trim();
    if (!reason || reason.length > 500) throw new AppError('Provide a reason of 1 to 500 characters.', 400);
    const adjustment = { ...quote, id: crypto.randomUUID(), type: 'iva_adjustment',
      createdBy: currentUser.id, createdAt: new Date().toISOString(), reason };
    await registration.update({ ivaAdjustment: adjustment, requiresInvoice: true,
      totalAmount: quote.totalAmount, paidAmount: quote.baseAmount, pendingAmount: quote.taxAmount,
      paymentStatus: 'partial' }, { transaction });
    await createAuditLog({ userId: currentUser.id, action: 'add-iva-adjustment', entity: 'registration',
      entityId: registration.id, newValue: adjustment }, { transaction });
    return { registration, adjustment };
  });
};

module.exports = { quoteAdjustment, processAdjustment };
