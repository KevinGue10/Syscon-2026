const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { uploadPaymentProof } = require('../middlewares/uploadMiddleware');
const {
  bankTransferValidation,
  paymentProofValidation,
  paymentApprovalValidation,
  paymentRejectionValidation,
  paypalCreateOrderValidation,
  paypalCaptureOrderValidation,
  payphoneCreatePaymentValidation,
  registrationPaymentsValidation,
} = require('../validations/paymentValidations');

const router = express.Router();

router.post('/paypal/webhook', paymentController.handlePayPalWebhook);
router.post('/payphone/callback', paymentController.handlePayPhoneCallback);

router.use(authMiddleware);

router.post('/bank-transfer', bankTransferValidation, validationMiddleware, paymentController.createBankTransferPayment);
router.post(
  '/:paymentId/proof',
  paymentProofValidation,
  validationMiddleware,
  uploadPaymentProof,
  paymentController.uploadPaymentProof
);
router.patch(
  '/:paymentId/approve',
  adminMiddleware,
  paymentApprovalValidation,
  validationMiddleware,
  paymentController.approvePayment
);
router.patch(
  '/:paymentId/reject',
  adminMiddleware,
  paymentRejectionValidation,
  validationMiddleware,
  paymentController.rejectPayment
);
router.post('/paypal/create-order', paypalCreateOrderValidation, validationMiddleware, paymentController.createPayPalOrder);
router.post('/paypal/capture-order', paypalCaptureOrderValidation, validationMiddleware, paymentController.capturePayPalOrder);
router.post(
  '/payphone/create-payment',
  payphoneCreatePaymentValidation,
  validationMiddleware,
  paymentController.createPayPhonePayment
);
router.get(
  '/registration/:registrationId',
  registrationPaymentsValidation,
  validationMiddleware,
  paymentController.listPaymentsByRegistration
);

module.exports = router;
