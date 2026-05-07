const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { sendSuccess } = require('../utils/responseContract');

const createPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Pago registrado correctamente.',
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

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.updatePaymentStatus(req.params.id, req.body.status, req.user);
  return sendSuccess(res, {
    message: 'Estado del pago actualizado correctamente.',
    data: result,
  });
});

module.exports = {
  createPayment,
  listPaymentsByRegistration,
  updatePaymentStatus,
};
