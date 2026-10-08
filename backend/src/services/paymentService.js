const { Payment, PaymentStatusHistory, Registration, User, DollarRate, Coupon } = require('../models');
const { PAYMENT_STATUSES, USER_ROLES } = require('../constants/enums');
const {
  calculateRegistrationTotals,
  resolveIncludesTour,
  resolveRequiresInvoice,
  calculateTaxAmountFromGross,
} = require('./pricingService');
const { createAuditLog } = require('./auditService');
const { sendPaymentConfirmationEmail, sendPayPhoneLinkEmail } = require('./emailService');
const AppError = require('../utils/errors');
const { Op } = require('sequelize');
const { uploadPaymentProofFile, getSignedObjectUrl } = require('./objectStorageService');

const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  COBRU: 'cobru',
  PAYPHONE: 'payphone',
};

const PAYMENT_PROVIDERS = {
  MANUAL: 'manual_bank_transfer',
  COBRU: 'cobru',
  PAYPHONE: 'manual_payphone_request',
  COUPON: 'coupon',
};

const COUPON_PAYMENT_METHOD = 'coupon';

const dispatchEmailInBackground = (task, label) => {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`${label} failed:`, error.message);
    });
};

const assertRegistrationAccess = (registration, currentUser) => {
  if (!registration) {
    throw new AppError('Registration not found.', 404);
  }

  if (currentUser.role !== USER_ROLES.ADMIN && registration.userId !== currentUser.id) {
    throw new AppError('You do not have access to this payment record.', 403);
  }
};

const assertAdminAccess = (currentUser) => {
  if (!currentUser || currentUser.role !== USER_ROLES.ADMIN) {
    throw new AppError('Admin access required.', 403);
  }
};

const hasStoredPaymentProof = (payment) =>
  Boolean(
    payment?.paymentProofBucketKey ||
      payment?.paymentProofUrl ||
      payment?.paymentProofFilename
  );

const requiresProofValidation = (payment) =>
  [PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.PAYPHONE].includes(payment?.paymentMethod);

const assertPaymentCanBeApproved = (payment) => {
  if (payment?.provider === PAYMENT_PROVIDERS.COBRU) {
    throw new AppError('Cobru payments must be confirmed through provider reconciliation.', 409);
  }
  const pendingAmount = Number(payment?.registration?.pendingAmount || 0);
  const paymentAmount = Number(payment?.amountUsd || 0);

  if (requiresProofValidation(payment) && payment.status !== PAYMENT_STATUSES.PENDING_VALIDATION) {
    throw new AppError('This payment is not ready for administrative validation yet.', 409);
  }

  if (requiresProofValidation(payment) && !hasStoredPaymentProof(payment)) {
    throw new AppError('Payment proof is required before approval.', 409);
  }

  if (pendingAmount <= 0) {
    throw new AppError('The registration has no pending balance to approve.', 409);
  }

  if (paymentAmount - pendingAmount > 0.01) {
    throw new AppError('The payment amount exceeds the current pending balance.', 409);
  }
};

const applyReviewedAmount = async (payment, reviewedAmount) => {
  if (reviewedAmount === undefined || reviewedAmount === null || reviewedAmount === '') {
    return payment;
  }

  const normalizedReviewedAmount = Number(reviewedAmount);
  if (Number.isNaN(normalizedReviewedAmount) || normalizedReviewedAmount <= 0) {
    throw new AppError('reviewedAmount must be greater than 0.', 400);
  }

  const originalAmountUsd = Number(payment.amountUsd || 0);
  if (normalizedReviewedAmount - originalAmountUsd > 0.01) {
    throw new AppError('The reviewed amount cannot exceed the original payment amount.', 409);
  }

  const updatePayload = {
    amountUsd: Number(normalizedReviewedAmount.toFixed(2)),
  };

  if (payment.amountCop !== null && payment.amountCop !== undefined && originalAmountUsd > 0) {
    const conversionRatio = Number(payment.amountCop) / originalAmountUsd;
    updatePayload.amountCop = Number((normalizedReviewedAmount * conversionRatio).toFixed(2));
  }

  await payment.update(updatePayload);
  return payment;
};

