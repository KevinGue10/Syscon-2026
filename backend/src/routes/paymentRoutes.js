const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const {
  createPaymentValidation,
  paymentStatusValidation,
  registrationPaymentsValidation,
} = require('../validations/paymentValidations');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createPaymentValidation, validationMiddleware, paymentController.createPayment);
router.get(
  '/registration/:registrationId',
  registrationPaymentsValidation,
  validationMiddleware,
  paymentController.listPaymentsByRegistration
);
router.patch('/:id/status', paymentStatusValidation, validationMiddleware, paymentController.updatePaymentStatus);

module.exports = router;
