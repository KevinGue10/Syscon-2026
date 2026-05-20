const { PricingRule, Registration } = require('../models');
const { PAYMENT_STATUSES, REGISTRATION_PAYMENT_STATUSES, MEMBER_TYPES } = require('../constants/enums');
const AppError = require('../utils/errors');

const toNumber = (value) => Number(value || 0);
const MISSING_PRICING_RULE_MESSAGE = 'No active pricing rule found for the selected registration type.';
const ADDITIONAL_PAPER_RULE_NAME = 'Additional Paper';
const ADDITIONAL_PAGE_RULE_NAME = 'Additional Page';
const INCLUDED_PAGES_PER_PAPER = 6;

const normalizePricingMemberType = (memberType) => {
  if (memberType === MEMBER_TYPES.STUDENT) {
    return MEMBER_TYPES.STUDENT;
  }

  return MEMBER_TYPES.PROFESSIONAL;
};

const matchesRuleField = (ruleValue, targetValue) => ruleValue === null || ruleValue === targetValue;

const getRuleSpecificityScore = (rule) =>
  ['participationType', 'memberType', 'isIeeeMember', 'isTems'].reduce(
    (score, field) => score + (rule[field] === null ? 0 : 1),
    0
  );

const isBaseRuleMatch = ({
  rule,
  normalizedDate,
  participantType,
  normalizedMemberType,
  isIeeeMember,
}) => {
  const noDates = !rule.startsAt && !rule.endsAt;
  const started = !rule.startsAt || normalizedDate >= rule.startsAt;
  const notEnded = !rule.endsAt || normalizedDate <= rule.endsAt;
  const isDateMatch = noDates || (started && notEnded);
  const isChargeRule = [ADDITIONAL_PAPER_RULE_NAME, ADDITIONAL_PAGE_RULE_NAME].includes(rule.name);

  return (
    !isChargeRule &&
    isDateMatch &&
    matchesRuleField(rule.participationType, participantType) &&
    matchesRuleField(rule.memberType, normalizedMemberType) &&
    matchesRuleField(rule.isIeeeMember, isIeeeMember)
  );
};

const getPricingRule = async ({
  eventEditionId,
  participantType,
  memberType,
  isIeeeMember,
  isTems = false,
  onDate = new Date(),
  transaction,
}) => {
  const normalizedDate = new Date(onDate).toISOString().slice(0, 10);
  const normalizedMemberType = normalizePricingMemberType(memberType);
  const rules = await PricingRule.findAll({
    where: {
      eventEditionId,
      isActive: true,
    },
    order: [['id', 'DESC']],
    transaction,
  });

  let matchingRules = rules.filter((rule) =>
    isBaseRuleMatch({
      rule,
      normalizedDate,
      participantType,
      normalizedMemberType,
      isIeeeMember,
    }) && matchesRuleField(rule.isTems, isTems)
  );

  if (!matchingRules.length && isTems) {
    matchingRules = rules.filter((rule) =>
      isBaseRuleMatch({
        rule,
        normalizedDate,
        participantType,
        normalizedMemberType,
        isIeeeMember,
      })
    );
  }

  if (!matchingRules.length) {
    throw new AppError(MISSING_PRICING_RULE_MESSAGE, 400);
  }

  matchingRules.sort((left, right) => {
    const specificityDifference = getRuleSpecificityScore(right) - getRuleSpecificityScore(left);
    if (specificityDifference !== 0) {
      return specificityDifference;
    }

    return right.id - left.id;
  });

  return matchingRules[0];
};

const getChargeRuleByName = async ({ eventEditionId, name, transaction }) => {
  return PricingRule.findOne({
    where: {
      eventEditionId,
      name,
      isActive: true,
    },
    order: [['id', 'DESC']],
    transaction,
  });
};

