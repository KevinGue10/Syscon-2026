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

const uploadPaymentProof = asyncHandler(async (req, res) => {
  const result = await paymentService.uploadBankTransferProof(req.params.paymentId, req.uploadedFile, req.user);
  return sendSuccess(res, {
    message: 'Comprobante cargado correctamente.',
    data: result,
  });
});

const approvePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.approvePayment(req.params.paymentId, req.user);
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
    message: 'Pago de PayPhone creado correctamente.',
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
    message: 'Callback de PayPhone recibido correctamente.',
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

module.exports = {
  createBankTransferPayment,
  uploadPaymentProof,
  approvePayment,
  rejectPayment,
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  createPayPhonePayment,
  handlePayPhoneCallback,
  listPaymentsByRegistration,
};
