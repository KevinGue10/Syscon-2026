const { Payment, Registration, DollarRate, AuditLog } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { PAYMENT_STATUSES } = require('../constants/enums');
const cobru = require('./cobruService');
const AppError = require('../utils/errors');

const pendingStatuses = ['pending_link', 'pending_payment', 'pending'];
const stateMap = {
  0: PAYMENT_STATUSES.PENDING_PAYMENT,
  1: PAYMENT_STATUSES.PENDING_PAYMENT,
  2: PAYMENT_STATUSES.REJECTED,
  3: PAYMENT_STATUSES.APPROVED,
  4: PAYMENT_STATUSES.REFUNDED,
  5: PAYMENT_STATUSES.CANCELLED,
};

module.exports = ({ assertRegistrationAccess, syncRegistrationPaymentPreferences,
  createPaymentRecord, updatePaymentStatus, buildPaymentResponse: buildResponse,
  calculateRegistrationTotals, maybeSendApprovalEmail }) => {
  // Existing balances remain payable when the registration's pricing period ended.
  const buildPaymentResponse = (payment, registrationId) =>
    buildResponse(payment, registrationId, { allowMissingPricingRule: true });
  const createCobruPayment = async (payload, currentUser) => {
    cobru.assertConfigured();
    const registration = await Registration.findByPk(payload.registrationId);
    assertRegistrationAccess(registration, currentUser);
    await syncRegistrationPaymentPreferences(registration, payload);
    const payment = await sequelize.transaction(async transaction => {
      const lockedRegistration = await Registration.findByPk(registration.id, { transaction, lock: transaction.LOCK.UPDATE });
      const pending = Number(lockedRegistration.pendingAmount);
      if (!Number.isFinite(pending) || pending <= 0) throw new AppError('The registration has no pending balance.', 409);
      const existing = await Payment.findOne({
        where: { registrationId: registration.id, provider: 'cobru', status: { [Op.in]: pendingStatuses } },
        transaction,
      });
      if (existing) {
        if (Math.abs(Number(existing.amountUsd) - pending) > 0.005 ||
            Boolean(existing.includesTour) !== Boolean(lockedRegistration.includesTour) ||
            Boolean(existing.includesTax) !== Boolean(lockedRegistration.requiresInvoice)) {
          throw new AppError('An active Cobru checkout has different payment options or balance. Expire and reconcile it first.', 409);
        }
        return existing;
      }
      const rate = await DollarRate.findOne({
        where: { effectiveDate: { [Op.lte]: new Date() } },
        order: [['effectiveDate', 'DESC'], ['id', 'DESC']], transaction,
      });
      const exchangeRate = Number(rate?.rate);
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new AppError('A valid USD/COP rate is required for Cobru.', 409);
      const amountCop = Number((pending * exchangeRate).toFixed(2));
      if (amountCop <= 0 || amountCop > 9999999999.99) throw new AppError('COP amount is outside the supported range.', 400);
      return createPaymentRecord({
        registration: lockedRegistration,
        amounts: { currency: 'COP', amountUsd: pending, amountCop },
        paymentMethod: 'cobru', provider: 'cobru',
        includesTour: false,
        requiresInvoice: lockedRegistration.requiresInvoice,
        providerResponseJson: { exchangeRate, exchangeRateId: rate.id },
        status: PAYMENT_STATUSES.PENDING_LINK, transaction,
      });
    });
    if (payment.paymentUrl) return buildPaymentResponse(payment, payment.registrationId);
    // Claim the reservation atomically. Competing/repeated requests must never
    // create a second remote charge for an ambiguous first attempt.
    const [claimed] = await Payment.update({ transactionReference: `SYSCON-${payment.id}` }, {
      where: { id: payment.id, transactionReference: null, status: PAYMENT_STATUSES.PENDING_LINK },
    });
    if (!claimed) throw new AppError('Cobru creation is in progress or needs reconciliation before retrying.', 409);
    try {
      const created = await cobru.createPayment({ paymentId: payment.id, registrationId: payment.registrationId, amountCop: Number(payment.amountCop) });
      await sequelize.transaction(async transaction => {
        const locked = await Payment.findByPk(payment.id, { transaction, lock: transaction.LOCK.UPDATE });
        await locked.update({ providerPaymentId: created.pk, paymentUrl: created.paymentUrl }, { transaction });
        await updatePaymentStatus({ payment: locked, status: PAYMENT_STATUSES.PENDING_PAYMENT,
          changedBy: currentUser.id, reason: 'Cobru checkout created.',
          providerResponseJson: { ...locked.providerResponseJson, cobruSlug: created.slug, creation: created.snapshot }, transaction });
      });
    } catch (error) {
      // Retain the reserved row on network/response failure: remote creation may have succeeded.
      await AuditLog.create({ userId: currentUser.id, action: 'cobru-creation-error', entity: 'payment', entityId: String(payment.id), newValue: { message: error.message } });
      throw error;
    }
    return buildPaymentResponse(payment, payment.registrationId);
  };

  const reconcile = async (paymentId, currentUser = null) => {
    const existing = await Payment.findOne({ where: { id: paymentId, provider: 'cobru' }, include: ['registration'] });
    if (!existing) throw new AppError('Cobru payment not found.', 404);
    if (currentUser) assertRegistrationAccess(existing.registration, currentUser);
    const slug = existing.providerResponseJson?.cobruSlug;
    if (!slug) throw new AppError('Cobru creation must be reconciled manually before checking this payment.', 409);
    const detail = await cobru.consultPayment(slug);
    // Callback data is deliberately excluded: identity and amount come from authenticated lookup.
    if (detail.url !== slug || (detail.pk !== undefined && String(detail.pk) !== existing.providerPaymentId) ||
        !Number.isFinite(Number(detail.amount)) || Math.abs(Number(detail.amount) - Number(existing.amountCop)) > 0.005 ||
        (detail.currency_code !== undefined && detail.currency_code !== 'COP')) {
      throw new AppError('Cobru identity, amount or currency does not match the stored payment.', 502);
    }
    const state = String(detail.state);
    if (!Object.hasOwn(stateMap, state)) throw new AppError('Unknown Cobru payment state.', 502);
    const target = stateMap[state];
    const snapshot = { pk: existing.providerPaymentId, url: detail.url, amount: detail.amount, state: detail.state,
      currency_code: detail.currency_code || 'COP', payment_method: detail.payment_method,
      payed_amount: detail.payed_amount, fee_amount: detail.fee_amount };
    const result = await sequelize.transaction(async transaction => {
      // Lock the registration first everywhere to serialize balance recalculation.
      await Registration.findByPk(existing.registrationId, { transaction, lock: transaction.LOCK.UPDATE });
      const payment = await Payment.findByPk(existing.id, { transaction, lock: transaction.LOCK.UPDATE });
      // Approved payments may only move to refunded; refunded is final. Notifications
      // can arrive out of order, so pending/rejected never undo an approved payment.
      if (payment.status === PAYMENT_STATUSES.REFUNDED ||
          (payment.status === PAYMENT_STATUSES.APPROVED && target !== PAYMENT_STATUSES.REFUNDED)) {
        return { payment, didChange: false };
      }
      const updated = await updatePaymentStatus({ payment, status: target,
        changedBy: currentUser?.id || null, reason: `Cobru verified state ${state}.`,
        providerResponseJson: { ...payment.providerResponseJson, latest: snapshot }, transaction });
      if (updated.didChange) {
        await calculateRegistrationTotals(payment.registrationId, { transaction, allowMissingPricingRule: true });
        await AuditLog.create({ userId: currentUser?.id || null, action: 'cobru-reconcile', entity: 'payment', entityId: String(payment.id), newValue: { state, status: target } }, { transaction });
      }
      return updated;
    });
    if (result.didChange && result.payment.status === PAYMENT_STATUSES.APPROVED) {
      // Delivery failure must not roll back a confirmed financial transaction.
      maybeSendApprovalEmail(result.payment, existing.registration).catch(error => console.error('Cobru confirmation email failed:', error.message));
    }
    return result.payment;
  };

  const refreshCobruPayment = async (paymentId, currentUser) => {
    const payment = await reconcile(paymentId, currentUser);
    return buildPaymentResponse(payment, payment.registrationId);
  };

  const handleCobruWebhook = async ({ query, body }) => {
    if (!cobru.verifyCallbackToken(query.token)) throw new AppError('Invalid Cobru callback token.', 401);
    if (!/^\d+$/.test(String(query.paymentId || ''))) throw new AppError('Invalid callback paymentId.', 400);
    const payment = await Payment.findOne({ where: { id: query.paymentId, provider: 'cobru' } });
    if (!payment) return { received: true, ignored: true };
    await AuditLog.create({ userId: null, action: 'cobru-callback-received', entity: 'payment', entityId: String(payment.id), newValue: body });
    await reconcile(payment.id);
    return { received: true };
  };
  return { createCobruPayment, refreshCobruPayment, handleCobruWebhook };
};