const buildFallbackSummary = (registration) => {
  const papersCount = registration.papers.length;
  const additionalPapersCount = Math.max(0, papersCount - 1);
  const additionalPagesCount = registration.papers.reduce(
    (sum, paper) => sum + Math.max(0, Number(paper.pages || 0) - INCLUDED_PAGES_PER_PAPER),
    0
  );
  const paidAmount = registration.payments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const totalAmount = toNumber(registration.totalAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus = registration.paymentStatus || REGISTRATION_PAYMENT_STATUSES.PENDING;
  if (paidAmount <= 0) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PENDING;
  } else if (paidAmount < totalAmount) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PARTIAL;
  } else if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PAID;
  }

  return {
    pricingRule: null,
    breakdown: {
      baseAmount: 0,
      extraPaperAmount: 0,
      extraPageAmount: 0,
      papersCount,
      additionalPapersCount,
      additionalPagesCount,
      extraPapersTotal: 0,
      extraPagesTotal: 0,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
    },
  };
};

const buildPricingBreakdown = async ({
  eventEditionId,
  participationType,
  memberType,
  isIeeeMember,
  isTems = false,
  papers = [],
  paidAmount = 0,
  totalAmount = 0,
  paymentStatus: persistedPaymentStatus,
  transaction,
  allowMissingPricingRule = false,
}) => {
  let pricingRule;

  try {
    pricingRule = await getPricingRule({
      eventEditionId,
      participantType: participationType,
      memberType,
      isIeeeMember: Boolean(isIeeeMember),
      isTems: Boolean(isTems),
      transaction,
    });
  } catch (error) {
    if (allowMissingPricingRule && error.message === MISSING_PRICING_RULE_MESSAGE) {
      return buildFallbackSummary({
        papers,
        payments: [{ amountUsd: paidAmount }],
        totalAmount,
        paymentStatus: persistedPaymentStatus,
      });
    }

    throw error;
  }

  const [additionalPaperRule, additionalPageRule] = await Promise.all([
    getChargeRuleByName({
      eventEditionId,
      name: ADDITIONAL_PAPER_RULE_NAME,
      transaction,
    }),
    getChargeRuleByName({
      eventEditionId,
      name: ADDITIONAL_PAGE_RULE_NAME,
      transaction,
    }),
  ]);

  const baseAmount = toNumber(pricingRule.baseAmount);
  const extraPaperAmount = toNumber(additionalPaperRule?.baseAmount);
  const extraPageAmount = toNumber(additionalPageRule?.baseAmount);
  const normalizedPapers = [...papers];
  const papersCount = normalizedPapers.length;
  const additionalPapersCount = Math.max(0, papersCount - 1);
  const extraPapersTotal = additionalPapersCount * extraPaperAmount;
  const additionalPagesCount = normalizedPapers.reduce(
    (sum, paper) => sum + Math.max(0, Number(paper.pages || 0) - INCLUDED_PAGES_PER_PAPER),
    0
  );
  const extraPagesTotal = additionalPagesCount * extraPageAmount;
  const computedTotalAmount = Math.max(0, baseAmount + extraPapersTotal + extraPagesTotal);
  const normalizedPaidAmount = toNumber(paidAmount);
  const pendingAmount = Math.max(0, computedTotalAmount - normalizedPaidAmount);

  let paymentStatus = REGISTRATION_PAYMENT_STATUSES.PENDING;
  if (normalizedPaidAmount > 0 && normalizedPaidAmount < computedTotalAmount) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PARTIAL;
  } else if (normalizedPaidAmount >= computedTotalAmount && computedTotalAmount > 0) {
    paymentStatus = REGISTRATION_PAYMENT_STATUSES.PAID;
  } else if (persistedPaymentStatus) {
    paymentStatus = persistedPaymentStatus;
  }

  return {
    pricingRule,
    breakdown: {
      baseAmount,
      extraPaperAmount,
      extraPageAmount,
      papersCount,
      additionalPapersCount,
      additionalPagesCount,
      extraPapersTotal,
      extraPagesTotal,
      totalAmount: computedTotalAmount,
      paidAmount: normalizedPaidAmount,
      pendingAmount,
      paymentStatus,
    },
  };
};

