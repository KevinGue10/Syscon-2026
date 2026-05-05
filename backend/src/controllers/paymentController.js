const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');

const createPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment(req.body, req.user);
  res.status(201).json({
    message: 'Payment record created successfully.',
    ...result,
  });
});

const listPaymentsByRegistration = asyncHandler(async (req, res) => {
  const payments = await paymentService.listPaymentsByRegistration(req.params.registrationId, req.user);
  res.json({ payments });
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.updatePaymentStatus(req.params.id, req.body.status, req.user);
  res.json({
    message: 'Payment status updated successfully.',
    ...result,
  });
});

module.exports = {
  createPayment,
  listPaymentsByRegistration,
  updatePaymentStatus,
};
