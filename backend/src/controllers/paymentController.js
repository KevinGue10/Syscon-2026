const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { sendSuccess } = require('../utils/responseContract');

const createBankTransferPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createBankTransferPayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Bank transfer payment created successfully.",
    data: result,
  });
});

const previewCoupon = asyncHandler(async (req, res) => {
  const result = await paymentService.previewCoupon(req.body, req.user);
  return sendSuccess(res, {
    message: "Coupon validated successfully.",
    data: result,
  });
});

const redeemCoupon = asyncHandler(async (req, res) => {
  const result = await paymentService.redeemCoupon(req.body, req.user);
  return sendSuccess(res, {
    message: "Coupon applied successfully.",
    data: result,
  });
});

const uploadPaymentProof = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId || req.body.paymentId;
  const result = await paymentService.uploadPaymentProof(paymentId, req.uploadedFile, req.body, req.user);
  return sendSuccess(res, {
    message: "Receipt uploaded successfully.",
    data: result,
  });
});

const approvePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.approvePayment(req.params.paymentId, req.body.reviewedAmount, req.user);
  return sendSuccess(res, {
    message: "Payment approved successfully.",
    data: result,
  });
});

const rejectPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.rejectPayment(req.params.paymentId, req.body.rejectionReason, req.user);
  return sendSuccess(res, {
    message: "Payment rejected successfully.",
    data: result,
  });
});

const cancelPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.cancelPayment(req.params.paymentId, req.user);
  return sendSuccess(res, {
    message: "Payment cancelled successfully.",
    data: result,
  });
});

const sendPayPhoneLink = asyncHandler(async (req, res) => {
  const result = await paymentService.sendPayPhoneLink(req.params.paymentId, req.body.paymentLink, req.user);
  return sendSuccess(res, {
    message: "The PayPhone link was marked as sent successfully.",
    data: result,
  });
});

const createCobruPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createCobruPayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Cobru payment link created successfully.",
    data: result,
  });
});

const refreshCobruPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.refreshCobruPayment(req.params.paymentId, req.user);
  return sendSuccess(res, {
    message: "Cobru payment status checked successfully.",
    data: result,
  });
});

const handleCobruWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handleCobruWebhook({
    query: req.query,
    body: req.body,
  });

  return sendSuccess(res, {
    message: "Cobru webhook received successfully.",
    data: result,
  });
});

const createPayPhonePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayPhonePayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Card payment request registered successfully.",
    data: result,
  });
});

const handlePayPhoneCallback = asyncHandler(async (req, res) => {
  const result = await paymentService.handlePayPhoneCallback({
    headers: req.headers,
    query: req.query,
    body: req.body,
  });

  return sendSuccess(res, {
    message: "PayPhone callback ignored.",
    data: result,
  });
});

const listPaymentsByRegistration = asyncHandler(async (req, res) => {
  const payments = await paymentService.listPaymentsByRegistration(req.params.registrationId, req.user);
  return sendSuccess(res, {
    message: "Payments retrieved successfully.",
    data: { payments },
  });
});

const getPaymentProofAccess = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentProofAccess(req.params.paymentId, req.user);
  return sendSuccess(res, {
    message: "Receipt access retrieved successfully.",
    data: result,
  });
});

module.exports = {
  previewCoupon,
  redeemCoupon,
  createBankTransferPayment,
  uploadPaymentProof,
  approvePayment,
  rejectPayment,
  cancelPayment,
  sendPayPhoneLink,
  createCobruPayment,
  refreshCobruPayment,
  handleCobruWebhook,
  createPayPhonePayment,
  handlePayPhoneCallback,
  listPaymentsByRegistration,
  getPaymentProofAccess,
};