const calculateRegistrationTotals = async (registrationId, options = {}) => {
  const { transaction, allowMissingPricingRule = false } = options;
  const registration = await Registration.findByPk(registrationId, {
    include: [
      { association: 'papers' },
      { association: 'payments', where: { status: PAYMENT_STATUSES.APPROVED }, required: false },
    ],
    transaction,
  });

  if (!registration) {
    throw new AppError('Registration not found.', 404);
  }

  const result = await buildPricingBreakdown({
    eventEditionId: registration.eventEditionId,
    participationType: registration.participationType,
    memberType: registration.memberType,
    isIeeeMember: Boolean(registration.isIeeeMember),
    isTems: Boolean(registration.isTems),
    papers: registration.papers,
    paidAmount: registration.payments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0),
    totalAmount: registration.totalAmount,
    paymentStatus: registration.paymentStatus,
    transaction,
    allowMissingPricingRule,
  });

  const { pricingRule, breakdown } = result;

  await Promise.all(
    [...registration.papers].sort((a, b) => a.id - b.id).map((paper, index) => {
      const extraPagesForPaper = Math.max(0, Number(paper.pages || 0) - INCLUDED_PAGES_PER_PAPER);
      const paperExtraCharge =
        (index > 0 ? breakdown.extraPaperAmount : 0) + extraPagesForPaper * breakdown.extraPageAmount;

      return paper.update(
        {
          extraChargeAmount: paperExtraCharge,
        },
        { transaction }
      );
    })
  );

  await registration.update({
    totalAmount: breakdown.totalAmount,
    paidAmount: breakdown.paidAmount,
    pendingAmount: breakdown.pendingAmount,
    paymentStatus: breakdown.paymentStatus,
  }, { transaction });

  return {
    registration,
    pricingRule,
    breakdown,
  };
};

const previewRegistrationTotals = async (payload = {}, options = {}) => {
  const {
    transaction,
    allowMissingPricingRule = false,
    registration = null,
  } = options;

  const previewPapers = Array.isArray(payload.papers)
    ? payload.papers
    : registration?.papers || [];

  const result = await buildPricingBreakdown({
    eventEditionId: Number(payload.eventEditionId || registration?.eventEditionId || 0),
    participationType: payload.participationType || registration?.participationType,
    memberType: payload.memberType || registration?.memberType,
    isIeeeMember:
      payload.isIeeeMember !== undefined
        ? payload.isIeeeMember
        : Boolean(registration?.isIeeeMember),
    isTems: payload.isTems !== undefined ? payload.isTems : Boolean(registration?.isTems),
    papers: previewPapers,
    paidAmount:
      registration?.payments?.reduce(
        (sum, payment) =>
          payment.status === PAYMENT_STATUSES.APPROVED ? sum + toNumber(payment.amountUsd) : sum,
        0
      ) || 0,
    totalAmount: registration?.totalAmount || 0,
    paymentStatus: registration?.paymentStatus,
    transaction,
    allowMissingPricingRule,
  });

  return {
    registration: registration
      ? {
          id: registration.id,
          eventEditionId: Number(payload.eventEditionId || registration.eventEditionId),
          participationType: payload.participationType || registration.participationType,
          memberType: payload.memberType || registration.memberType,
          isIeeeMember:
            payload.isIeeeMember !== undefined
              ? payload.isIeeeMember
              : Boolean(registration.isIeeeMember),
          isTems:
            payload.isTems !== undefined
              ? payload.isTems
              : Boolean(registration.isTems),
          totalAmount: result.breakdown.totalAmount,
          paidAmount: result.breakdown.paidAmount,
          pendingAmount: result.breakdown.pendingAmount,
          paymentStatus: result.breakdown.paymentStatus,
        }
      : null,
    pricingRule: result.pricingRule,
    breakdown: result.breakdown,
  };
};

module.exports = {
  getPricingRule,
  calculateRegistrationTotals,
  previewRegistrationTotals,
};
