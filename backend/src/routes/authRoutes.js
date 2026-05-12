const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  changePasswordValidation,
} = require('../validations/authValidations');

const router = express.Router();

router.post('/register', registerValidation, validationMiddleware, authController.register);
router.post('/login', loginValidation, validationMiddleware, authController.login);
router.post('/forgot-password', forgotPasswordValidation, validationMiddleware, authController.forgotPassword);
router.post('/change-password', authMiddleware, changePasswordValidation, validationMiddleware, authController.changePassword);
router.patch('/change-password', authMiddleware, changePasswordValidation, validationMiddleware, authController.changePassword);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