const resolveExchangeRate = async () => {
  const latestRate = await DollarRate.findOne({
    where: { effectiveDate: { [Op.lte]: new Date() } },
    order: [['effectiveDate', 'DESC'], ['id', 'DESC']],
  });

  return latestRate ? Number(latestRate.rate) : null;
};

const normalizePaymentAmounts = async (payload = {}) => {
  const currency = String(payload.currency || 'USD').toUpperCase();
  const latestRate = await resolveExchangeRate();
  const amount = payload.amount !== undefined ? Number(payload.amount) : null;
  let amountUsd = payload.amountUsd !== undefined ? Number(payload.amountUsd) : null;
  let amountCop = payload.amountCop !== undefined ? Number(payload.amountCop) : null;

  if (currency === 'USD') {
    amountUsd = amountUsd ?? amount;
    if (amountUsd === null || Number.isNaN(amountUsd) || amountUsd <= 0) {
      throw new AppError('amountUsd is required for USD payments.', 400);
    }

    if (amountCop === null && latestRate) {
      amountCop = Number((amountUsd * latestRate).toFixed(2));
    }
  }

  if (currency === 'COP') {
    amountCop = amountCop ?? amount;
    if (amountCop === null || Number.isNaN(amountCop) || amountCop <= 0) {
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
    amountUsd: Number(amountUsd),
    amountCop: amountCop !== null ? Number(amountCop) : null,
  };
};

const resolveRequestedAmounts = async (payload, registration) => {
  const pendingAmount = Number(registration.pendingAmount || 0);
  const fallbackAmount = pendingAmount > 0 ? pendingAmount : null;

  return normalizePaymentAmounts({
    ...payload,
    amount: payload.amount ?? fallbackAmount,
    amountUsd: payload.amountUsd ?? (payload.currency === 'USD' ? fallbackAmount : undefined),
  });
};

const normalizeCouponCode = (code) => String(code || '').trim().toUpperCase();
const resolvePaymentIncludesTour = () => false;

const syncRegistrationPaymentPreferences = async (registration, payload = {}) => {
  if (!registration) {
    return registration;
  }

  const shouldUpdateIncludesTour =
    payload.includesTour !== undefined ||
    payload.goToTour !== undefined ||
    payload.isTour !== undefined;
  const shouldUpdateRequiresInvoice =
    payload.requiresInvoice !== undefined ||
    payload.includeTaxes !== undefined ||
    payload.includesTaxes !== undefined;

  if (!shouldUpdateIncludesTour && !shouldUpdateRequiresInvoice) {
    return registration;
  }

  await registration.update({
    includesTour: false,
    requiresInvoice: shouldUpdateRequiresInvoice
      ? resolveRequiresInvoice(payload)
      : registration.requiresInvoice,
  });

  await calculateRegistrationTotals(registration.id, {
    allowMissingPricingRule: true,
  });

  await registration.reload();
  return registration;
};

const normalizePaymentLink = (paymentLink) => String(paymentLink || '').trim();

const getActiveCouponByCode = async (code) => {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    throw new AppError('Coupon code is required.', 400);
  }

  const coupon = await Coupon.findOne({
    where: {
      code: normalizedCode,
      isActive: true,
    },
  });

  if (!coupon) {
    throw new AppError('Coupon not found or inactive.', 404);
  }

  return coupon;
};

const buildCouponPreview = ({ coupon, baseAmount }) => {
  const normalizedBaseAmount = Number(Math.max(0, Number(baseAmount || 0)).toFixed(2));
  const percentage = Number(coupon.percentage || 0);
  const discountAmount = Number(Math.min(normalizedBaseAmount, normalizedBaseAmount * (percentage / 100)).toFixed(2));
  const finalAmount = Number(Math.max(0, normalizedBaseAmount - discountAmount).toFixed(2));

  return {
    code: coupon.code,
    percentage,
    baseAmount: normalizedBaseAmount,
    discountAmount,
    finalAmount,
    message:
      discountAmount > 0
        ? 'Coupon validated successfully.'
        : 'Coupon does not generate a discount for this amount.',
  };
};

