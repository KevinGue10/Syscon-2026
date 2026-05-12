const { body, param } = require('express-validator');

const paymentIdParamValidation = [
  param('paymentId').isInt({ min: 1 }).withMessage('Valid payment id is required.'),
];

const registrationPaymentsValidation = [
  param('registrationId').isInt({ min: 1 }).withMessage('Valid registration id is required.'),
];

const amountValidation = [
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be greater than 0.'),
  body('amountUsd').optional().isFloat({ gt: 0 }).withMessage('amountUsd must be greater than 0.'),
  body('amountCop').optional().isFloat({ gt: 0 }).withMessage('amountCop must be greater than 0.'),
  body('currency').optional().isIn(['USD', 'COP']).withMessage('currency must be USD or COP.'),
];

const couponValidation = [
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId is required.'),
  body('code').trim().notEmpty().withMessage('code is required.'),
  body('baseAmount').optional().isFloat({ min: 0 }).withMessage('baseAmount must be 0 or greater.'),
  body('includeTaxes').optional().isBoolean(),
];

const bankTransferValidation = [
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId is required.'),
  ...amountValidation,
  body('transactionReference').optional({ nullable: true }).isString(),
];

const paymentProofValidation = [
  ...paymentIdParamValidation,
  body('transactionReference').optional({ nullable: true }).isString(),
];

const paymentProofUploadValidation = [
  body('paymentId').isInt({ min: 1 }).withMessage('paymentId is required.'),
  body('transactionReference').optional({ nullable: true }).isString(),
];

const paymentApprovalValidation = [
  ...paymentIdParamValidation,
  body('reviewedAmount').optional().isFloat({ gt: 0 }).withMessage('reviewedAmount must be greater than 0.'),
];

const paymentRejectionValidation = [
  ...paymentIdParamValidation,
  body('rejectionReason').trim().notEmpty().withMessage('rejectionReason is required.'),
];

const paypalCreateOrderValidation = [
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId is required.'),
  ...amountValidation,
];

const paypalCaptureOrderValidation = [
  body('orderId').trim().notEmpty().withMessage('orderId is required.'),
];

const payphoneCreatePaymentValidation = [
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId is required.'),
  ...amountValidation,
];

module.exports = {
  couponValidation,
  bankTransferValidation,
  paymentProofValidation,
  paymentProofUploadValidation,
  paymentApprovalValidation,
  paymentRejectionValidation,
  paypalCreateOrderValidation,
  paypalCaptureOrderValidation,
  payphoneCreatePaymentValidation,
  registrationPaymentsValidation,
};
