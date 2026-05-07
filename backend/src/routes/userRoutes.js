const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { userProfileValidation } = require('../validations/userValidations');

const router = express.Router();

router.use(authMiddleware);
router.put('/me', userProfileValidation, validationMiddleware, userController.updateMe);

module.exports = router;
