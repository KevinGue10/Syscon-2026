const express = require('express');
const registrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const {
  registrationIdParamValidation,
  createRegistrationValidation,
  updateRegistrationValidation,
  addPaperValidation,
  paymentPreviewValidation,
} = require('../validations/registrationValidations');
const { fullDetailsValidation } = require('../validations/userValidations');

const router = express.Router();

router.post('/payment-preview', paymentPreviewValidation, validationMiddleware, registrationController.previewPaymentSummary);
router.use(authMiddleware);
router.post('/', createRegistrationValidation, validationMiddleware, registrationController.createRegistration);
router.get('/me', registrationController.getMyRegistrations);
router.get('/:id', registrationIdParamValidation, validationMiddleware, registrationController.getRegistrationById);
router.put('/:id', updateRegistrationValidation, validationMiddleware, registrationController.updateRegistration);
router.put('/:id/full-details', [...registrationIdParamValidation, ...fullDetailsValidation], validationMiddleware, registrationController.updateFullDetails);
router.post('/:id/papers', addPaperValidation, validationMiddleware, registrationController.addPaper);
router.post('/:id/payment-preview', [...registrationIdParamValidation, ...paymentPreviewValidation], validationMiddleware, registrationController.previewExistingPaymentSummary);
router.get('/:id/payment-summary', registrationIdParamValidation, validationMiddleware, registrationController.getPaymentSummary);

module.exports = router;
