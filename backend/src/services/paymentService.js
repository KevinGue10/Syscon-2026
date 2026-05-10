const { Payment, PaymentStatusHistory, Registration, User, DollarRate } = require('../models');
const { PAYMENT_STATUSES, USER_ROLES } = require('../constants/enums');
const { calculateRegistrationTotals } = require('./pricingService');
const { createAuditLog } = require('./auditService');
const { sendPaymentConfirmationEmail } = require('./emailService');
const AppError = require('../utils/errors');
const env = require('../config/env');
const paypalService = require('./paypalService');
const payphoneService = require('./payphoneService');

const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  PAYPAL: 'paypal',
  PAYPHONE: 'payphone',
};

const PAYMENT_PROVIDERS = {
  MANUAL: 'manual_bank_transfer',
  PAYPAL: 'paypal',
  PAYPHONE: 'payphone',
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

const resolveExchangeRate = async () => {
  const latestRate = await DollarRate.findOne({
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

const buildPublicFileUrl = (relativePath) => {
  const normalizedBase = String(env.app.baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  return `${normalizedBase}/${normalizedPath}`;
};

const createPaymentRecord = async ({
  registration,
  amounts,
  paymentMethod,
  provider,
  transactionReference = null,
  providerPaymentId = null,
  paymentUrl = null,
  providerResponseJson = null,
  paymentDate = null,
  status = PAYMENT_STATUSES.PENDING,
}) => {
  return Payment.create({
    registrationId: registration.id,
    amountUsd: amounts.amountUsd,
    amountCop: amounts.amountCop,
    currency: amounts.currency,
    paymentMethod,
    provider,
    transactionReference,
    providerPaymentId,
    paymentUrl,
    providerResponseJson,
    status,
    paymentDate,
  });
};

const buildPaymentResponse = async (payment, registrationId) => {
  const summary = await calculateRegistrationTotals(registrationId);
  const refreshedPayment = await Payment.findByPk(payment.id, {
    include: ['registration', 'validator', 'statusHistory'],
  });

  return {
    payment: refreshedPayment,
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

  const amounts = await resolveRequestedAmounts(payload, registration);
  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    provider: PAYMENT_PROVIDERS.MANUAL,
    transactionReference: payload.transactionReference || null,
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
    newStatus: PAYMENT_STATUSES.PENDING,
    changedBy: currentUser.id,
    reason: 'Manual bank transfer created.',
  });

  return buildPaymentResponse(payment, registration.id);
};

const uploadBankTransferProof = async (paymentId, uploadedFile, currentUser) => {
  if (!uploadedFile) {
    throw new AppError('Payment proof file is required.', 400);
  }

  const payment = await getPaymentWithRegistration(paymentId);
  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  assertRegistrationAccess(payment.registration, currentUser);

  if (payment.paymentMethod !== PAYMENT_METHODS.BANK_TRANSFER) {
    throw new AppError('Proof upload is only available for bank transfer payments.', 400);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    throw new AppError('Approved payments cannot receive a new proof file.', 409);
  }

  await payment.update({
    paymentProofFilename: uploadedFile.filename,
    paymentProofUrl: buildPublicFileUrl(uploadedFile.relativePath),
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'upload-proof',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return buildPaymentResponse(payment, payment.registrationId);
};

const approvePayment = async (paymentId, currentUser) => {
  assertAdminAccess(currentUser);
  const payment = await getPaymentWithRegistration(paymentId);

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    return buildPaymentResponse(payment, payment.registrationId);
  }

  if (payment.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER && !payment.paymentProofUrl) {
    throw new AppError('Manual transfer proof is required before approval.', 409);
  }

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

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    throw new AppError('Approved payments cannot be rejected.', 409);
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

const createPayPalOrder = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);

  const amounts = await resolveRequestedAmounts(payload, registration);
  const pendingAmount = Number(registration.pendingAmount || 0);
  if (pendingAmount <= 0) {
    throw new AppError('The registration has no pending balance.', 409);
  }

  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: PAYMENT_METHODS.PAYPAL,
    provider: PAYMENT_PROVIDERS.PAYPAL,
  });

  const order = await paypalService.createOrder({
    paymentId: payment.id,
    registrationId: registration.id,
    amountUsd: amounts.amountUsd,
    currency: amounts.currency,
  });

  await payment.update({
    providerPaymentId: order.id,
    paymentUrl: order.approvalUrl,
    providerResponseJson: order.raw,
  });

  await createAuditLog({
    userId: currentUser.id,
    action: 'create-paypal-order',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  await recordStatusHistory({
    paymentId: payment.id,
    previousStatus: null,
    newStatus: PAYMENT_STATUSES.PENDING,
    changedBy: currentUser.id,
    reason: 'PayPal order created.',
    providerResponseJson: order.raw,
  });

  return buildPaymentResponse(payment, registration.id);
};

const capturePayPalOrder = async ({ orderId }, currentUser) => {
  const payment = await Payment.findOne({
    where: {
      provider: PAYMENT_PROVIDERS.PAYPAL,
      providerPaymentId: orderId,
    },
    include: [{ association: 'registration' }],
  });

  if (!payment) {
    throw new AppError('PayPal payment not found for the provided order.', 404);
  }

  assertRegistrationAccess(payment.registration, currentUser);

  if (payment.status === PAYMENT_STATUSES.APPROVED) {
    return buildPaymentResponse(payment, payment.registrationId);
  }

  const captureResponse = await paypalService.captureOrder(orderId);
  const normalizedStatus = String(captureResponse.status || '').toUpperCase();

  if (normalizedStatus === 'COMPLETED') {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.APPROVED,
      changedBy: currentUser.id,
      reason: 'PayPal order captured by backend.',
      providerResponseJson: captureResponse.raw,
    });
    await maybeSendApprovalEmail(payment, payment.registration);
  } else if (['VOIDED', 'DECLINED', 'FAILED'].includes(normalizedStatus)) {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.REJECTED,
      changedBy: currentUser.id,
      reason: `PayPal capture returned status ${normalizedStatus}.`,
      providerResponseJson: captureResponse.raw,
    });
  } else {
    await payment.update({
      providerResponseJson: captureResponse.raw,
    });
  }

  await createAuditLog({
    userId: currentUser.id,
    action: 'capture-paypal-order',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return buildPaymentResponse(payment, payment.registrationId);
};

const handlePayPalWebhook = async ({ headers, body }) => {
  const isValid = await paypalService.verifyWebhook({
    headers,
    body,
  });

  if (!isValid) {
    throw new AppError('Invalid PayPal webhook signature.', 400);
  }

  const eventType = String(body.event_type || '');
  const orderId =
    body.resource?.supplementary_data?.related_ids?.order_id ||
    body.resource?.id ||
    body.resource?.order_id ||
    null;

  if (!orderId) {
    return { received: true, ignored: true };
  }

  const payment = await Payment.findOne({
    where: {
      provider: PAYMENT_PROVIDERS.PAYPAL,
      providerPaymentId: orderId,
    },
    include: [{ association: 'registration' }],
  });

  if (!payment) {
    return { received: true, ignored: true };
  }

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.APPROVED,
      reason: 'PayPal webhook confirmed capture.',
      providerResponseJson: body,
    });
    await maybeSendApprovalEmail(payment, payment.registration);
  }

  if (['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED'].includes(eventType)) {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.REJECTED,
      reason: `PayPal webhook event ${eventType}.`,
      providerResponseJson: body,
    });
  }

  await createAuditLog({
    userId: payment.registration.userId,
    action: 'paypal-webhook',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return { received: true };
};

const createPayPhonePayment = async (payload, currentUser) => {
  const registration = await Registration.findByPk(payload.registrationId);
  assertRegistrationAccess(registration, currentUser);

  const amounts = await resolveRequestedAmounts(payload, registration);
  const pendingAmount = Number(registration.pendingAmount || 0);
  if (pendingAmount <= 0) {
    throw new AppError('The registration has no pending balance.', 409);
  }

  const payment = await createPaymentRecord({
    registration,
    amounts,
    paymentMethod: PAYMENT_METHODS.PAYPHONE,
    provider: PAYMENT_PROVIDERS.PAYPHONE,
  });

  const providerPayment = await payphoneService.createPayment({
    paymentId: payment.id,
    registrationId: registration.id,
    amountUsd: amounts.amountUsd,
    currency: amounts.currency,
  });

  await payment.update({
    providerPaymentId: providerPayment.providerPaymentId,
    paymentUrl: providerPayment.paymentUrl,
    providerResponseJson: providerPayment.raw,
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
    newStatus: PAYMENT_STATUSES.PENDING,
    changedBy: currentUser.id,
    reason: 'PayPhone payment link created.',
    providerResponseJson: providerPayment.raw,
  });

  return buildPaymentResponse(payment, registration.id);
};

const handlePayPhoneCallback = async ({ headers, query, body }) => {
  payphoneService.validateCallbackRequest({ headers, query });
  const callbackData = payphoneService.normalizeCallbackPayload(body);
  const payment = await Payment.findByPk(callbackData.paymentId, {
    include: [{ association: 'registration' }],
  });

  if (!payment || payment.provider !== PAYMENT_PROVIDERS.PAYPHONE) {
    return { received: true, ignored: true };
  }

  await payment.update({
    providerPaymentId: callbackData.providerPaymentId || payment.providerPaymentId,
    providerResponseJson: body,
  });

  if (callbackData.approved) {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.APPROVED,
      reason: 'PayPhone callback confirmed payment.',
      providerResponseJson: body,
    });
    await maybeSendApprovalEmail(payment, payment.registration);
  } else if (callbackData.rejected) {
    await updatePaymentStatus({
      payment,
      status: PAYMENT_STATUSES.REJECTED,
      reason: callbackData.reason || 'PayPhone callback rejected payment.',
      providerResponseJson: body,
    });
  }

  await createAuditLog({
    userId: payment.registration.userId,
    action: 'payphone-callback',
    entity: 'payment',
    entityId: payment.id,
    newValue: payment.toJSON(),
  });

  return { received: true };
};

const listPaymentsByRegistration = async (registrationId, currentUser) => {
  const registration = await Registration.findByPk(registrationId);
  assertRegistrationAccess(registration, currentUser);

  return Payment.findAll({
    where: { registrationId },
    include: ['validator', 'statusHistory'],
    order: [['createdAt', 'DESC']],
  });
};

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  normalizePaymentAmounts,
  createBankTransferPayment,
  uploadBankTransferProof,
  approvePayment,
  rejectPayment,
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  createPayPhonePayment,
  handlePayPhoneCallback,
  listPaymentsByRegistration,
};