const recordStatusHistory = async ({
  paymentId,
  previousStatus,
  newStatus,
  changedBy = null,
  reason = null,
  providerResponseJson = null,
  transaction = undefined,
}) => {
  return PaymentStatusHistory.create(
    {
      paymentId,
      previousStatus,
      newStatus,
      changedBy,
      reason,
      providerResponseJson,
    },
    { transaction }
  );
};

const createPaymentRecord = async ({
  registration,
  amounts,
  paymentMethod,
  provider,
  includesTour = false,
  requiresInvoice = false,
  taxAmount = null,
  transactionReference = null,
  providerPaymentId = null,
  paymentUrl = null,
  providerResponseJson = null,
  paymentDate = null,
  status = PAYMENT_STATUSES.PENDING,
  transaction = undefined,
}) => {
  const normalizedTaxAmount =
    taxAmount !== null && taxAmount !== undefined
      ? Number(Number(taxAmount).toFixed(2))
      : calculateTaxAmountFromGross({
          amountUsd: amounts.amountUsd,
          includesTour,
          requiresInvoice,
        });

  return Payment.create({
    registrationId: registration.id,
    amountUsd: amounts.amountUsd,
    amountCop: amounts.amountCop,
    currency: amounts.currency,
    paymentMethod,
    provider,
    includesTour: false,
    includesTax: Boolean(requiresInvoice),
    taxAmount: normalizedTaxAmount,
    transactionReference,
    providerPaymentId,
    paymentUrl,
    providerResponseJson: {
      ...(providerResponseJson || {}),
      includesTour: false,
      requiresInvoice: Boolean(requiresInvoice),
      includeTaxes: Boolean(requiresInvoice),
      taxAmount: normalizedTaxAmount,
    },
    status,
    paymentDate,
  }, { transaction });
};

const findReusablePendingPayment = async ({
  registrationId,
  paymentMethod,
  amountUsd,
  currency,
  includesTour = false,
  includesTax = false,
}) => {
  const normalizedAmountUsd = Number(Number(amountUsd || 0).toFixed(2));

  return Payment.findOne({
    where: {
      registrationId,
      paymentMethod,
      currency,
      amountUsd: normalizedAmountUsd,
      includesTour: false,
      includesTax: Boolean(includesTax),
      status: [
        PAYMENT_STATUSES.PENDING_LINK,
        PAYMENT_STATUSES.PENDING_PAYMENT,
        PAYMENT_STATUSES.PENDING_VALIDATION,
        PAYMENT_STATUSES.PENDING,
      ],
    },
    order: [['createdAt', 'DESC']],
  });
};

const buildPaymentResponse = async (payment, registrationId, options = {}) => {
  const summary = await calculateRegistrationTotals(registrationId, options);
  const refreshedPayment = await Payment.findByPk(payment.id, {
    include: ['registration', 'validator', 'statusHistory'],
  });

  const normalizedPayment = refreshedPayment.toJSON();
  normalizedPayment.includesTax = Boolean(
    normalizedPayment.includesTax !== undefined
      ? normalizedPayment.includesTax
      : normalizedPayment.registration?.requiresInvoice
  );
  normalizedPayment.taxAmount = Number(normalizedPayment.taxAmount || 0);
  delete normalizedPayment.includesTaxes;
  delete normalizedPayment.requiresInvoice;

  return {
    payment: normalizedPayment,
    registration: summary.registration,
    paymentSummary: summary.breakdown,
  };
};

const maybeSendApprovalEmail = async (payment, registration) => {
  if (payment.status !== PAYMENT_STATUSES.APPROVED) {
    return;
  }

  const user = await User.findByPk(registration.userId);
  if (user) {
    await sendPaymentConfirmationEmail(user, payment);
  }
};

