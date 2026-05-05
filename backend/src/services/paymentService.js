const { Payment, Registration, User, DollarRate } = require('../models');
const { PAYMENT_STATUSES, USER_ROLES } = require('../constants/enums');
const { calculateRegistrationTotals } = require('./pricingService');
const { createAuditLog } = require('./auditService');
const { sendPaymentConfirmationEmail } = require('./emailService');
const AppError = require('../utils/errors');

const assertPaymentAccess = (registration, currentUser) => {
  if (!registration) {
    throw new AppError('Registration not found.', 404);
  }

  if (currentUser.role !== USER_ROLES.ADMIN && registration.userId !== currentUser.id) {
    throw new AppError('You do not have access to this payment record.', 403);
  }
};

const resolveExchangeRate = async () => {
  const latestRate = await DollarRate.findOne({
    order: [['effectiveDate', 'DESC'], ['id', 'DESC']],
  });

  return latestRate ? Number(latestRate.rate) : null;
};

const normalizePaymentAmounts = async (payload) => {
  const currency = String(payload.currency || 'USD').toUpperCase();
  const latestRate = await resolveExchangeRate();
  const amount = payload.amount !== undefined ? Number(payload.amount) : null;
  let amountUsd = payload.amountUsd !== undefined ? Number(payload.amountUsd) : null;
  let amountCop = payload.amountCop !== undefined ? Number(payload.amountCop) : null;

  if (currency === 'USD') {
    amountUsd = amountUsd ?? amount;
    if (amountUsd === null) {
      throw new AppError('amountUsd is required for USD payments.', 400);
    }
    if (amountCop === null && latestRate) {
      amountCop = Number((amountUsd * latestRate).toFixed(2));
    }
  }

  if (currency === 'COP') {
    amountCop = amountCop ?? amount;
    if (amountCop === null) {
      throw new AppError('amountCop is required for COP payments.', 400);
    }
    if (amountUsd === null) {
      if (!latestRate) {
        throw new AppError('No dollar exchange rate available to convert COP payment.', 400);
      }
      amountUsd = Number((amountCop / latestRate).toFixed(2));
    }
  }

  return {
    currency,
    amountUsd,
    amountCop,
  };
};

const createPayment = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertPaymentAccess(registration, currentUser);
  const status =
    currentUser.role === USER_ROLES.ADMIN ? payload.status || PAYMENT_STATUSES.PENDING : PAYMENT_STATUSES.PENDING;
  const amounts = await normalizePaymentAmounts(payload);

  const payment = await Payment.create({
    registrationId: payload.registrationId,
    amountUsd: amounts.amountUsd,
    amountCop: amounts.amountCop,
    currency: amounts.currency,
    paymentMethod: payload.paymentMethod,
    transactionReference: payload.transactionReference,
    status,
    paymentDate: payload.paymentDate || new Date(),
  });

  const summary = await calculateRegistrationTotals(registration.id);
  await createAuditLog({
    userId: currentUser.id,
    action: 'create',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  if (status === PAYMENT_STATUSES.APPROVED) {
    const user = await User.findByPk(registration.userId);
    await sendPaymentConfirmationEmail(user, payment);
  }

  return {
    payment,
    registration: summary.registration,
    paymentSummary: summary.breakdown,
  };
};

const listPaymentsByRegistration = async (registrationId, currentUser) => {
  const registration = await Registration.findByPk(registrationId);
  assertPaymentAccess(registration, currentUser);

  return Payment.findAll({
    where: { registrationId },
    order: [['createdAt', 'DESC']],
  });
};

const updatePaymentStatus = async (paymentId, status, currentUser) => {
  if (currentUser.role !== USER_ROLES.ADMIN) {
    throw new AppError('Admin access required to update payment status.', 403);
  }

  const payment = await Payment.findByPk(paymentId, {
    include: [{ association: 'registration' }],
  });

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  const oldValue = payment.toJSON();
  await payment.update({ status });
  const summary = await calculateRegistrationTotals(payment.registrationId);

  await createAuditLog({
    userId: currentUser.id,
    action: 'update-status',
    entity: 'payment',
    entityId: payment.id,
    oldValue,
    newValue: payment.toJSON(),
  });

  if (status === PAYMENT_STATUSES.APPROVED) {
    const user = await User.findByPk(payment.registration.userId);
    await sendPaymentConfirmationEmail(user, payment);
  }

  return {
    payment,
    registration: summary.registration,
    paymentSummary: summary.breakdown,
  };
};

module.exports = {
  createPayment,
  listPaymentsByRegistration,
  updatePaymentStatus,
};
