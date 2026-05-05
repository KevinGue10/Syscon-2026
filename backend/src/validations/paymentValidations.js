const { body, param } = require('express-validator');
const { PAYMENT_STATUSES } = require('../constants/enums');

const createPaymentValidation = [
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId is required.'),
  body('amount').optional().isFloat({ gt: 0 }),
  body('amountUsd').optional().isFloat({ gt: 0 }),
  body('amountCop').optional().isFloat({ gt: 0 }),
  body('currency').trim().notEmpty().withMessage('currency is required.'),
  body('paymentMethod').trim().notEmpty().withMessage('paymentMethod is required.'),
  body('transactionReference').trim().notEmpty().withMessage('transactionReference is required.'),
  body('status').optional().isIn(Object.values(PAYMENT_STATUSES)),
  body('paymentDate').optional().isISO8601().withMessage('paymentDate must be a valid date.'),
];

const paymentStatusValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid payment id is required.'),
  body('status')
    .isIn(Object.values(PAYMENT_STATUSES))
    .withMessage('status must be pending, approved, or rejected.'),
];

const registrationPaymentsValidation = [
  param('registrationId').isInt({ min: 1 }).withMessage('Valid registration id is required.'),
];

module.exports = {
  createPaymentValidation,
  paymentStatusValidation,
  registrationPaymentsValidation,
};