const updatePaymentStatus = async ({
  payment,
  status,
  changedBy = null,
  reason = null,
  providerResponseJson = null,
  validatedBy = null,
  transaction = undefined,
}) => {
  if (payment.status === status) {
    if (providerResponseJson) {
      await payment.update(
        {
          providerResponseJson,
        },
        { transaction }
      );
    }

    return {
      payment,
      didChange: false,
    };
  }

  const previousStatus = payment.status;
  const updatePayload = {
    status,
    providerResponseJson: providerResponseJson || payment.providerResponseJson,
  };

  if (
    [
      PAYMENT_STATUSES.PENDING_LINK,
      PAYMENT_STATUSES.PENDING_PAYMENT,
      PAYMENT_STATUSES.PENDING_VALIDATION,
      PAYMENT_STATUSES.PENDING,
    ].includes(status)
  ) {
    updatePayload.validatedBy = null;
    updatePayload.validatedAt = null;
    updatePayload.rejectionReason = null;
  }

  if (status === PAYMENT_STATUSES.APPROVED) {
    updatePayload.validatedBy = validatedBy;
    updatePayload.validatedAt = new Date();
    updatePayload.rejectionReason = null;
    updatePayload.paymentDate = payment.paymentDate || new Date();
  }

  if (status === PAYMENT_STATUSES.REJECTED) {
    updatePayload.rejectionReason = reason || payment.rejectionReason;
    updatePayload.validatedBy = validatedBy;
    updatePayload.validatedAt = new Date();
  }

  await payment.update(updatePayload, { transaction });
  await recordStatusHistory({
    paymentId: payment.id,
    previousStatus,
    newStatus: status,
    changedBy,
    reason,
    providerResponseJson,
    transaction,
  });

  return {
    payment,
    didChange: true,
  };
};

const getPaymentWithRegistration = async (paymentId) => {
  return Payment.findByPk(paymentId, {
    include: [{ association: 'registration' }],
  });
};

const createBankTransferPayment = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);
  await syncRegistrationPaymentPreferences(registration, payload);

  const amounts = await resolveRequestedAmounts(payload, registration);
  if (!Number.isFinite(amounts.amountCop) || amounts.amountCop <= 0) {
    throw new AppError('No hay una tasa de cambio v?lida para generar la transferencia en pesos.', 409);
  }
  const reusablePayment = await findReusablePendingPayment({
    registrationId: registration.id,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    amountUsd: amounts.amountUsd,
    currency: amounts.currency,
    includesTour: resolvePaymentIncludesTour(payload),
    includesTax: resolveRequiresInvoice(payload),
  });

  if (reusablePayment) {
    return buildPaymentResponse(reusablePayment, registration.id);
  }

  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    provider: PAYMENT_PROVIDERS.MANUAL,
    includesTour: resolvePaymentIncludesTour(payload),
    requiresInvoice: resolveRequiresInvoice(payload),
    taxAmount: payload.taxAmount,
    transactionReference: payload.transactionReference || null,
    status: PAYMENT_STATUSES.PENDING_PAYMENT,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'create',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  await recordStatusHistory({
    paymentId: payment.id,
    previousStatus: null,
    newStatus: PAYMENT_STATUSES.PENDING_PAYMENT,
    changedBy: currentUser.id,
    reason: 'Manual bank transfer created.',
  });

  return buildPaymentResponse(payment, registration.id);
};

const previewCoupon = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);
  await syncRegistrationPaymentPreferences(registration, payload);

  const coupon = await getActiveCouponByCode(payload.code);
  const couponPreview = buildCouponPreview({
    coupon,
    baseAmount: payload.baseAmount !== undefined ? payload.baseAmount : registration.pendingAmount,
  });

  return {
    coupon,
    couponPreview,
  };
};

