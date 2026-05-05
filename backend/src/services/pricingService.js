const { PricingRule, Registration } = require('../models');
const { PAYMENT_STATUSES, REGISTRATION_PAYMENT_STATUSES } = require('../constants/enums');
const AppError = require('../utils/errors');

const toNumber = (value) => Number(value || 0);

const getPricingRule = async ({ eventEditionId, participantType, memberType, attendanceType, onDate = new Date() }) => {
  const normalizedDate = new Date(onDate).toISOString().slice(0, 10);
  const rules = await PricingRule.findAll({
    where: {
      eventEditionId,
      participationType: participantType,
      memberType,
      attendanceType,
      isActive: true,
    },
    order: [['id', 'DESC']],
  });

  if (!rules.length) {
    throw new AppError('No active pricing rule found for the selected registration type.', 400);
  }

  const datedRule =
    rules.find((rule) => {
      const noDates = !rule.startsAt && !rule.endsAt;
      const started = !rule.startsAt || normalizedDate >= rule.startsAt;
      const notEnded = !rule.endsAt || normalizedDate <= rule.endsAt;
      return noDates || (started && notEnded);
    }) || rules[0];

  return datedRule;
};

const resolveLateFee = (rule) => toNumber(rule.lateFeeAmount);

const calculateRegistrationTotals = async (registrationId) => {
  const registration = await Registration.findByPk(registrationId, {
    include: [
      { association: 'papers' },
      { association: 'payments', where: { status: PAYMENT_STATUSES.APPROVED }, required: false },
    ],
  });

  if (!registration) {
    throw new AppError('Registration not found.', 404);
  }

  const pricingRule = await getPricingRule({
    eventEditionId: registration.eventEditionId,
    participantType: registration.participationType,
    memberType: registration.memberType,
    attendanceType: registration.attendanceType,
  });

  const baseAmount = toNumber(pricingRule.baseAmount);
  const discountAmount = toNumber(pricingRule.discountAmount);
  const extraPaperAmount = toNumber(pricingRule.extraArticleAmount);
  const lateFeeAmount = resolveLateFee(pricingRule);
  const papersCount = registration.papers.length;
  const extraPapersTotal = papersCount * extraPaperAmount;
  const totalAmount = Math.max(0, baseAmount - discountAmount + lateFeeAmount + extraPapersTotal);
  const paidAmount = registration.payments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus = REGISTRATION_PAYMENT_STATUSES.PENDING;
  if (paidAmount > 0 && paidAmount < totalAmount) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PARTIAL;
  } else if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PAID;
  }

  await Promise.all(
    registration.papers.map((paper) =>
      paper.update({
        extraChargeAmount: extraPaperAmount,
      })
    )
  );

  await registration.update({
    totalAmount,
    paidAmount,
    pendingAmount,
    paymentStatus,
  });

  return {
    registration,
    pricingRule,
    breakdown: {
      baseAmount,
      discountAmount,
      lateFeeAmount,
      extraPaperAmount,
      papersCount,
      extraPapersTotal,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
    },
  };
};

module.exports = {
  getPricingRule,
  calculateRegistrationTotals,
};
