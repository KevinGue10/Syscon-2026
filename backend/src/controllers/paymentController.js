const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { sendSuccess } = require('../utils/responseContract');

const createBankTransferPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createBankTransferPayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Pago por transferencia bancaria creado correctamente.',
    data: result,
  });
});

const previewCoupon = asyncHandler(async (req, res) => {
  const result = await paymentService.previewCoupon(req.body, req.user);
  return sendSuccess(res, {
    message: 'Cupon validado correctamente.',
    data: result,
  });
});

const redeemCoupon = asyncHandler(async (req, res) => {
  const result = await paymentService.redeemCoupon(req.body, req.user);
  return sendSuccess(res, {
    message: 'Cupon aplicado correctamente.',
    data: result,
  });
});

const uploadPaymentProof = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId || req.body.paymentId;
  const result = await paymentService.uploadPaymentProof(paymentId, req.uploadedFile, req.body, req.user);
  return sendSuccess(res, {
    message: 'Comprobante cargado correctamente.',
    data: result,
  });
});

const approvePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.approvePayment(req.params.paymentId, req.body.reviewedAmount, req.user);
  return sendSuccess(res, {
    message: 'Pago aprobado correctamente.',
    data: result,
  });
});

const rejectPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.rejectPayment(req.params.paymentId, req.body.rejectionReason, req.user);
  return sendSuccess(res, {
    message: 'Pago rechazado correctamente.',
    data: result,
  });
});

const cancelPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.cancelPayment(req.params.paymentId, req.user);
  return sendSuccess(res, {
    message: 'Pago cancelado correctamente.',
    data: result,
  });
});

const sendPayPhoneLink = asyncHandler(async (req, res) => {
  const result = await paymentService.sendPayPhoneLink(req.params.paymentId, req.body.paymentLink, req.user);
  return sendSuccess(res, {
    message: 'El enlace de PayPhone fue marcado como enviado correctamente.',
    data: result,
  });
});

const createPayPalOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayPalOrder(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Orden de PayPal creada correctamente.',
    data: result,
  });
});

const capturePayPalOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.capturePayPalOrder(req.body, req.user);
  return sendSuccess(res, {
    message: 'Orden de PayPal capturada correctamente.',
    data: result,
  });
});

const handlePayPalWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handlePayPalWebhook({
    headers: req.headers,
    body: req.body,
  });

  return sendSuccess(res, {
    message: 'Webhook de PayPal recibido correctamente.',
    data: result,
  });
});

const createPayPhonePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayPhonePayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Solicitud de pago con tarjeta registrada correctamente.',
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
    message: 'Callback de PayPhone ignorado.',
    data: result,
  });
});

const listPaymentsByRegistration = asyncHandler(async (req, res) => {
  const payments = await paymentService.listPaymentsByRegistration(req.params.registrationId, req.user);
  return sendSuccess(res, {
    message: 'Pagos obtenidos correctamente.',
    data: { payments },
  });
});

const getPaymentProofAccess = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentProofAccess(req.params.paymentId, req.user);
  return sendSuccess(res, {
    message: 'Acceso al comprobante obtenido correctamente.',
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
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  createPayPhonePayment,
  handlePayPhoneCallback,
  listPaymentsByRegistration,
  getPaymentProofAccess,
};
