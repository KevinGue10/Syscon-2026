const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { uploadPaymentProof } = require('../middlewares/uploadMiddleware');
const {
  couponValidation,
  bankTransferValidation,
  paymentProofValidation,
  paymentProofUploadValidation,
  paymentApprovalValidation,
  payphoneSendLinkValidation,
  paymentCancellationValidation,
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

router.post('/coupons/preview', couponValidation, validationMiddleware, paymentController.previewCoupon);
router.post('/coupons/redeem', couponValidation, validationMiddleware, paymentController.redeemCoupon);
router.post('/bank-transfer', bankTransferValidation, validationMiddleware, paymentController.createBankTransferPayment);
router.post(
  '/upload-proof',
  uploadPaymentProof,
  paymentProofUploadValidation,
  validationMiddleware,
  paymentController.uploadPaymentProof
);
router.post(
  '/:paymentId/proof',
  paymentProofValidation,
  validationMiddleware,
  uploadPaymentProof,
  paymentController.uploadPaymentProof
);
router.patch(
  '/:paymentId/send-link',
  adminMiddleware,
  payphoneSendLinkValidation,
  validationMiddleware,
  paymentController.sendPayPhoneLink
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
router.patch(
  '/:paymentId/cancel',
  adminMiddleware,
  paymentCancellationValidation,
  validationMiddleware,
  paymentController.cancelPayment
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
  '/:paymentId/proof-access',
  paymentProofValidation,
  validationMiddleware,
  paymentController.getPaymentProofAccess
);
router.get(
  '/registration/:registrationId',
  registrationPaymentsValidation,
  validationMiddleware,
  paymentController.listPaymentsByRegistration
);

module.exports = router;