const redeemCoupon = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);

  const coupon = await getActiveCouponByCode(payload.code);
  const couponPreview = buildCouponPreview({
    coupon,
    baseAmount: payload.baseAmount !== undefined ? payload.baseAmount : registration.pendingAmount,
  });

  if (couponPreview.finalAmount > 0) {
    throw new AppError('The coupon does not fully cover the requested amount.', 409);
  }

  if (couponPreview.discountAmount <= 0) {
    throw new AppError('The coupon does not apply to this payment.', 409);
  }

  const amounts = await normalizePaymentAmounts({
    currency: 'USD',
    amountUsd: couponPreview.discountAmount,
  });

  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: COUPON_PAYMENT_METHOD,
    provider: PAYMENT_PROVIDERS.COUPON,
    includesTour: resolvePaymentIncludesTour(payload),
    requiresInvoice: resolveRequiresInvoice(payload),
    transactionReference: `COUPON-${coupon.code}-${Date.now()}`,
    providerResponseJson: {
      couponCode: coupon.code,
      percentage: Number(coupon.percentage || 0),
      discountAmount: couponPreview.discountAmount,
      includeTaxes: resolveRequiresInvoice(payload),
    },
    paymentDate: new Date(),
    status: PAYMENT_STATUSES.APPROVED,
  });

  await recordStatusHistory({
    paymentId: payment.id,
    previousStatus: null,
    newStatus: PAYMENT_STATUSES.APPROVED,
    changedBy: currentUser.id,
    reason: `Coupon ${coupon.code} redeemed.`,
    providerResponseJson: payment.providerResponseJson,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'redeem-coupon',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return {
    ...(await buildPaymentResponse(payment, registration.id)),
    couponRedemption: {
      code: coupon.code,
      percentage: Number(coupon.percentage || 0),
      coveredAmount: couponPreview.discountAmount,
    },
  };
};

const uploadPaymentProof = async (paymentId, uploadedFile, payload, currentUser) => {
  if (!uploadedFile) {
    throw new AppError('Payment proof file is required.', 400);
  }

  const payment = await getPaymentWithRegistration(paymentId);
  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  assertRegistrationAccess(payment.registration, currentUser);

  if (![PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.PAYPHONE].includes(payment.paymentMethod)) {
    throw new AppError('Proof upload is only available for bank transfer or PayPhone payments.', 400);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    throw new AppError('Approved payments cannot receive a new proof file.', 409);
  }

  const storedFile = await uploadPaymentProofFile({
    paymentId: payment.id,
    originalName: uploadedFile.originalName,
    buffer: uploadedFile.buffer,
    mimeType: uploadedFile.mimeType || 'application/octet-stream',
    extension: uploadedFile.extension,
  });

  await payment.update({
    paymentProofFilename: storedFile.originalName,
    paymentProofMimeType: storedFile.mimeType,
    paymentProofSizeBytes: storedFile.size,
    paymentProofBucketKey: storedFile.bucketKey,
    paymentProofUrl: storedFile.publicUrl,
    transactionReference: payload?.transactionReference || payment.transactionReference,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'upload-proof',
    entity: 'payment',
    entityId: payment.id,
    newValue: {
      ...payment.toJSON(),
      uploadedProof: storedFile,
    },
  });

  await updatePaymentStatus({
    payment,
    status: PAYMENT_STATUSES.PENDING_VALIDATION,
    changedBy: currentUser.id,
    reason:
      payment.paymentMethod === PAYMENT_METHODS.PAYPHONE
        ? 'Payment proof uploaded for PayPhone request.'
        : 'Payment proof uploaded for bank transfer.',
  });

  return {
    ...(await buildPaymentResponse(payment, payment.registrationId)),
    uploadedFile: {
      ...storedFile,
      signedUrl: storedFile.bucketKey ? getSignedObjectUrl({ key: storedFile.bucketKey }) : null,
    },
  };
};

const approvePayment = async (paymentId, reviewedAmount, currentUser) => {
  assertAdminAccess(currentUser);
  const payment = await getPaymentWithRegistration(paymentId);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  if (payment.provider === PAYMENT_PROVIDERS.COBRU) {
    throw new AppError('Use Cobru reconciliation to confirm this payment.', 409);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    return buildPaymentResponse(payment, payment.registrationId);
  }

  await applyReviewedAmount(payment, reviewedAmount);
  assertPaymentCanBeApproved(payment);

  await updatePaymentStatus({
    payment,
    status: PAYMENT_STATUSES.APPROVED,
    changedBy: currentUser.id,
    reason: 'Payment approved manually.',
    validatedBy: currentUser.id,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'approve',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  await maybeSendApprovalEmail(payment, payment.registration);
  return buildPaymentResponse(payment, payment.registrationId);
};

const rejectPayment = async (paymentId, rejectionReason, currentUser) => {
  assertAdminAccess(currentUser);
  const payment = await getPaymentWithRegistration(paymentId);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  if (payment.provider === PAYMENT_PROVIDERS.COBRU) {
    throw new AppError('Use Cobru reconciliation to update this payment.', 409);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    throw new AppError('Approved payments cannot be rejected.', 409);
  }

  if (requiresProofValidation(payment) && payment.status !== PAYMENT_STATUSES.PENDING_VALIDATION) {
    throw new AppError('This payment is not ready for administrative validation yet.', 409);
  }

  await updatePaymentStatus({
    payment,
    status: PAYMENT_STATUSES.REJECTED,
    changedBy: currentUser.id,
    reason: rejectionReason || 'Payment rejected manually.',
    validatedBy: currentUser.id,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'reject',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return buildPaymentResponse(payment, payment.registrationId);
};

const cancelPayment = async (paymentId, currentUser) => {
  assertAdminAccess(currentUser);
  const payment = await getPaymentWithRegistration(paymentId);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  if (payment.provider === PAYMENT_PROVIDERS.COBRU) {
    throw new AppError('Expire the payment in Cobru and reconcile it before cancelling locally.', 409);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    throw new AppError('Approved payments cannot be cancelled.', 409);
  }

  if (payment.status === PAYMENT_STATUSES.CANCELLED) {
    return buildPaymentResponse(payment, payment.registrationId);
  }

  await updatePaymentStatus({
    payment,
    status: PAYMENT_STATUSES.CANCELLED,
    changedBy: currentUser.id,
    reason: 'Payment cancelled manually.',
    validatedBy: currentUser.id,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'cancel',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return buildPaymentResponse(payment, payment.registrationId);
};

const createPayPhonePayment = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);
  await syncRegistrationPaymentPreferences(registration, payload);

  const amounts = await resolveRequestedAmounts(payload, registration);
  const pendingAmount = Number(registration.pendingAmount || 0);
  if (pendingAmount <= 0) {
    throw new AppError('The registration has no pending balance.', 409);
  }

  const reusablePayment = await findReusablePendingPayment({
    registrationId: registration.id,
    paymentMethod: PAYMENT_METHODS.PAYPHONE,
    amountUsd: amounts.amountUsd,
    currency: amounts.currency,
    includesTour: resolvePaymentIncludesTour(payload),
    includesTax: resolveRequiresInvoice(payload),
  });

  if (reusablePayment) {
    return buildPaymentResponse(reusablePayment, registration.id);
  }

  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: PAYMENT_METHODS.PAYPHONE,
    provider: PAYMENT_PROVIDERS.PAYPHONE,
    includesTour: resolvePaymentIncludesTour(payload),
    requiresInvoice: resolveRequiresInvoice(payload),
    taxAmount: payload.taxAmount,
    transactionReference: payload.transactionReference || null,
    providerResponseJson: {
      requestType: 'manual_payphone_request',
      comment: payload.comment || payload.notes || null,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString(),
    },
    status: PAYMENT_STATUSES.PENDING_LINK,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'create-payphone-payment',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  await recordStatusHistory({
    paymentId: payment.id,
    previousStatus: null,
    newStatus: PAYMENT_STATUSES.PENDING_LINK,
    changedBy: currentUser.id,
    reason: 'Manual PayPhone payment request created.',
    providerResponseJson: payment.providerResponseJson,
  });

  return buildPaymentResponse(payment, registration.id);
};

const sendPayPhoneLink = async (paymentId, paymentLink, currentUser) => {
  assertAdminAccess(currentUser);
  const payment = await getPaymentWithRegistration(paymentId);
  const normalizedPaymentLink = normalizePaymentLink(paymentLink);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  if (!normalizedPaymentLink) {
    throw new AppError('paymentLink is required.', 400);
  }

  if (payment.paymentMethod !== PAYMENT_METHODS.PAYPHONE) {
    throw new AppError('This action is only available for PayPhone payments.', 400);
  }

  if (payment.status !== PAYMENT_STATUSES.PENDING_LINK) {
    throw new AppError('The PayPhone link can only be marked as sent from pending link status.', 409);
  }

  const providerResponseJson = {
    ...(payment.providerResponseJson || {}),
    paymentLink: normalizedPaymentLink,
    payphoneLinkSentAt: new Date().toISOString(),
    payphoneLinkSentByUserId: currentUser.id,
  };

  await payment.update({
    paymentUrl: normalizedPaymentLink,
  });
  await payment.reload();

  await updatePaymentStatus({
    payment,
    status: PAYMENT_STATUSES.PENDING_PAYMENT,
    changedBy: currentUser.id,
    reason: 'PayPhone link sent by administrator.',
    providerResponseJson,
    validatedBy: null,
  });

  const participant = payment.registration?.userId
    ? await User.findByPk(payment.registration.userId)
    : null;

  if (participant?.email) {
    dispatchEmailInBackground(
      () =>
        sendPayPhoneLinkEmail({
          user: participant,
          payment,
          paymentLink: payment.paymentUrl,
        }),
      'PayPhone link email'
    );
  }

  await createAuditLog({
    userId: currentUser.id,
    action: 'send-payphone-link',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return buildPaymentResponse(payment, payment.registrationId);
};

const handlePayPhoneCallback = async () => {
  return {
    received: true,
    ignored: true,
    message: 'PayPhone callbacks are disabled because payments are now registered manually.',
  };
};

const listPaymentsByRegistration = async (registrationId, currentUser) => {
  const registration = await Registration.findByPk(registrationId);
  assertRegistrationAccess(registration, currentUser);

  return Payment.findAll({
    where: { registrationId },
    include: ['validator', 'statusHistory'],
    order: [['createdAt', 'DESC']],
  }).then((payments) =>
    payments.map((payment) => ({
      ...payment.toJSON(),
      includesTax: Boolean(payment.includesTax),
      taxAmount: Number(payment.taxAmount || 0),
    }))
  );
};

const getPaymentProofAccess = async (paymentId, currentUser) => {
  const payment = await getPaymentWithRegistration(paymentId);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  assertRegistrationAccess(payment.registration, currentUser);

  if (!payment.paymentProofBucketKey && !payment.paymentProofUrl) {
    throw new AppError('Payment proof not found.', 404);
  }

  return {
    paymentId: payment.id,
    bucketKey: payment.paymentProofBucketKey || null,
    originalName: payment.paymentProofFilename || null,
    mimeType: payment.paymentProofMimeType || null,
    size: payment.paymentProofSizeBytes || null,
    signedUrl: payment.paymentProofBucketKey ? getSignedObjectUrl({ key: payment.paymentProofBucketKey }) : null,
    publicUrl: payment.paymentProofUrl || null,
  };
};

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  normalizePaymentAmounts,
  previewCoupon,
  redeemCoupon,
  createBankTransferPayment,
  uploadPaymentProof,
  approvePayment,
  rejectPayment,
  cancelPayment,
  sendPayPhoneLink,
  ...require('./cobruPaymentService')({
    assertRegistrationAccess, syncRegistrationPaymentPreferences, createPaymentRecord,
    updatePaymentStatus, buildPaymentResponse, calculateRegistrationTotals, maybeSendApprovalEmail,
  }),
  createPayPhonePayment,
  handlePayPhoneCallback,
  listPaymentsByRegistration,
  getPaymentProofAccess,
};
